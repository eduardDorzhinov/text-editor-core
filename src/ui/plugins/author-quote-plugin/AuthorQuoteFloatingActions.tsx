import {
  CSSProperties,
  useEffect,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
} from "lexical";

import { useScopedPortal } from "@/vendor/shared";

import { $isAuthorQuoteNode } from "./AuthorQuoteNode";
import { TOGGLE_AUTHOR_QUOTE_AUTHOR_COMMAND } from "./AuthorQuotePlugin";

import styles from "./AuthorQuote.module.scss";

interface ActiveState {
  key: string,
  hasAuthor: boolean,
  position: CSSProperties,
}

export function AuthorQuoteFloatingActions(): null | ReturnType<ReturnType<typeof useScopedPortal>> {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const scopedPortal = useScopedPortal();
  const [ active, setActive ] = useState<ActiveState | null>(null);

  useEffect(() => {
    if (!isEditable) {
      setActive(null);
      return;
    }

    const recompute = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          setActive(null);
          return;
        }
        const container = $findMatchingParent(selection.anchor.getNode(), $isAuthorQuoteNode);
        if (!$isAuthorQuoteNode(container)) {
          setActive(null);
          return;
        }
        const el = editor.getElementByKey(container.getKey());
        if (!el) {
          setActive(null);
          return;
        }
        const rect = el.getBoundingClientRect();
        setActive({
          key: container.getKey(),
          hasAuthor: container.hasAuthor(),
          position: {
            position: "absolute",
            top: rect.bottom + window.scrollY - 14,
            left: rect.right + window.scrollX - 110,
            zIndex: 30,
          },
        });
      });
    };

    return mergeRegister(editor.registerUpdateListener(recompute),
      ((): (() => void) => {
        const handler = () => recompute();
        window.addEventListener("resize", handler);
        window.addEventListener(
          "scroll", handler, true,
        );
        return () => {
          window.removeEventListener("resize", handler);
          window.removeEventListener(
            "scroll", handler, true,
          );
        };
      })());
  }, [ editor, isEditable ]);

  if (!active || active.hasAuthor) return null;

  return scopedPortal(<button
    className={styles.floatingAddAuthor}
    style={active.position}
    type="button"
    onClick={() => editor.dispatchCommand(TOGGLE_AUTHOR_QUOTE_AUTHOR_COMMAND, active.key)}
    onMouseDown={(e) => e.preventDefault()}
  >
    + Автор
  </button>,
  document.body);
}
