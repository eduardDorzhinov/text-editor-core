import { $insertNodes } from "lexical";

import { DownloadNode } from "./DownloadNode";

export function insertDownload(file: string, fileName: string) {
  const downloadNode = new DownloadNode(file, fileName);
  $insertNodes([ downloadNode ]);
}
