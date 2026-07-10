import { HeadingTagType } from "@lexical/rich-text";

import { AnchorHeadingNode } from "./AnchorHeadingNode";

export function $createAnchorHeadingNode(tag: HeadingTagType) {
  return new AnchorHeadingNode(tag);
}
