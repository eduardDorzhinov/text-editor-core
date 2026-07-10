/**
 * Двухступенчатый отступ. Перехватывает INDENT/OUTDENT_CONTENT_COMMAND на
 * COMMAND_PRIORITY_HIGH:
 *   Tab → если у параграфа нет отступа первой строки — задать его
 *                (__firstLineIndent), иначе увеличить общий отступ блока.
 *   Shift+Tab → сначала убрать отступ первой строки, затем общий.
 * Возвращает false вне применимых случаев, отдавая команду дефолту Lexical.
 * Кнопки тулбара диспатчат те же команды, поэтому ведут себя как Tab.
 */
import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  INDENT_CONTENT_COMMAND,
  LexicalEditor,
  OUTDENT_CONTENT_COMMAND,
} from "lexical";

import { $isCustomParagraphNode } from "./CustomParagraphNode";

/**
 * Двухступенчатый отступ для абзаца:
 *  - первый «отступ вправо» (Tab или кнопка тулбара) — text-indent
 *    первой строки;
 *  - дальше — обычный INDENT_CONTENT_COMMAND (__indent +1).
 * «Отступ влево» (Shift+Tab или кнопка) — сначала снимает text-indent,
 * потом — OUTDENT_CONTENT_COMMAND.
 *
 * Перехватываем сами INDENT/OUTDENT_CONTENT_COMMAND на HIGH-приоритете,
 * а не KEY_TAB_COMMAND, чтобы один и тот же сценарий применялся и к
 * хоткею (через TabIndentationPlugin → INDENT_COMMAND), и к кнопкам
 * тулбара (они диспатчат INDENT/OUTDENT напрямую).
 */
function tryHandle(editor: LexicalEditor, direction: "indent" | "outdent"): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;
  // multi-line → default
  if (!selection.isCollapsed()) return false;

  const anchor = selection.anchor.getNode();
  const paragraph = $findMatchingParent(anchor, $isCustomParagraphNode);
  if (!paragraph) return false;

  const current = paragraph.getFirstLineIndent();

  if (direction === "outdent") {
    // Сначала снимаем text-indent. Если его нет — отдаём дефолтному
    // OUTDENT (уменьшит __indent).
    if (current > 0) {
      editor.update(() => paragraph.setFirstLineIndent(current - 1));
      return true;
    }
    return false;
  }

  // indent. Первый раз — выставить text-indent. Дальше — default INDENT.
  if (current === 0) {
    editor.update(() => paragraph.setFirstLineIndent(1));
    return true;
  }
  return false;
}

export function ParagraphIndentPlugin(): null {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => tryHandle(editor, "indent"),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      OUTDENT_CONTENT_COMMAND,
      () => tryHandle(editor, "outdent"),
      COMMAND_PRIORITY_HIGH,
    ));
  }, [ editor ]);

  return null;
}
