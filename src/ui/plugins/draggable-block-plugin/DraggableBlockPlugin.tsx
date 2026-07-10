import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  FiAnchor,
  FiClipboard,
  FiCopy,
  FiEye,
  FiMessageSquare,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { PiDotsSixVertical } from "react-icons/pi";

import {
  $generateJSONFromSelectedNodes,
  copyToClipboard,
} from "@lexical/clipboard";
import { $generateHtmlFromNodes } from "@lexical/html";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import clsx from "clsx";
import {
  $createNodeSelection,
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getRoot,
  $isElementNode,
  $parseSerializedNode,
  LexicalNode,
  SerializedLexicalNode,
} from "lexical";

import { useSettings } from "@/model/providers/SettingsContext";
import { useModal } from "@/ui/components/modal";
import { useBlockAnchor } from "@/ui/plugins/block-anchor-plugin";
import { INSERT_BLOCK_COMMENT_COMMAND } from "@/ui/plugins/comment-plugin";

import { BlockPreviewModal } from "./BlockPreviewModal";

import st from "./DraggableBlockPlugin.module.scss";

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

/**
 * Глубокая сериализация ноды С ДЕТЬМИ. ВАЖНО: node.exportJSON() у ElementNode
 * возвращает children: [] — дети наполняются только при сериализации всего
 * дерева. Поэтому для дублирования блока рекурсивно сериализуем детей сами,
 * иначе $parseSerializedNode восстановит ПУСТУЮ ноду (без текста/содержимого).
 */
function $serializeWithChildren(node: LexicalNode): SerializedLexicalNode {
  const json = node.exportJSON() as SerializedLexicalNode & {
    children?: SerializedLexicalNode[],
  };
  if ($isElementNode(node)) {
    json.children = node.getChildren().map($serializeWithChildren);
  }
  return json;
}

