import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FiPlay } from "react-icons/fi";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { $getNodeByKey, NodeKey } from "lexical";

import { useDecoratorSelection } from "@/lib/hooks/use-decorator-selection";
import { useModal } from "@/ui/components/modal";

import { AudioNode } from "./AudioNode";

import styles from "./EmbedAudioComponent.module.scss";

interface EmbedAudioComponentProps {
  src: string,
  nodeKey: NodeKey,
}

export function EmbedAudioComponent({
  src,
  nodeKey,
}: EmbedAudioComponentProps) {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const { rootRef, isFocused } = useDecoratorSelection(nodeKey);
  const [ modal, showModal ] = useModal();
  const editingRef = useRef(false);
  const [ localSrc, setLocalSrc ] = useState(src);

  useEffect(() => {
    if (!editingRef.current) setLocalSrc(src);
  }, [ src ]);

  const onSrcChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    editingRef.current = true;
    const val = e.target.value;
    setLocalSrc(val);
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof AudioNode) {
        const writable = node.getWritable() as AudioNode;
        writable.__src = val;
      }
    });
    requestAnimationFrame(() => {
      editingRef.current = false;
    });
  }, [ editor, nodeKey ]);

  const onPreview = useCallback(() => {
    showModal(
      "Аудио — предпросмотр",
      () => (
        <div className={styles.previewModal}>
          <audio
            controls
            className={styles.audioPlayer}
            src={src}
          />
        </div>
      ),
      false,
      true,
    );
  }, [ showModal, src ]);

  return (
    <div
      ref={rootRef}
      className={
        `${styles.root} ${isFocused ?
          "tc-decorator-focused" :
          ""}`
      }
    >
      {modal}
      <div className={styles.header}>
        <span className={styles.badge}>Аудио</span>
      </div>

      {
        isEditable && (
          <input
            className={styles.srcInput}
            placeholder="Ссылка на аудио..."
            value={localSrc}
            onChange={onSrcChange}
          />
        )
      }

      <button
        className={styles.previewBtn}
        type="button"
        onClick={onPreview}
      >
        <FiPlay />
        {"Предпросмотр"}
      </button>
    </div>
  );
}
