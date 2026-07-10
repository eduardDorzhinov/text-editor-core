/**
 * NormalizeFontPlugin — снимает inline `font-size` с любой текстовой ноды.
 *
 * Размер шрифта в редакторе не редактируется и задаётся типом блока
 * (заголовки h1→h6, обычный текст/списки — см. theme.scss / preview).
 * Этот transform — железная гарантия, что НИКАКОЙ размер не «протечёт»
 * в документ, по какому бы пути контент ни попал:
 *  - вставка из Word / Google Docs / другого редактора (text/html);
 *  - вставка через lexical-JSON (application/x-lexical-editor) из другого
 *    инстанса с тем же namespace;
 *  - загрузка легаси-документа, где размеры были проставлены инлайн
 *    прежним контролом размера.
 *
 * Transform идемпотентен: пишет только когда font-size реально присутствует,
 * поэтому не зацикливается и не трогает остальные inline-стили.
 */
import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isTextNode, TextNode } from "lexical";

/** Удаляет объявление font-size из CSS-строки inline-стиля. */
function stripFontSize(style: string): string {
  return style
    .split(";")
    .map((decl) => decl.trim())
    .filter((decl) => decl !== "" && !/^font-size\s*:/i.test(decl))
    .join("; ");
}

export function NormalizeFontPlugin(): null {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      if (!$isTextNode(node)) return;
      const style = node.getStyle();
      if (!style || !/font-size/i.test(style)) return;
      const cleaned = stripFontSize(style);
      if (cleaned !== style) {
        node.setStyle(cleaned);
      }
    });
  }, [ editor ]);

  return null;
}
