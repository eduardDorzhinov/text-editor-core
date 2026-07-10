import { ReactElement } from "react";

import {
  type NodeKey,
  type SerializedLexicalNode,
  DecoratorNode,
} from "lexical";

import { TOCComponent } from "./TOCComponent";

export type SerializedTOCNode = SerializedLexicalNode & {
  type: "table-of-contents",
};

export class TOCNode extends DecoratorNode<ReactElement> {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType() {
    return "table-of-contents";
  }

  static clone(node: TOCNode) {
    return new TOCNode(node.__key);
  }

  static importJSON(_serialized: SerializedTOCNode): TOCNode {
    return new TOCNode();
  }

  exportJSON(): SerializedTOCNode {
    return {
      ...super.exportJSON(),
      type: "table-of-contents",
      version: 1,
    } as SerializedTOCNode;
  }

  createDOM() {
    const div = document.createElement("div");
    div.className = "tc-toc-node";
    return div;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <TOCComponent nodeKey={this.__key} />;
  }
}

export function $createTOCNode(): TOCNode {
  return new TOCNode();
}
