import { FC, useState } from "react";

import { NodeKey } from "lexical";

import { useDecoratorSelection } from "@/lib/hooks/use-decorator-selection";

import styles from "./ScormViewer.module.scss";

interface ScormViewerProps {
  file: string,
  className?: string,
  nodeKey: NodeKey,
}

export const ScormViewer: FC<ScormViewerProps> = ({ file, className, nodeKey }) => {
  const { rootRef, isFocused } = useDecoratorSelection(nodeKey);
  const [ isLoading, setIsLoading ] = useState(true);

  return (
    <div
      ref={rootRef}
      className={
        `${styles.container} ${className ?? ""} ${isFocused ?
          "tc-decorator-focused" :
          ""}`
      }
    >
      {isLoading && <div className={styles.loading}>Загрузка...</div>}
      <iframe
        className={styles.iframe}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        src={file}
        title="SCORM content"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};
