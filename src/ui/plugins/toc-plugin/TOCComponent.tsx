import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getRoot, NodeKey } from "lexical";

import { AnchorHeadingNode } from "@/ui/plugins/anchor-heading-plugin";

import styles from "./TOCComponent.module.scss";

type TOCEntry = {
  key: string,
  id: string,
  text: string,
  level: number,
};

const TAG_TO_LEVEL: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

export function TOCComponent({ nodeKey: _nodeKey }: { nodeKey: NodeKey }) {
  const [ editor ] = useLexicalComposerContext();
  const [ entries, setEntries ] = useState<TOCEntry[]>([]);

  const updateTOC = useCallback(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const items: TOCEntry[] = [];

      for (const child of root.getChildren()) {
        if ($isHeadingNode(child)) {
          const tag = child.getTag();
          const level = TAG_TO_LEVEL[ tag ] || 4;
          const text = child.getTextContent();
          const id = (child instanceof AnchorHeadingNode ?
            child.getId() :
            "") || "";

          if (text.trim()) {
            items.push({
              key: child.getKey(),
              id,
              text: text.trim(),
              level,
            });
          }
        }
      }

      setEntries(items);
    });
  }, [ editor ]);

  useEffect(() => {
    updateTOC();
    return editor.registerUpdateListener(() => {
      updateTOC();
    });
  }, [ editor, updateTOC ]);

  const scrollToHeading = useCallback((key: string) => {
    editor.getEditorState().read(() => {
      const element = editor.getElementByKey(key);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [ editor ]);

  if (entries.length === 0) {
    return (
      <div className={styles.root}>
        <p className={styles.title}>Содержание</p>
        <p className={styles.empty}>Добавьте заголовки в текст</p>
      </div>
    );
  }

  const minLevel = Math.min(...entries.map((e) => e.level));

  return (
    <div className={styles.root}>
      <p className={styles.title}>Содержание</p>
      <ul className={styles.list}>
        {
          entries.map((entry) => (
            <li
              key={entry.key}
              className={styles.item}
              style={{ paddingLeft: `${(entry.level - minLevel) * 16}px` }}
            >
              <button
                className={styles.link}
                type="button"
                onClick={() => scrollToHeading(entry.key)}
              >
                {entry.text}
              </button>
            </li>
          ))
        }
      </ul>
    </div>
  );
}
