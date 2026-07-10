import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
} from "lexical";

import {
  type CalloutType,
  $createCalloutContainerNode,
  $isCalloutContainerNode,
  CalloutContainerNode,
} from "./CalloutContainerNode";

import "./Callout.scss";

export const INSERT_CALLOUT_COMMAND = createCommand<CalloutType>("INSERT_CALLOUT_COMMAND");

export function CalloutPlugin(): null {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ CalloutContainerNode ])) {
      throw new Error("CalloutPlugin: CalloutContainerNode not registered on editor");
    }

    const $onEscapeUp = () => {
      const selection = $getSelection();
      if (
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.offset === 0
      ) {
        const container = $findMatchingParent(selection.anchor.getNode(),
          $isCalloutContainerNode);

        if ($isCalloutContainerNode(container)) {
          const parent = container.getParent();
          if (
            parent !== null &&
            parent.getFirstChild() === container &&
            selection.anchor.key === container.getFirstDescendant()?.getKey()
          ) {
            container.insertBefore($createParagraphNode());
          }
        }
      }
      return false;
    };

    const $onEscapeDown = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        const container = $findMatchingParent(selection.anchor.getNode(),
          $isCalloutContainerNode);

        if ($isCalloutContainerNode(container)) {
          const parent = container.getParent();
          if (parent !== null && parent.getLastChild() === container) {
            const lastDescendant = container.getLastDescendant();
            if (
              lastDescendant !== null &&
              selection.anchor.key === lastDescendant.getKey() &&
              selection.anchor.offset === lastDescendant.getTextContentSize()
            ) {
              container.insertAfter($createParagraphNode());
            }
          }
        }
      }
      return false;
    };

    return mergeRegister(
      editor.registerCommand(
        INSERT_CALLOUT_COMMAND,
        (calloutType) => {
          editor.update(() => {
            const paragraph = $createParagraphNode();
            $insertNodeToNearestRoot($createCalloutContainerNode(calloutType).append(paragraph));
            paragraph.select();
          });
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        $onEscapeDown,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        $onEscapeDown,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        $onEscapeUp,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        $onEscapeUp,
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [ editor ]);

  return null;
}
