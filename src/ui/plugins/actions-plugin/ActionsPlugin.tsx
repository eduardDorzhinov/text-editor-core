import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  FaAnchor,
  FaCommentDots,
  FaExternalLinkAlt,
  FaEye,
  FaListUl,
  FaLock,
  FaMicrophone,
  FaRegKeyboard,
  FaRegSave,
  FaTrash,
  FaUnlock,
} from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";

import {
  editorStateFromSerializedDocument,
  SerializedDocument,
  serializedDocumentFromEditorState,
} from "@lexical/file";
import { $generateHtmlFromNodes } from "@lexical/html";
import { useCollaborationContext } from "@lexical/react/LexicalCollaborationContext";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import clsx from "clsx";
import {
  $getRoot,
  $isParagraphNode,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  LexicalEditor,
} from "lexical";
import type { Doc } from "yjs";

import { useFlashMessage } from "@/lib/hooks/useFlashMessage";
import { serializeComments } from "@/lib/utils/commentsPersistence";
import { docFromHash, docToHash } from "@/lib/utils/docSerialization";
import { YDS_COMMENT_KEY } from "@/model";
import { useCommentContext } from "@/model/providers/CommentContext";
import { useDataAdapter } from "@/model/providers/DataAdapterContext";
import { useMainContext } from "@/model/providers/MainContext";
import { useSettings } from "@/model/providers/SettingsContext";
import { type EdtechLongreadContent, buildTOC, parseLexicalJson } from "@/parser";
import { TableOfContents } from "@/parser/TableOfContents";
import { Button } from "@/ui/components/button";
import { DEFAULT_SETTINGS } from "@/ui/components/editor";
import { useModal } from "@/ui/components/modal";
import { Tooltip } from "@/ui/components/tooltip";
import { AnchorsSidebar } from "@/ui/plugins/block-anchor-plugin";
import { CommentStore } from "@/ui/plugins/comment-plugin";
import { HotkeysSidebar } from "@/ui/plugins/hotkeys-sidebar";
import { SPEECH_TO_TEXT_COMMAND, SUPPORT_SPEECH_RECOGNITION } from "@/ui/plugins/speech-to-text";
import { getStoredTocAccordionLevel, getStoredTocVisibleLevels } from "@/ui/plugins/toc-plugin";
import { TOCSidebar } from "@/ui/plugins/toc-plugin/TOCSidebar";

import styles from "./ActionsPlugin.module.scss";

export const STORAGE_KEY = "edt-str";

async function shareDoc(doc: SerializedDocument): Promise<void> {
  const url = new URL(window.location.toString());
  url.hash = await docToHash(doc);
  const newUrl = url.toString();
  window.history.replaceState(
    {}, "", newUrl,
  );
  await window.navigator.clipboard.writeText(newUrl);
}

