import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  NodeKey,
} from "lexical";

/**
 * Shared selection hook for decorator nodes (video, audio, quote, etc.).
 * Returns { rootRef, isFocused } — bind rootRef to the component's
 * outermost element so click-to-select and Delete/Backspace work.
 */
export function useDecoratorSelection(nodeKey: NodeKey) {
  const [ editor ] = useLexicalComposerContext();
  const rootRef = useRef<HTMLElement | null>(null);
  const [
    isSelected,
    setSelected,
    clearSelection,
  ] = useLexicalNodeSelection(nodeKey);

  const isFocused = isSelected && editor.getEditorState().read(() => {
    const selection = $getSelection();
    return $isNodeSelection(selection) && selection.has(nodeKey);
  });

  const onClick = useCallback((event: MouseEvent) => {
    const el = rootRef.current;
    if (!el) return false;

    // Check if event target is inside our node
    const target = event.target as HTMLElement;
    if (!el.contains(target)) return false;

    // Don't steal focus from interactive elements inside the node
    const tag = target.tagName;
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      tag === "BUTTON" ||
      target.isContentEditable
    ) {
      return false;
    }

    if (event.shiftKey) {
      setSelected(!isSelected);
    } else {
      clearSelection();
      setSelected(true);
    }
    return true;
  }, [
    isSelected,
    setSelected,
    clearSelection,
  ]);

  const onDelete = useCallback((event: KeyboardEvent) => {
    const selection = $getSelection();
    if ($isNodeSelection(selection) && selection.has(nodeKey)) {
      event.preventDefault();
      selection.getNodes().forEach((node) => {
        if (node.__key === nodeKey) node.remove();
      });
      return true;
    }
    return false;
  }, [ nodeKey ]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        onClick,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [
    editor,
    onClick,
    onDelete,
  ]);


  return { rootRef: rootRef as React.RefObject<any>, isFocused: !!isFocused };
}
