import { $insertNodes } from "lexical";

import { PdfNode } from "./PdfNode";

export function insertPdf(
  src: string,
  title: string,
  className?: string,
) {
  const videoNode = new PdfNode(
    src,
    title,
    className,
  );
  $insertNodes([ videoNode ]);
}