export function ActionsPlugin() {
  const [ editor ] = useLexicalComposerContext();
  const dataAdapter = useDataAdapter();
  const { fieldUid, wrapRef } = useMainContext();
  const {
    showCommentSidebar,
    setShowCommentSidebar,
    commentStore,
  } = useCommentContext();
  const {
    showSettings,
    setShowSettings,
    settings: { commentMode },
  } = useSettings();
  const { yjsDocMap } = useCollaborationContext();

  const [ modal, showModal ] = useModal();
  const showFlashMessage = useFlashMessage();

  const [ isSpeechToText, setIsSpeechToText ] = useState(false);
  const [ isEditorEmpty, setIsEditorEmpty ] = useState(true);
  const [ showTOCSidebar, setShowTOCSidebar ] = useState(false);
  const [ showAnchorsSidebar, setShowAnchorsSidebar ] = useState(false);
  const [ showHotkeysSidebar, setShowHotkeysSidebar ] = useState(false);

  const isEditable = editor.isEditable();

  // Правые сайдбары (содержание, якоря, хоткеи, комментарии) взаимоисключающие:
  // открытие любого из них закрывает остальные, чтобы они не перекрывали друг
  // друга справа. Панель настроек открывается слева и сюда не входит.
  const setActiveSidebar = useCallback((which: "toc" | "anchors" | "hotkeys" | "comment" | null) => {
    setShowTOCSidebar(which === "toc");
    setShowAnchorsSidebar(which === "anchors");
    setShowHotkeysSidebar(which === "hotkeys");
    setShowCommentSidebar(which === "comment");
    // Открытие/закрытие сайдбара сужает/расширяет область редактора (через
    // padding-right у #text-creator-root с transition 0.2s). Тулбар не
    // перерисовывается на это сам — «пинаем» его пересчёт переполнения через
    // resize-событие после завершения анимации ширины.
    setTimeout(() => window.dispatchEvent(new Event("resize")), 260);
  },
  [ setShowCommentSidebar ]);

  const toggleSidebar = useCallback((which: "toc" | "anchors" | "hotkeys" | "comment") => {
    const openState: Record<"toc" | "anchors" | "hotkeys" | "comment", boolean> = {
      toc: showTOCSidebar,
      anchors: showAnchorsSidebar,
      hotkeys: showHotkeysSidebar,
      comment: showCommentSidebar,
    };
    setActiveSidebar(openState[ which ] ?
      null :
      which);
  },
  [
    showTOCSidebar,
    showAnchorsSidebar,
    showHotkeysSidebar,
    showCommentSidebar,
    setActiveSidebar,
  ]);

  const onSave = useCallback(() => {
    if (!isEditable) return;

    const dataToSave: { json?: object, html?: string, comments?: number[] } = {};

    editor.getEditorState().read(() => {
      dataToSave.html = $generateHtmlFromNodes(editor);
    });

    dataToSave.json = editor.getEditorState().toJSON();

    const commentsDoc = yjsDocMap.get(YDS_COMMENT_KEY);
    if (commentsDoc) {
      dataToSave.comments = serializeComments(commentsDoc);
    }

    // Даём пользователю явный фидбэк: сохранение происходит только по кнопке
    // (автосейва нет), поэтому важно подтверждать успех и НЕ молчать при
    // ошибке (например, переполнение localStorage).
    try {
      dataAdapter.save(fieldUid, dataToSave);
      showFlashMessage("Сохранено");
    } catch {
      showFlashMessage("Не удалось сохранить: документ слишком большой для локального хранилища");
    }
  }, [
    dataAdapter,
    editor,
    fieldUid,
    isEditable,
    yjsDocMap,
    showFlashMessage,
  ]);

  // Автосейв убран по запросу — сохранение происходит только по клику
  // на кнопку «Сохранить» в ActionsPlugin. Это снимает риск тихих
  // QuotaExceeded-ошибок в localStorage и неожиданных перезаписей
  // внешнего saveCallback'а на каждом keystroke.

  useEffect(() => {
    if (DEFAULT_SETTINGS.isCollab) {
      return;
    }
    docFromHash(window.location.hash).then((doc) => {
      if (doc && doc.source === "Playground") {
        editor.setEditorState(editorStateFromSerializedDocument(editor, doc));
        editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
        // Импорт из share-ссылки — одноразовый. Чистим #doc= из URL,
        // иначе на КАЖДОЙ перезагрузке этот замороженный снимок снова
        // перетирал бы документ, загруженный из localStorage/saveCallback —
        // пользователю казалось, что правки не сохраняются («всё время
        // один и тот же документ»).
        const url = new URL(window.location.toString());
        url.hash = "";
        window.history.replaceState(
          {}, "", url.toString(),
        );
      }
    });
  }, [ editor ]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const children = root.getChildren();

        if (children.length > 1) {
          setIsEditorEmpty(false);
        } else if ($isParagraphNode(children[ 0 ])) {
          const paragraphChildren = children[ 0 ].getChildren();
          setIsEditorEmpty(paragraphChildren.length === 0);
        } else {
          setIsEditorEmpty(false);
        }
      });
    });
  }, [ editor, isEditable ]);

  // Хоткеи для всех кнопок action-плагина
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const code = e.code;

      // Mod+/ — сайдбар хоткеев
      if (!shift && !alt && (code === "Slash" || e.key === "/")) {
        e.preventDefault();
        toggleSidebar("hotkeys");
        return;
      }
      // Mod+S — сохранить
      if (!shift && !alt && code === "KeyS") {
        if (!isEditable) return;
        e.preventDefault();
        onSave();
        return;
      }
      // Mod+, — настройки
      if (!shift && !alt && (code === "Comma" || e.key === ",")) {
        e.preventDefault();
        setShowSettings?.((p) => !p);
        return;
      }
      // Mod+Alt+S — содержание (Mod+Shift+T перехватывался браузером)
      if (alt && !shift && code === "KeyS") {
        e.preventDefault();
        toggleSidebar("toc");
        return;
      }
      // Mod+Shift+A — якоря
      if (shift && !alt && code === "KeyA") {
        e.preventDefault();
        toggleSidebar("anchors");
        return;
      }
      // Mod+Alt+M — комментарии
      if (!shift && alt && code === "KeyM") {
        if (!commentMode) return;
        e.preventDefault();
        toggleSidebar("comment");
        return;
      }
      // Mod+Shift+U — поделиться
      if (shift && !alt && code === "KeyU") {
        e.preventDefault();
        shareDoc(serializedDocumentFromEditorState(editor.getEditorState(), {
          source: "Playground",
        })).then(() => showFlashMessage("URL copied to clipboard"),
          () => showFlashMessage("URL could not be copied to clipboard"));
        return;
      }
      // Mod+Shift+Backspace — очистить редактор
      if (shift && !alt && code === "Backspace") {
        if (isEditorEmpty || !isEditable) return;
        e.preventDefault();
        showModal(
          "Очистить редактор",
          (onClose) => (
            <ShowClearDialog
              commentStore={commentStore as CommentStore}
              editor={editor}
              yjsDocMap={yjsDocMap}
              onClose={onClose}
            />
          ),
          false,
          true,
        );
        return;
      }
      // Mod+Alt+R — режим чтения
      if (!shift && alt && code === "KeyR") {
        e.preventDefault();
        editor.setEditable(!editor.isEditable());
        return;
      }
      // Mod+Shift+M — режим диктовки
      if (shift && !alt && code === "KeyM") {
        if (!SUPPORT_SPEECH_RECOGNITION || !isEditable) return;
        e.preventDefault();
        editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
        setIsSpeechToText(!isSpeechToText);
        return;
      }
      // Mod+Alt+V — превью (модалка)
      if (!shift && alt && code === "KeyV") {
        e.preventDefault();
        showModal("Предпросмотр", () => {
          const editorState = editor.getEditorState();
          const json = editorState.toJSON();
          const content = json as EdtechLongreadContent;
          const visibleLevels = getStoredTocVisibleLevels();
          const tocItems = buildTOC(content.root).filter((i) => visibleLevels.has(i.level));
          return (
            <div className="tc-preview">
              <TableOfContents
                accordionLevel={getStoredTocAccordionLevel()}
                items={tocItems}
                scrollMode="container"
              />
              {parseLexicalJson(content.root)}
            </div>
          );
        });
        return;
      }
      // Mod+Alt+O — превью в новом окне
      if (!shift && alt && code === "KeyO") {
        e.preventDefault();
        onSave();
        window.open("/preview", "_blank");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    editor,
    onSave,
    isSpeechToText,
    isEditorEmpty,
    isEditable,
    commentMode,
    showModal,
    setShowSettings,
    toggleSidebar,
    showFlashMessage,
    commentStore,
    yjsDocMap,
  ]);

  return (
    <div className={styles.actions}>
      {
        SUPPORT_SPEECH_RECOGNITION && (
          <Tooltip
            hotkeyId="action-mic"
            label="Режим диктовки"
          >
            <button
              className={
                "action-button action-button-mic " +
                (isSpeechToText ?
                  "active" :
                  "")
              }
              disabled={!isEditable}
              onClick={
                () => {
                  if (!isEditable) return;
                  editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
                  setIsSpeechToText(!isSpeechToText);
                }
              }
            >
              <FaMicrophone />
            </button>
          </Tooltip>
        )
      }
      <Tooltip
        hotkeyId="action-settings"
        label="Настройки"
      >
        <button
          className={clsx("action-button", { "active-btn": showSettings })}
          onClick={() => setShowSettings?.((p) => !p)}
        >
          <IoSettingsSharp />
        </button>
      </Tooltip>

      <Tooltip
        hotkeyId="action-toc"
        label="Содержание"
      >
        <button
          className={
            clsx(
              "action-button",
              "share",
              { "active-btn": showTOCSidebar },
            )
          }
          onClick={() => toggleSidebar("toc")}
        >
          <FaListUl />
        </button>
      </Tooltip>
      <Tooltip
        hotkeyId="action-anchors"
        label="Якоря"
      >
        <button
          className={
            clsx(
              "action-button",
              "share",
              { "active-btn": showAnchorsSidebar },
            )
          }
          onClick={() => toggleSidebar("anchors")}
        >
          <FaAnchor />
        </button>
      </Tooltip>
      {
        commentMode && (
          <Tooltip
            hotkeyId="action-comments"
            label="Показать комментарии"
          >
            <button
              className={
                clsx(
                  "action-button",
                  "share",
                  { "active-btn": showCommentSidebar },
                )
              }
              onClick={() => toggleSidebar("comment")}
            >
              <FaCommentDots />
            </button>
          </Tooltip>
        )
      }

      <Tooltip
        hotkeyId="action-save"
        label="Сохранить"
      >
        <button
          className="action-button share"
          disabled={!isEditable}
          onClick={onSave}
        >
          <FaRegSave />
        </button>
      </Tooltip>
      <Tooltip
        hotkeyId="action-clear"
        label="Очистить"
      >
        <button
          className="action-button clear"
          disabled={isEditorEmpty || !isEditable}
          onClick={
            () => {
              if (!isEditable) return;
              showModal(
                "Очистить редактор",
                (onClose) => (
                  <ShowClearDialog
                    commentStore={commentStore as CommentStore}
                    editor={editor}
                    yjsDocMap={yjsDocMap}
                    onClose={onClose}
                  />
                ),
                false,
                true,
              );
            }
          }
        >
          <FaTrash />
        </button>
      </Tooltip>
      <Tooltip
        hotkeyId="action-readonly"
        label="Режим чтения"
      >
        <button
          className={
            `action-button ${!isEditable ?
              "unlock" :
              "lock"}`
          }
          onClick={
            () => {
              editor.setEditable(!editor.isEditable());
            }
          }
        >
          {
            isEditable ?
              <FaLock /> :
              <FaUnlock />
          }
        </button>
      </Tooltip>
      <Tooltip
        hotkeyId="action-preview-window"
        label="Предпросмотр в новом окне"
      >
        <button
          className="action-button"
          onClick={
            () => {
              onSave();
              window.open("/preview", "_blank");
            }
          }
        >
          <FaExternalLinkAlt />
        </button>
      </Tooltip>
      <Tooltip
        hotkeyId="action-preview"
        label="Предпросмотр"
      >
        <button
          className="action-button"
          onClick={
            () => {
              showModal("Предпросмотр", () => {
                const editorState = editor.getEditorState();
                const json = editorState.toJSON();
                const content = json as EdtechLongreadContent;
                const visibleLevels = getStoredTocVisibleLevels();
                const tocItems = buildTOC(content.root).filter((i) => visibleLevels.has(i.level));
                return (
                  <div className="tc-preview">
                    <TableOfContents
                      accordionLevel={getStoredTocAccordionLevel()}
                      items={tocItems}
                      scrollMode="container"
                    />
                    {parseLexicalJson(content.root)}
                  </div>
                );
              });
            }
          }
        >
          <FaEye />
        </button>
      </Tooltip>
      <Tooltip
        hotkeyId="open-hotkeys"
        label="Горячие клавиши"
      >
        <button
          className={clsx("action-button", { "active-btn": showHotkeysSidebar })}
          onClick={() => toggleSidebar("hotkeys")}
        >
          <FaRegKeyboard />
        </button>
      </Tooltip>


      {
        showTOCSidebar &&
        createPortal(<TOCSidebar onClose={() => setShowTOCSidebar(false)} />,
          wrapRef?.current || document.body)
      }
      {
        showAnchorsSidebar &&
        createPortal(<AnchorsSidebar onClose={() => setShowAnchorsSidebar(false)} />,
          wrapRef?.current || document.body)
      }
      {
        showHotkeysSidebar &&
        createPortal(<HotkeysSidebar onClose={() => setShowHotkeysSidebar(false)} />,
          wrapRef?.current || document.body)
      }
      {modal}
    </div>
  );
}

function ShowClearDialog({
  editor,
  commentStore,
  yjsDocMap,
  onClose,
}: {
  editor: LexicalEditor,
  commentStore: CommentStore,
  yjsDocMap: Map<string, Doc>,
  onClose: () => void,
}) {
  const handleClear = () => {
    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);

    const commentsDoc = yjsDocMap.get(YDS_COMMENT_KEY);
    if (commentsDoc) {
      commentsDoc.transact(() => {
        const yComments = commentsDoc.getArray("comments");
        if (yComments) {
          yComments.delete(0, yComments.length);
        }
      });
    }

    commentStore.clearComments();

    editor.focus();
    onClose();
  };

  return (
    <>
      <div className="Modal__content">
        <div className={styles.clear_modal_description}>
          Вы уверены, что хотите очистить редактор?
        </div>
        <Button onClick={handleClear}>
          Очистить
        </Button>
        {" "}
        <Button
          onClick={
            () => {
              editor.focus();
              onClose();
            }
          }
        >
          Отмена
        </Button>
      </div>
    </>
  );
}
