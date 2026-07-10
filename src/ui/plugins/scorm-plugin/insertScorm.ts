import { $insertNodes } from "lexical";

import { ScormNode } from "./ScormNode";

export function insertScorm(
  scormid: string,
  file: string,
  className?: string,
) {
  const scormNode = new ScormNode(
    scormid,
    file,
    className,
  );
  $insertNodes([ scormNode ]);
}
