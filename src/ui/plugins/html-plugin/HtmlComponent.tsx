import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCheckSquare,
  FiCode,
  FiEye,
  FiTrash2,
} from "react-icons/fi";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  NodeKey,
} from "lexical";

import { HtmlEmbed } from "@/parser";
import { useModal } from "@/ui/components/modal";

import { CodeEditor } from "./CodeEditor";
import { $isHtmlNode } from "./HtmlNode";
import { type HtmlValidationStatus, validateHtml } from "./validate-html";

import "./HtmlPlugin.scss";

interface HtmlComponentProps {
  html: string,
  nodeKey: NodeKey,
}

type Tab = "code" | "preview";

/** Подпись + CSS-модификатор статуса для каждого из трёх исходов валидации. */
const STATUS_UI: Record<HtmlValidationStatus, { cls: string, label: string }> = {
  valid: { cls: "ok", label: "HTML валиден" },
  invalid: { cls: "error", label: "HTML не валиден" },
  maybe: { cls: "warn", label: "HTML может быть не валиден" },
};

/**
 * React-рендер HtmlNode внутри редактора. Содержит две вкладки:
 *  - "HTML": textarea для исходника + индикатор валидности
 *  - "Превью": dangerouslySetInnerHTML с фактическим рендером (или
 *    плейсхолдер, если код ещё не введён).
 *
 * Новый пустой блок открывается на "HTML" (редактор), загруженный из
 * сохранённого документа — на "Превью" (обычно пользователь хочет
 * сначала увидеть, что там).
 *
 * Editor.update вызывается только на blur textarea и при переключении
 * с code на preview — это исключает спам в undo-стеке и лишние
 * реконсиляции при наборе.
 */
