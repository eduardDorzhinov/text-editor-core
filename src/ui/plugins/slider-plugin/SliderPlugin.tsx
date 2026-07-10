import {
  ReactElement,
  useEffect,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
} from "lexical";

import { INSERT_SLIDER_COMMAND,SliderNode } from "./SliderNode";

export const SliderPlugin = (): ReactElement | null => {
  const [ editor ] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([ SliderNode ])) {
      throw new Error("SliderPlugin: SliderNode is not registered on editor");
    }

    return editor.registerCommand(
      INSERT_SLIDER_COMMAND,
      () => {
        const sliderNode = new SliderNode([]);

        $insertNodes([ sliderNode ]);

        if ($isRootOrShadowRoot(sliderNode.getParentOrThrow())) {
          sliderNode
            .selectNext();
          $insertNodes([ $createParagraphNode() ]);
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [ editor ]);

  return null;
};
