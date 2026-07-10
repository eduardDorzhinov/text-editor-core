import { ReactElement, useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from "lexical";

import { $createHtmlNode, HtmlNode } from "./HtmlNode";

export const INSERT_HTML_COMMAND: LexicalCommand<string> = createCommand("INSERT_HTML_COMMAND");

/**
 * Регистрирует INSERT_HTML_COMMAND. Команда сразу вставляет пустой
 * HtmlNode в редактор; редактирование текста происходит inline
 * в блоке через HtmlComponent (вкладка "HTML").
 */
export function HtmlPlugin(): ReactElement | null {
  const [ editor ] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([ HtmlNode ])) {
      throw new Error("HtmlPlugin: HtmlNode is not registered on editor");
    }
    return editor.registerCommand<string>(
      INSERT_HTML_COMMAND,
      (html) => {
        editor.update(() => {
          $insertNodes([ $createHtmlNode(html || "") ]);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [ editor ]);
  return null;
}