export function HtmlComponent({ html, nodeKey }: HtmlComponentProps) {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const [
    isSelected,
    setSelected,
    clearSelection,
  ] = useLexicalNodeSelection(nodeKey);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ modal, showModal ] = useModal();

  // Локальный буфер textarea: каждый keystroke не дёргает editor.update.
  const [ draft, setDraft ] = useState(html);
  const [ tab, setTab ] = useState<Tab>(html ?
    "preview" :
    "code");

  // Внешнее изменение html (другой клиент, undo/redo) — синкаем в draft.
  useEffect(() => {
    setDraft(html);
  }, [ html ]);

  const commit = useCallback(() => {
    if (draft === html) return;
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isHtmlNode(node)) node.setHtml(draft);
    });
  }, [
    editor,
    nodeKey,
    draft,
    html,
  ]);

  const switchTab = useCallback((next: Tab) => {
    if (next === tab) return;
    // Уходя с code, сохраняем актуальный текст — иначе preview покажет
    // устаревшее состояние ноды.
    if (tab === "code") commit();
    setTab(next);
  }, [ tab, commit ]);

  const validation = useMemo(() => validateHtml(draft), [ draft ]);

  // Выделить весь код. CodeEditor владеет textarea внутри себя — достаём её
  // из DOM блока (контролируемое значение = draft, select() берёт его целиком).
  const selectAll = useCallback(() => {
    const ta = wrapRef.current?.querySelector<HTMLTextAreaElement>("textarea.code-editor__textarea");
    if (ta) {
      ta.focus();
      ta.select();
    }
  }, []);

  // Выход из ноды стрелками. ВАЖЕН порядок: сначала переводим DOM-фокус на
  // корень редактора (это снимает фокус с textarea), и только потом ставим
  // Lexical-каретку. Пока активный элемент — textarea, Lexical не переносит
  // DOM-selection в редактор, поэтому фокус «залипал» на textarea.
  const exitTo = useCallback((dir: "before" | "after") => {
    commit();
    const root = editor.getRootElement();
    root?.focus({ preventScroll: true });
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!node) return;
      if (dir === "before") node.selectPrevious();
      else node.selectNext();
    });
  }, [
    editor,
    nodeKey,
    commit,
  ]);

  const exitBefore = useCallback(() => exitTo("before"), [ exitTo ]);
  const exitAfter = useCallback(() => exitTo("after"), [ exitTo ]);

  // Полная очистка кода блока (draft + сама нода).
  const clearEditor = useCallback(() => {
    setDraft("");
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isHtmlNode(node)) node.setHtml("");
    });
  }, [ editor, nodeKey ]);

  // Очистка — только через подтверждение, чтобы случайно не потерять код.
  const confirmClear = useCallback(() => {
    showModal("Очистить редактор?", (onClose) => (
      <div className="tc-html-confirm">
        <p>Весь HTML-код этого блока будет удалён. Действие нельзя отменить.</p>
        <div className="tc-html-confirm__actions">
          <button
            className="tc-html-confirm__btn"
            type="button"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="tc-html-confirm__btn tc-html-confirm__btn--danger"
            type="button"
            onClick={
              () => {
                clearEditor();
                onClose();
              }
            }
          >
            Очистить
          </button>
        </div>
      </div>
    ));
  }, [ showModal, clearEditor ]);

  const onContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Клики по UI блока (вкладки, textarea) не должны переустанавливать
    // выделение — иначе textarea теряет фокус и набор обрывается.
    if ((e.target as HTMLElement).closest("[data-html-toolbar]")) return;
    if (e.shiftKey) {
      setSelected(!isSelected);
    } else {
      clearSelection();
      setSelected(true);
    }
  }, [
    isSelected,
    setSelected,
    clearSelection,
  ]);

  // Глобальный CLICK_COMMAND: позволяет ставить NodeSelection при клике
  // по самому содержимому превью (а не по контейнеру).
  useEffect(() => {
    return mergeRegister(editor.registerCommand(
      CLICK_COMMAND,
      (event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return false;
        if (target.closest("[data-html-toolbar]")) return false;
        if (wrapRef.current && wrapRef.current.contains(target)) {
          if (event.shiftKey) setSelected(!isSelected);
          else {
            clearSelection();
            setSelected(true);
          }
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ));
  }, [
    editor,
    isSelected,
    setSelected,
    clearSelection,
  ]);

  // Read-only режим — без вкладок, только превью.
  if (!isEditable) {
    return (
      <div className="tc-html-block">
        {
          html ?
            (
              <div className="tc-html-block__content">
                <HtmlEmbed html={html} />
              </div>
            ) :
            (
              <div className="tc-html-block__empty">HTML-код отсутствует</div>
            )
        }
      </div>
    );
  }

  // Вкладка «Превью»: рендер кода или плейсхолдер. Выносим отдельно, чтобы
  // не плодить вложенные тернарники в JSX.
  const previewPane = html ?
    (
      <div className="tc-html-block__content">
        <HtmlEmbed html={html} />
      </div>
    ) :
    (
      <div className="tc-html-block__empty">
        HTML-код отсутствует. Перейдите на вкладку «HTML», чтобы добавить разметку.
      </div>
    );

  return (
    <>
      {modal}
      <div
        ref={wrapRef}
        className={
          `tc-html-block${isSelected ?
            " tc-html-block--selected" :
            ""}`
        }
        contentEditable={false}
        onClick={onContainerClick}
      >
        <div
          className="tc-html-block__tabs"
          data-html-toolbar="true"
        >
          <span className="tc-html-block__badge">
            <FiCode />
            HTML
          </span>
          <div className="tc-html-block__tab-group">
            <button
              className={
                `tc-html-block__tab${tab === "code" ?
                  " tc-html-block__tab--active" :
                  ""}`
              }
              type="button"
              onClick={() => switchTab("code")}
            >
              <FiCode />
              <span>HTML</span>
            </button>
            <button
              className={
                `tc-html-block__tab${tab === "preview" ?
                  " tc-html-block__tab--active" :
                  ""}`
              }
              type="button"
              onClick={() => switchTab("preview")}
            >
              <FiEye />
              <span>Превью</span>
            </button>
          </div>
        </div>

        {
          tab === "code" ?
            (
              <div
                className="tc-html-block__editor"
                data-html-toolbar="true"
              >
                <div className="tc-html-block__actions">
                  <button
                    className="tc-html-block__action"
                    type="button"
                    onClick={selectAll}
                  >
                    <FiCheckSquare />
                    <span>Выделить всё</span>
                  </button>
                  <button
                    className="tc-html-block__action tc-html-block__action--danger"
                    disabled={!draft}
                    type="button"
                    onClick={confirmClear}
                  >
                    <FiTrash2 />
                    <span>Очистить</span>
                  </button>
                </div>
                <CodeEditor
                  placeholder="<div>Ваш HTML-код</div>"
                  value={draft}
                  onBlur={commit}
                  onChange={setDraft}
                  onExitDown={exitAfter}
                  onExitUp={exitBefore}
                />
                <div
                  className={`tc-html-block__status tc-html-block__status--${STATUS_UI[ validation.status ].cls}`}
                >
                  {
                    validation.status === "valid" ?
                      <FiCheckCircle /> :
                      <FiAlertTriangle />
                  }
                  <span>
                    {STATUS_UI[ validation.status ].label}
                    {
                      validation.detail ?
                        `: ${validation.detail}` :
                        ""
                    }
                  </span>
                </div>
              </div>
            ) :
            previewPane
        }
      </div>
    </>
  );
}
