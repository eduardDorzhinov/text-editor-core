import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";

import { AnchorNode } from "./AnchorNode";

export function AnchorGuardPlugin() {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(AnchorNode, (anchor) => {
      const parent = anchor.getParent();
      if (!parent) return;

      if ($isHeadingNode(parent)) {
        anchor.remove();
      }
    });
  }, [ editor ]);

  return null;
}
