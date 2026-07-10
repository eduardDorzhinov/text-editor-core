import { JSX } from "react";

import {
  $getSelection,
  $isRangeSelection,
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalEditor,
  NodeKey,
  SerializedLexicalNode,
} from "lexical";

import { makeUniqueAnchorId } from "@/lib/utils/make-uniq-ancor-id";

import { AnchorComponent } from "./AnchorComponent";

export type SerializedAnchorNode = SerializedLexicalNode & {
  id: string,
  tocHidden?: boolean,
};

export class AnchorNode extends DecoratorNode<JSX.Element> {
  __id: string;
  __tocHidden: boolean = true;

  static getType() {
    return "anchor";
  }

  static clone(node: AnchorNode) {
    const cloned = new AnchorNode(node.__id, node.__key);
    cloned.__tocHidden = node.__tocHidden;
    return cloned;
  }

  constructor(id: string, key?: NodeKey) {
    super(key);
    this.__id = id;
  }

  createDOM(): HTMLElement {
    const a = document.createElement("a");
    a.id = this.__id;
    a.setAttribute("aria-hidden", "true");
    a.tabIndex = -1;
    a.style.display = "inline-flex";
    a.style.alignItems = "center";

    return a;
  }

  updateDOM(prevNode: AnchorNode, dom: HTMLElement): boolean {
    if (prevNode.__id !== this.__id) {
      dom.id = this.__id;
    }
    return false;
  }

  decorate(editor: LexicalEditor) {
    return (
      <AnchorComponent
        editor={editor}
        id={this.__id}
        nodeKey={this.getKey()}
      />
    );
  }

  isInline() {
    return true;
  }

  isSelectable() {
    return false;
  }

  canInsertTextBefore() {
    return true;
  }

  canInsertTextAfter() {
    return true;
  }

  exportJSON(): SerializedAnchorNode {
    return {
      ...super.exportJSON(),
      type: "anchor",
      version: 1,
      id: this.__id,
      tocHidden: this.__tocHidden || undefined,
    };
  }

  static importJSON(serialized: SerializedAnchorNode) {
    const node = new AnchorNode(serialized.id);
    node.__tocHidden = serialized.tocHidden ?? true;
    return node;
  }

  // HTML round-trip. Помечаем якорь data-anchor-node, чтобы при импорте
  // отличить его от обычной ссылки (LinkNode тоже ловит <a>). Иначе при
  // вставке чистого HTML якорь распадался в текст/ссылку, а tocHidden терялся.
  exportDOM(): DOMExportOutput {
    const element = document.createElement("a");
    if (this.__id) element.id = this.__id;
    element.setAttribute("data-anchor-node", "true");
    element.setAttribute("aria-hidden", "true");
    if (this.__tocHidden) element.setAttribute("data-toc-hidden", "true");
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      a: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-anchor-node")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            const node = new AnchorNode(el.id || "");
            node.__tocHidden = el.getAttribute("data-toc-hidden") === "true";
            return { node };
          },
          // Выше дефолтного LinkNode (1), чтобы наш якорь не стал ссылкой.
          priority: 3,
        };
      },
    };
  }

  setId(id: string) {
    this.getWritable().__id = id;
  }

  getId() {
    return this.__id;
  }

  setTocHidden(hidden: boolean) {
    this.getWritable().__tocHidden = hidden;
  }

  isTocHidden() {
    return this.__tocHidden;
  }
}

export function $createAnchorNode(id: string) {
  return new AnchorNode(id);
}

export function insertAnchor(editor: LexicalEditor, baseId = "anchor") {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const uniqueId = makeUniqueAnchorId(baseId);
    selection.insertNodes([ $createAnchorNode(uniqueId) ]);
  });
}
