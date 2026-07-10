import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  COMMAND_PRIORITY_NORMAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  LexicalEditor,
} from "lexical";

import { OPEN_HIGHLIGHT_MENU_COMMAND } from "@/ui/components/toolbar/HighlightDropdown";
import {
  clearFormatting,
  formatBulletList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
} from "@/ui/components/toolbar/utils";

/**
 * Дополнительные клавиатурные сокращения, которых нет в Lexical out-of-the-box.
 * Регистрируется одним KEY_DOWN_COMMAND-обработчиком, чтобы события не утекали
 * наружу и не конфликтовали со стандартными хоткеями браузера.
 */

type HandlerCtx = {
  editor: LexicalEditor,
  // нам нужен blockType — но он внутри ToolbarContext.
  // Чтобы не тащить контекст в плагин, передаём команды форматирования blockType-агностично:
  // formatHeading/formatCode/formatNumberedList/formatBulletList принимают blockType
  // и сами решают, нужен ли toggle. Передаём "paragraph" как «не активный» — toggle не сработает.
};

const handlers: Array<{
  match: (e: KeyboardEvent, isMac: boolean) => boolean,
  run: (ctx: HandlerCtx) => void,
}> = [
  // Mod+Shift+S → strikethrough
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && (e.key === "S" || e.key === "s"),
    run: ({ editor }) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough"),
  },
  // Mod+Shift+H → открыть меню цвета выделения (ColorPicker),
  // как кнопка «Выделение» в тулбаре. Раньше сразу ставило жёлтый highlight.
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && (e.key === "H" || e.key === "h"),
    run: ({ editor }) => editor.dispatchCommand(OPEN_HIGHLIGHT_MENU_COMMAND, undefined),
  },
  // Mod+E → inline code
  {
    match: (e) => mod(e) && !e.shiftKey && !e.altKey && (e.key === "E" || e.key === "e"),
    run: ({ editor }) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code"),
  },
  // Mod+\ → очистить форматирование (в реестре Mod+\; раньше не было обработчика)
  {
    match: (e) => mod(e) && !e.shiftKey && !e.altKey && (e.code === "Backslash" || e.key === "\\"),
    run: ({ editor }) => clearFormatting(editor, true),
  },
  // Mod+Alt+0 → paragraph.
  // Важно матчить по e.code (Digit0..6), а не e.key: на macOS Option+цифра
  // даёт «мёртвый» символ (¡ ™ £ ¢ ∞ § º), и сравнение e.key === "1" не срабатывает.
  {
    match: (e) => mod(e) && e.altKey && !e.shiftKey && e.code === "Digit0",
    run: ({ editor }) => formatParagraph(editor),
  },
  // Mod+Alt+1..6 → headings
  {
    match: (e) => mod(e) && e.altKey && !e.shiftKey && e.code === "Digit1",
    run: ({ editor }) => formatHeading(
      editor, "paragraph", "h1",
    ),
  },
  {
    match: (e) => mod(e) && e.altKey && !e.shiftKey && e.code === "Digit2",
    run: ({ editor }) => formatHeading(
      editor, "paragraph", "h2",
    ),
  },
  {
    match: (e) => mod(e) && e.altKey && !e.shiftKey && e.code === "Digit3",
    run: ({ editor }) => formatHeading(
      editor, "paragraph", "h3",
    ),
  },
  {
    match: (e) => mod(e) && e.altKey && !e.shiftKey && e.code === "Digit4",
    run: ({ editor }) => formatHeading(
      editor, "paragraph", "h4",
    ),
  },
  {
    match: (e) => mod(e) && e.altKey && !e.shiftKey && e.code === "Digit5",
    run: ({ editor }) => formatHeading(
      editor, "paragraph", "h5",
    ),
  },
  {
    match: (e) => mod(e) && e.altKey && !e.shiftKey && e.code === "Digit6",
    run: ({ editor }) => formatHeading(
      editor, "paragraph", "h6",
    ),
  },
  // Mod+Shift+7 → numbered list (Shift+7 даёт "&" на US-раскладке)
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && e.key === "&",
    run: ({ editor }) => formatNumberedList(editor, "paragraph"),
  },
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && e.code === "Digit7",
    run: ({ editor }) => formatNumberedList(editor, "paragraph"),
  },
  // Mod+Shift+8 → bullet list
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && (e.key === "*" || e.code === "Digit8"),
    run: ({ editor }) => formatBulletList(editor, "paragraph"),
  },
  // Mod+Shift+C → code block
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && (e.key === "C" || e.key === "c"),
    run: ({ editor }) => formatCode(editor, "paragraph"),
  },
  // Mod+Shift+L → align left
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && (e.key === "L" || e.key === "l"),
    run: ({ editor }) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left"),
  },
  // Mod+Shift+E → align center
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && (e.key === "E" || e.key === "e"),
    run: ({ editor }) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center"),
  },
  // Mod+Shift+R → align right
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && (e.key === "R" || e.key === "r"),
    run: ({ editor }) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right"),
  },
  // Mod+Shift+J → justify
  {
    match: (e) => mod(e) && e.shiftKey && !e.altKey && (e.key === "J" || e.key === "j"),
    run: ({ editor }) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify"),
  },
];

function mod(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

export function KeyboardShortcutsPlugin(): null {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (!editor.isEditable()) return false;
        const handler = handlers.find((h) => h.match(event, false));
        if (handler) {
          event.preventDefault();
          handler.run({ editor });
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    ));
  }, [ editor ]);

  return null;
}