export function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement,
}) {
  const [ editor ] = useLexicalComposerContext();
  const { getAnchorId, setAnchorId, getAllAnchors } = useBlockAnchor();
  const { settings: { commentMode }} = useSettings();
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const [ draggableElement, setDraggableElement ] = useState<HTMLElement | null>(null);

  const [ showModal, setShowModal ] = useState(false);
  const [ modalNodeKey, setModalNodeKey ] = useState("");
  const [ modalValue, setModalValue ] = useState("");
  const [ copied, setCopied ] = useState(false);

  // Модалка предпросмотра целого документа со скроллом к выбранному блоку.
  const [ previewModal, showPreviewModal ] = useModal();

  const insertBlock: MouseEventHandler<HTMLButtonElement> = (e) => {
    if (!draggableElement || !editor) return;

    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableElement);
      if (!node) return;

      const pNode = $createParagraphNode();
      if (e.altKey || e.ctrlKey) {
        node.insertBefore(pNode);
      } else {
        node.insertAfter(pNode);
      }
      pNode.select();
    });
  };

  const onAnchorClick = useCallback(() => {
    if (!draggableElement || !editor) return;

    editor.read(() => {
      const node = $getNearestNodeFromDOMNode(draggableElement);
      if (!node) return;
      const key = node.getKey();
      setModalNodeKey(key);
      setModalValue(getAnchorId(key));
      setShowModal(true);
    });
  }, [
    draggableElement,
    editor,
    getAnchorId,
  ]);

  const isDuplicate = useMemo(() => {
    if (!modalValue || !modalNodeKey) return false;
    return getAllAnchors().some((a) => a.anchorId === modalValue && a.nodeKey !== modalNodeKey);
  }, [
    modalValue,
    modalNodeKey,
    getAllAnchors,
  ]);

  const onSave = useCallback(() => {
    if (modalNodeKey && modalValue && !isDuplicate) {
      setAnchorId(modalNodeKey, modalValue);
    }
    if (!isDuplicate) setShowModal(false);
  }, [
    modalNodeKey,
    modalValue,
    isDuplicate,
    setAnchorId,
  ]);

  const onCancel = useCallback(() => {
    setShowModal(false);
  }, []);

  // Переопределяем позицию меню: ставим его НАД блоком, выравнивая по правому
  // краю блока. @lexical/react центрирует меню слева (left = SPACE), поэтому
  // считаем координаты сами из bbox блока и перекрываем transform. Эффект
  // родителя выполняется ПОСЛЕ внутреннего эффекта плагина (React прогоняет
  // дочерние эффекты раньше родительских), плюс rAF-страховка — так наша
  // позиция выигрывает. resize/scroll держат меню приклеенным к блоку.
  useEffect(() => {
    const update = () => {
      const menu = menuRef.current;
      const hover = hoverRef.current;
      if (!draggableElement) {
        if (hover) hover.style.opacity = "0";
        return;
      }
      const blockRect = draggableElement.getBoundingClientRect();
      const anchorRect = anchorElem.getBoundingClientRect();
      const blockLeft = blockRect.left - anchorRect.left + anchorElem.scrollLeft;
      const blockTop = blockRect.top - anchorRect.top + anchorElem.scrollTop;

      if (menu) {
        // Тулбар — НАД блоком, выровнен по ЛЕВОМУ краю блока.
        menu.style.opacity = "1";
        menu.style.transform = `translate(${blockLeft}px, ${blockTop - menu.offsetHeight - 2}px)`;
      }
      if (hover) {
        // Слабая подсветка самого блока — по его bbox, вместе с кнопками.
        hover.style.opacity = "1";
        hover.style.transform = `translate(${blockLeft}px, ${blockTop}px)`;
        hover.style.width = `${blockRect.width}px`;
        hover.style.height = `${blockRect.height}px`;
      }
    };

    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener(
      "scroll", update, true,
    );
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener(
        "scroll", update, true,
      );
    };
  }, [ draggableElement, anchorElem ]);

  // Верхнеуровневый блок (прямой ребёнок root), к которому относится
  // наведённый DOM-элемент.
  const $topLevelOf = (node: LexicalNode): LexicalNode => {
    const root = $getRoot();
    let current = node;
    while (current.getParent() && current.getParent() !== root) {
      const parent = current.getParent();
      if (!parent) break;
      current = parent;
    }
    return current;
  };

  // Дублировать блок: сериализуем ноду и восстанавливаем копию (с детьми —
  // $parseSerializedNode рекурсивен), вставляем сразу после исходной.
  const onCopyBlock = useCallback(() => {
    if (!draggableElement || !editor) return;
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableElement);
      if (!node) return;
      const top = $topLevelOf(node);
      const clone = $parseSerializedNode($serializeWithChildren(top));
      top.insertAfter(clone);
    });
  }, [ draggableElement, editor ]);

  // Скопировать блок в СИСТЕМНЫЙ буфер обмена (в отличие от «Дублировать»,
  // которая сразу вставляет копию).
  //
  // Payload собираем НАПРЯМУЮ из конкретной верхнеуровневой ноды, а НЕ через
  // selection.getNodes(). Причина: если блок — последний в документе (после
  // него нет ноды), caret-range getNodes() выкидывает саму ноду-обёртку
  // (trailing under-selection в Lexical), и в буфер попадает только её
  // содержимое, а не колонки/аккордеон/таблица целиком. NodeSelection со
  // ВСЕМИ ключами (обёртка + все потомки) даёт isSelected === true для каждой
  // ноды, поэтому и JSON, и HTML сериализуются полностью и независимо от
  // позиции блока.
  const onCopyToClipboard = useCallback(() => {
    if (!draggableElement || !editor) return;

    // Готовим содержимое буфера сами, из конкретной ноды.
    // ВАЖНО: editor.read (а не editor.getEditorState().read) — только он
    // выставляет активный редактор, без которого $getNearestNodeFromDOMNode /
    // $generate* бросают «Unable to find an active editor».
    let data: Record<string, string> | null = null;
    editor.read(() => {
      const node = $getNearestNodeFromDOMNode(draggableElement);
      if (!node) return;
      const top = $topLevelOf(node);
      const selection = $createNodeSelection();
      const addKeys = (n: LexicalNode) => {
        selection.add(n.getKey());
        if ($isElementNode(n)) n.getChildren().forEach(addKeys);
      };
      addKeys(top);
      data = {
        // $generateJSONFromSelectedNodes сам подставляет editor namespace —
        // payload проходит проверку namespace при вставке в этот же редактор.
        "application/x-lexical-editor": JSON.stringify($generateJSONFromSelectedNodes(editor, selection)),
        "text/html": $generateHtmlFromNodes(editor, selection),
        "text/plain": top.getTextContent(),
      };
    });
    if (!data) return;

    editor.getRootElement()?.focus({ preventScroll: true });
    // Пишем через штатный механизм Lexical (временный span + Range +
    // execCommand + перехват COPY_COMMAND): он кроссбраузерно и надёжно кладёт
    // в буфер все MIME, включая кастомный application/x-lexical-editor.
    // Передаём готовый data — Lexical НЕ обращается к selection.getNodes()
    // (который для последней ноды документа терял саму ноду-обёртку и
    // копировал только её содержимое).
    void copyToClipboard(
      editor, null, data,
    );
  }, [ draggableElement, editor ]);

  // Удалить блок. Если он был единственным — оставляем пустой параграф,
  // чтобы документ не остался без редактируемого контента.
  const onDeleteBlock = useCallback(() => {
    if (!draggableElement || !editor) return;
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableElement);
      if (!node) return;
      const root = $getRoot();
      $topLevelOf(node).remove();
      if (root.getChildrenSize() === 0) {
        root.append($createParagraphNode());
      }
    });
  }, [ draggableElement, editor ]);

  // Оставить комментарий КО ВСЕЙ ноде. Берём стабильный block-anchor id блока
  // (по нему обсуждение персистится и по нему же сайдбар скроллит обратно),
  // короткое превью текста как «цитату» — и отдаём в CommentPlugin командой.
  const onAddComment = useCallback(() => {
    if (!draggableElement || !editor) return;
    let payload: { blockId: string, quote: string } | null = null;
    editor.read(() => {
      const node = $getNearestNodeFromDOMNode(draggableElement);
      if (!node) return;
      const top = $topLevelOf(node);
      const key = top.getKey();
      const blockId = getAnchorId(key) || editor.getElementByKey(key)?.id || "";
      if (!blockId) return;
      const text = top.getTextContent().trim();
      let quote = text || `[${top.getType()}]`;
      if (quote.length > 100) quote = `${quote.slice(0, 99)}…`;
      payload = { blockId, quote };
    });
    if (payload) {
      editor.dispatchCommand(INSERT_BLOCK_COMMENT_COMMAND, payload);
    }
  }, [
    draggableElement,
    editor,
    getAnchorId,
  ]);

  const onPreviewBlock = useCallback(() => {
    if (!draggableElement || !editor) return;

    // Считаем индекс top-level Lexical-ноды, к которой относится наведённый
    // DOM-элемент. Идём вверх по предкам до прямого ребёнка root.
    // editor.read (не getEditorState().read) — потому что $-helpers
    // требуют active editor, а не только state.
    let targetIndex = -1;
    editor.read(() => {
      const node = $getNearestNodeFromDOMNode(draggableElement);
      if (!node) return;
      let current = node;
      const root = $getRoot();
      while (current.getParent() && current.getParent() !== root) {
        const parent = current.getParent();
        if (!parent) break;
        current = parent;
      }
      targetIndex = current.getIndexWithinParent();
    });
    if (targetIndex < 0) return;

    showPreviewModal(
      "Предпросмотр",
      () => (
        <BlockPreviewModal
          editor={editor}
          targetIndex={targetIndex}
        />
      ),
      true,
      true,
    );
  }, [
    draggableElement,
    editor,
    showPreviewModal,
  ]);

  return (
    <>
      {/* eslint-disable-next-line camelcase */}
      <DraggableBlockPlugin_EXPERIMENTAL
        anchorElem={anchorElem}
        isOnMenu={isOnMenu}
        menuComponent={
          (
            <div
              ref={menuRef}
              className={clsx(st.drag_wrap, DRAGGABLE_BLOCK_MENU_CLASSNAME)}
            >
              {/* Ручка перетаскивания — единственный элемент БЕЗ
                  stopPropagation на mousedown, поэтому drag стартует только
                  с неё. Кнопки гасят mousedown, чтобы клик не начинал drag. */}
              <div
                className={clsx(st.icon, st.drag)}
                title="Перетащить блок"
              >
                <PiDotsSixVertical />
              </div>
              <button
                className={clsx(st.icon, st.plus)}
                title="Добавить блок ниже"
                onClick={insertBlock}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <FiPlus />
              </button>
              <button
                className={clsx(st.icon, st.anchor)}
                title="Якорь блока"
                onClick={onAnchorClick}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <FiAnchor />
              </button>
              <button
                className={clsx(st.icon, st.preview)}
                title="Предпросмотр блока"
                type="button"
                onClick={onPreviewBlock}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <FiEye />
              </button>
              <button
                className={clsx(st.icon, st.copy)}
                title="Дублировать блок"
                type="button"
                onClick={onCopyBlock}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <FiCopy />
              </button>
              <button
                className={clsx(st.icon, st.copy)}
                title="Скопировать блок"
                type="button"
                onClick={onCopyToClipboard}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <FiClipboard />
              </button>
              {
                commentMode && (
                  <button
                    className={clsx(st.icon, st.comment)}
                    title="Комментарий к блоку"
                    type="button"
                    onClick={onAddComment}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <FiMessageSquare />
                  </button>
                )
              }
              <button
                className={clsx(st.icon, st.delete)}
                title="Удалить блок"
                type="button"
                onClick={onDeleteBlock}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <FiTrash2 />
              </button>
              {/* hover-мост до блока; stopPropagation — чтобы клик по нему
                  не запускал перетаскивание. */}
              <div
                aria-hidden="true"
                className={st.hover_bridge}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          )
        }
        menuRef={menuRef}
        targetLineComponent={
          (
            <div
              ref={targetLineRef}
              className={st.draggable_target_line}
            />
          )
        }
        targetLineRef={targetLineRef}
        onElementChanged={setDraggableElement}
      />
      {
        createPortal(<div
          ref={hoverRef}
          aria-hidden="true"
          className={st.hover_overlay}
          style={{ position: "absolute", left: 0, top: 0, opacity: 0 }}
        />, anchorElem)
      }
      {previewModal}
      {
        showModal && (
          <div
            className={st.modalOverlay}
            onClick={onCancel}
          >
            <div
              className={st.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={st.modalTitle}>Якорь блока</h3>
              <div
                className={
                  `${st.modalField} ${isDuplicate ?
                    st.modalFieldError :
                    ""}`
                }
              >
                <span className={st.modalHash}>#</span>
                <input
                  autoFocus
                  className={st.modalInput}
                  placeholder="anchor-id"
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  onKeyDown={
                    (e) => {
                      if (e.key === "Enter" && !isDuplicate) onSave();
                      if (e.key === "Escape") onCancel();
                    }
                  }
                />
                <div className={st.copyWrap}>
                  <button
                    className={st.modalBtnCopy}
                    disabled={!modalValue}
                    title="Копировать якорь"
                    type="button"
                    onClick={
                      () => {
                        navigator.clipboard.writeText(`#${modalValue}`).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        });
                      }
                    }
                  >
                    <FiCopy />
                  </button>
                  {copied && <span className={st.copyTooltip}>Якорь скопирован</span>}
                </div>
              </div>
              {isDuplicate && <div className={st.modalError}>Такой якорь уже есть</div>}
              <div className={st.modalButtons}>
                <button
                  className={st.modalBtnCancel}
                  type="button"
                  onClick={onCancel}
                >
                  Отменить
                </button>
                <button
                  className={st.modalBtnSave}
                  disabled={!modalValue || isDuplicate}
                  type="button"
                  onClick={onSave}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}
