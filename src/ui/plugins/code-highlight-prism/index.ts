import { useEffect } from "react";

import { registerCodeHighlighting } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export const CodeHighlightPrismPlugin = () => {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [ editor ]);

  return null;
};
