import {
  FC,
  useCallback,
  useEffect,
  useState,
} from "react";
import { FiCopy } from "react-icons/fi";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { useBlockAnchor } from "./BlockAnchorContext";

import styles from "./AnchorsSidebar.module.scss";

type AnchorItem = {
  nodeKey: string,
  anchorId: string,
  type: string,
};

export const AnchorsSidebar: FC<{
  onClose: () => void,
}> = ({ onClose }) => {
  const [ editor ] = useLexicalComposerContext();
  const { getAllAnchors, version } = useBlockAnchor();
  const [ items, setItems ] = useState<AnchorItem[]>([]);
  const [ copiedKey, setCopiedKey ] = useState<string | null>(null);

  useEffect(() => {
    setItems(getAllAnchors());
  }, [ getAllAnchors, version ]);

  const scrollTo = useCallback((key: string) => {
    editor.getEditorState().read(() => {
      const el = editor.getElementByKey(key);
      if (!el) return;
      const scrollContainer = el.closest("#text-creator-root") || el.closest(".editor-scroller");
      if (scrollContainer) {
        const elRect = el.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const offset = elRect.top - containerRect.top + scrollContainer.scrollTop - 60;
        scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [ editor ]);

  const copyAnchor = useCallback((nodeKey: string, anchorId: string) => {
    navigator.clipboard.writeText(`#${anchorId}`).then(() => {
      setCopiedKey(nodeKey);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }, []);

  return (
    <div className={`${styles.panel} AnchorsSidebar_Panel`}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Якоря</h2>
        <button
          aria-label="Закрыть"
          className={styles.closeButton}
          type="button"
          onClick={onClose}
        >
          &times;
        </button>
      </div>
      {
        items.length === 0 ?
          <div className={styles.empty}>Нет якорей</div> :
          (
            <div className={styles.body}>
              <ul className={styles.list}>
                {
                  items.map((item) => (
                    <li
                      key={item.nodeKey}
                      className={styles.item}
                    >
                      <button
                        className={styles.link}
                        type="button"
                        onClick={() => scrollTo(item.nodeKey)}
                      >
                        <span className={styles.anchorId}>#{item.anchorId}</span>
                        <span className={styles.anchorType}>{item.type}</span>
                      </button>
                      <div className={styles.copyWrap}>
                        <button
                          className={styles.copyBtn}
                          title="Копировать якорь"
                          type="button"
                          onClick={() => copyAnchor(item.nodeKey, item.anchorId)}
                        >
                          <FiCopy />
                        </button>
                        {
                          copiedKey === item.nodeKey && (
                            <span className={styles.copyTooltip}>Скопировано</span>
                          )
                        }
                      </div>
                    </li>
                  ))
                }
              </ul>
            </div>
          )
      }
    </div>
  );
};
