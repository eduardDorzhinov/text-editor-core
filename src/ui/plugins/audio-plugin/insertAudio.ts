import { $insertNodes } from "lexical";

import { AudioNode } from "./AudioNode";

export function insertAudio(
  src: string,
  title: string,
  id: string,
) {
  const node = new AudioNode(
    src,
    title,
    id,
  );
  $insertNodes([ node ]);
}
