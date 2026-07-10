import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from "lexical";

import { $createTOCNode, TOCNode } from "./TOCNode";

export const INSERT_TOC_COMMAND: LexicalCommand<void> = createCommand("INSERT_TOC_COMMAND");

export function TOCPlugin(): null {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ TOCNode ])) {
      throw new Error("TOCPlugin: TOCNode not registered on editor");
    }

    return editor.registerCommand(
      INSERT_TOC_COMMAND,
      () => {
        $insertNodes([ $createTOCNode() ]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [ editor ]);

  return null;
}
