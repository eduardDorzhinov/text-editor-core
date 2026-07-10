import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FiDownload, FiExternalLink } from "react-icons/fi";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { $getNodeByKey, NodeKey } from "lexical";

import { DownloadNode } from "./DownloadNode";

import styles from "./InlineDownloadComponent.module.scss";

interface Props {
  file: string,
  fileName: string,
  nodeKey: NodeKey,
}

export function InlineDownloadComponent({ file, fileName, nodeKey }: Props) {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const [ showPopup, setShowPopup ] = useState(false);
  const [ localFile, setLocalFile ] = useState(file);
  const [ localName, setLocalName ] = useState(fileName);
  const editingRef = useRef(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingRef.current) {
      setLocalFile(file);
      setLocalName(fileName);
    }
  }, [ file, fileName ]);

  // Close popup on outside click
  useEffect(() => {
    if (!showPopup) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
      ) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [ showPopup ]);

  const update = useCallback((fn: (node: DownloadNode) => void) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof DownloadNode) fn(node);
    });
  }, [ editor, nodeKey ]);

  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    editingRef.current = true;
    const val = e.target.value;
    setLocalFile(val);
    update((node) => {
      const w = node.getWritable() as DownloadNode;
      w.__file = val;
    });
    requestAnimationFrame(() => {
      editingRef.current = false;
    });
  }, [ update ]);

  const onNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    editingRef.current = true;
    const val = e.target.value;
    setLocalName(val);
    update((node) => {
      const w = node.getWritable() as DownloadNode;
      w.__fileName = val;
    });
    requestAnimationFrame(() => {
      editingRef.current = false;
    });
  }, [ update ]);

  const onLinkClick = (e: React.MouseEvent) => {
    if (isEditable) {
      e.preventDefault();
      setShowPopup((v) => !v);
    }
  };

  return (
    <span
      ref={wrapRef}
      className={styles.wrap}
    >
      <a
        className={styles.link}
        download={
          !isEditable ?
            fileName :
            undefined
        }
        href={
          isEditable ?
            undefined :
            file
        }
        rel="noreferrer"
        target="_blank"
        onClick={onLinkClick}
      >
        <FiDownload className={styles.icon} />
        <span>{fileName || "Файл"}</span>
      </a>

      {
        showPopup && isEditable && (
          <div
            ref={popupRef}
            className={styles.popup}
          >
            <label className={styles.popupLabel}>
              {"Ссылка"}
              <input
                className={styles.popupInput}
                placeholder="https://..."
                value={localFile}
                onChange={onFileChange}
              />
            </label>
            <label className={styles.popupLabel}>
              {"Название"}
              <input
                className={styles.popupInput}
                placeholder="Файл для скачивания"
                value={localName}
                onChange={onNameChange}
              />
            </label>
            {
              localFile && (
                <a
                  className={styles.popupOpen}
                  href={localFile}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FiExternalLink />
                  {"Открыть"}
                </a>
              )
            }
          </div>
        )
      }
    </span>
  );
}
