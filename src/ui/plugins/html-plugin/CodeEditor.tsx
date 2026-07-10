import {
  ChangeEvent,
  KeyboardEvent,
  UIEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { highlightHtml } from "./highlight-html";

interface CodeEditorProps {
  value: string,
  onChange: (next: string) => void,
  onBlur?: () => void,
  placeholder?: string,
  /** Каретка на первой строке/символе + ArrowUp/ArrowLeft — выйти ДО ноды. */
  onExitUp?: () => void,
  /** Каретка на последней строке/символе + ArrowDown/ArrowRight — выйти ПОСЛЕ ноды. */
  onExitDown?: () => void,
}

/**
 * Лёгкий code-editor для HTML: textarea поверх подсвеченного <pre>,
 * слева — гутер с номерами строк. Без сторонних библиотек.
 *
 * Как держим визуальную синхронизацию между textarea и pre:
 *  - идентичные font-family, font-size, line-height, padding, letter-
 *    spacing, white-space, tab-size в SCSS (.code-editor__pre и
 *    .code-editor__textarea);
 *  - синхронизируем scrollTop/scrollLeft textarea → pre и gutter
 *    в обработчике onScroll;
 *  - текст textarea прозрачный, caret — обычного цвета.
 *
 * Tab внутри textarea вставляет 2 пробела (типичное поведение
 * code-editor'ов), Shift+Tab — удаляет ведущие пробелы в строке.
 */
export function CodeEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  onExitUp,
  onExitDown,
}: CodeEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Свежие колбэки выхода — чтобы нативный слушатель (вешается один раз)
  // не держал устаревшие замыкания.
  const exitRef = useRef<{ up?: () => void, down?: () => void }>({});
  exitRef.current = { up: onExitUp, down: onExitDown };

  // Подсвеченный HTML — мемоизируем по value, чтобы не пересчитывать
  // на ре-рендерах от соседних state-изменений.
  const highlighted = useMemo(() => highlightHtml(value), [ value ]);

  // Номера строк. Считаем по числу переводов строки. Добавляем
  // финальную «пустую» строку — она появляется визуально, когда
  // textarea заканчивается переводом строки.
  const lineNumbers = useMemo(() => {
    const lines = value.split("\n").length;
    return Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1);
  }, [ value ]);

  // Sync скролла textarea → pre + gutter. Делаем в layoutEffect'е
  // только инициализацию (на onChange textarea сама скроллится).
  useLayoutEffect(() => {
    const ta = taRef.current;
    const pre = preRef.current;
    if (!ta || !pre) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  }, [ value ]);

  // textarea лежит внутри DecoratorNode, и нативный keydown всплывает до
  // корневого слушателя Lexical (срабатывает раньше синтетики React). Поэтому
  // вешаем НАТИВНЫЙ слушатель на саму textarea (target-фаза, до bubble к корню):
  //  - стрелки на границах текста выводят фокус из ноды (до/после неё);
  //  - все прочие клавиши гасим от Lexical (Enter не плодит абзацы под нодой,
  //    Cmd+A выделяет текст в textarea, а не весь блок, и т.д.), не отменяя
  //    дефолт — нативное поведение textarea сохраняется.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const onNativeKeyDown = (e: globalThis.KeyboardEvent) => {
      const collapsed = ta.selectionStart === ta.selectionEnd;
      if (
        collapsed &&
        !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey
      ) {
        const pos = ta.selectionStart;
        const val = ta.value;
        const onFirstLine = val.lastIndexOf("\n", pos - 1) === -1;
        const onLastLine = val.indexOf("\n", pos) === -1;
        const exitUp =
          (e.key === "ArrowUp" && onFirstLine) ||
          (e.key === "ArrowLeft" && pos === 0);
        const exitDown =
          (e.key === "ArrowDown" && onLastLine) ||
          (e.key === "ArrowRight" && pos === val.length);
        if (exitUp && exitRef.current.up) {
          e.preventDefault();
          e.stopPropagation();
          exitRef.current.up();
          return;
        }
        if (exitDown && exitRef.current.down) {
          e.preventDefault();
          e.stopPropagation();
          exitRef.current.down();
          return;
        }
      }
      // Прочие клавиши обрабатывает сама textarea — не даём Lexical их
      // перехватывать (Enter, ввод, Cmd+A, Cmd+Z…).
      e.stopPropagation();
    };
    ta.addEventListener("keydown", onNativeKeyDown);
    return () => ta.removeEventListener("keydown", onNativeKeyDown);
  }, []);

  const onScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const onTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = ta;
    const before = value.slice(0, start);
    const after = value.slice(end);

    if (e.shiftKey) {
      // Shift+Tab — удалить до 2 ведущих пробелов в каждой строке
      // выделения. Если выделения нет, работаем по текущей строке.
      const lineStart = before.lastIndexOf("\n") + 1;
      const block = value.slice(lineStart, end);
      const dedented = block.replace(/^ {1,2}/gm, "");
      const removed = block.length - dedented.length;
      const next = value.slice(0, lineStart) + dedented + after;
      onChange(next);
      // Восстанавливаем выделение: смещаем на число удалённых пробелов.
      requestAnimationFrame(() => {
        ta.selectionStart = Math.max(lineStart, start - 2);
        ta.selectionEnd = Math.max(lineStart, end - removed);
      });
    } else if (start !== end) {
      // Tab при выделении — индентация всех затронутых строк.
      const lineStart = before.lastIndexOf("\n") + 1;
      const block = value.slice(lineStart, end);
      const indented = block.replace(/^/gm, "  ");
      const added = indented.length - block.length;
      const next = value.slice(0, lineStart) + indented + after;
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = start + 2;
        ta.selectionEnd = end + added;
      });
    } else {
      // Простой Tab — вставить 2 пробела в позицию курсора.
      const next = `${before}  ${after}`;
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="code-editor">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="code-editor__gutter"
      >
        {
          lineNumbers.map((n) => (
            <div
              key={n}
              className="code-editor__lineno"
            >
              {n}
            </div>
          ))
        }
      </div>
      <div className="code-editor__area">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="code-editor__pre"
        >
          <code
            dangerouslySetInnerHTML={{ __html: `${highlighted}\n` }}
            // eslint-disable-next-line
            className="code-editor__code"
          />
        </pre>
        <textarea
          ref={taRef}
          className="code-editor__textarea"
          placeholder={placeholder}
          spellCheck={false}
          value={value}
          onBlur={onBlur}
          onChange={onTextareaChange}
          onKeyDown={onKeyDown}
          onScroll={onScroll}
        />
      </div>
    </div>
  );
}
