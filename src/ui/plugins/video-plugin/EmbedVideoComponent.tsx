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

import { VIDEO_ORIENTATION, VideoNode, VideoOrientation } from "./VideoNode";
import { getVideoSourceLabel, VideoSourceType } from "./videoUtils";

import styles from "./EmbedVideoComponent.module.scss";

interface EmbedVideoComponentProps {
  src: string,
  orientation: VideoOrientation,
  sourceType: VideoSourceType,
  nodeKey: NodeKey,
}

export function EmbedVideoComponent({
  src,
  orientation,
  sourceType,
  nodeKey,
}: EmbedVideoComponentProps) {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const { rootRef, isFocused } = useDecoratorSelection(nodeKey);
  const [ modal, showModal ] = useModal();
  const editingRef = useRef(false);
  const [ localSrc, setLocalSrc ] = useState(src);

  useEffect(() => {
    if (!editingRef.current) setLocalSrc(src);
  }, [ src ]);

  const update = useCallback((fn: (node: VideoNode) => void) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof VideoNode) fn(node);
    });
  }, [ editor, nodeKey ]);

  const onSrcChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    editingRef.current = true;
    const val = e.target.value;
    setLocalSrc(val);
    update((node) => {
      const writable = node.getWritable() as VideoNode;
      writable.__src = val;
    });
    requestAnimationFrame(() => {
      editingRef.current = false;
    });
  }, [ update ]);

  const onOrientationChange = useCallback((o: VideoOrientation) => {
    update((node) => {
      const writable = node.getWritable() as VideoNode;
      writable.__orientation = o;
    });
  }, [ update ]);

  const onPreview = useCallback(() => {
    showModal(
      `${getVideoSourceLabel(sourceType)} — предпросмотр`,
      () => (
        <div className={styles.previewModal}>
          {
            sourceType === "direct" ?
              (
                <video
                  controls
                  className={
                    orientation === VIDEO_ORIENTATION.Vertical ?
                      styles.iframeVertical :
                      styles.iframeHorizontal
                  }
                  src={src}
                />
              ) :
              (
                <iframe
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  className={
                    orientation === VIDEO_ORIENTATION.Vertical ?
                      styles.iframeVertical :
                      styles.iframeHorizontal
                  }
                  src={src}
                  title="Video preview"
                />
              )
          }
        </div>
      ),
      false,
      true,
    );
  }, [
    showModal,
    src,
    orientation,
    sourceType,
  ]);

  const label = getVideoSourceLabel(sourceType);
  const isVertical = orientation === VIDEO_ORIENTATION.Vertical;

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
        <span className={styles.badge}>{label}</span>
        {
          isEditable && (
            <div className={styles.orientationButtons}>
              <button
                className={
                  `${styles.orientationBtn} ${!isVertical ?
                    styles.orientationBtnActive :
                    ""}`
                }
                type="button"
                onClick={() => onOrientationChange(VIDEO_ORIENTATION.Horizontal)}
              >
                <span className={styles.orientationIconH} />
              </button>
              <button
                className={
                  `${styles.orientationBtn} ${isVertical ?
                    styles.orientationBtnActive :
                    ""}`
                }
                type="button"
                onClick={() => onOrientationChange(VIDEO_ORIENTATION.Vertical)}
              >
                <span className={styles.orientationIconV} />
              </button>
            </div>
          )
        }
      </div>

      {
        isEditable && (
          <input
            className={styles.srcInput}
            placeholder="Ссылка на видео..."
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
