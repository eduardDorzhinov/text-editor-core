import { useEffect, useRef } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNodeByKey, TextNode } from "lexical";

import { slugify } from "@/lib/utils/transliteration";

import { AnchorHeadingNode } from "./AnchorHeadingNode";

const DEBOUNCE_MS = 400;

export function AnchorHeadingPlugin() {
  const [ editor ] = useLexicalComposerContext();

  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (textNode) => {
      const parent = textNode.getParent();
      if (!(parent instanceof AnchorHeadingNode)) return;

      const key = parent.__key;

      const text = parent.getTextContent();
      if (!text) return;

      const timers = timersRef.current;

      const existingTimer = timers.get(key);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const timeoutId = window.setTimeout(() => {
        editor.update(() => {
          const heading = $getNodeByKey(key);
          if (!(heading instanceof AnchorHeadingNode)) return;

          const currentText = heading.getTextContent();
          if (!currentText) return;

          const baseId = slugify(currentText);
          if (!baseId) return;

          let id = baseId;

          const root = heading.getTopLevelElementOrThrow();
          const siblings = root.getParent()?.getChildren() ?? [];

          const used = new Set<string>();
          siblings.forEach((node) => {
            if ($isHeadingNode(node) && node.__key !== key) {
              const otherId = (node as any).getId?.();
              if (otherId) used.add(otherId);
            }
          });

          let i = 0;
          while (used.has(id)) {
            i++;
            id = `${baseId}-${i}`;
          }

          if (heading.getId() !== id) {
            heading.setId(id);
          }
        });

        timers.delete(key);
      }, DEBOUNCE_MS);

      timers.set(key, timeoutId);
    });
  }, [ editor ]);

  return null;
}
