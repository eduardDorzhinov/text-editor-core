import { useState } from "react";
import { FaRegCopy } from "react-icons/fa";
import { MdOutlineDone } from "react-icons/md";

import { $isCodeNode } from "@lexical/code";
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $setSelection,
  LexicalEditor,
} from "lexical";

import { useDebounce } from "../../utils";

interface Props {
  editor: LexicalEditor,
  getCodeDOMNode: () => HTMLElement | null,
}

export function CopyButton({ editor, getCodeDOMNode }: Props) {
  const [ isCopyCompleted, setCopyCompleted ] = useState<boolean>(false);

  const removeSuccessIcon = useDebounce(() => {
    setCopyCompleted(false);
  }, 1000);

  async function handleClick(): Promise<void> {
    const codeDOMNode = getCodeDOMNode();

    if (!codeDOMNode) {
      return;
    }

    let content = "";

    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);

      if ($isCodeNode(codeNode)) {
        content = codeNode.getTextContent();
      }

      const selection = $getSelection();
      $setSelection(selection);
    });

    try {
      await navigator.clipboard.writeText(content);
      setCopyCompleted(true);
      removeSuccessIcon();
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  }

  return (
    <button
      aria-label="copy"
      className="menu-item"
      onClick={handleClick}
    >
      {
        isCopyCompleted ?
          (
            <MdOutlineDone />
          ) :
          (
            <FaRegCopy />
          )
      }
    </button>
  );
}
