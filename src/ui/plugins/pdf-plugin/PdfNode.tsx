import { ReactElement } from "react";

import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type NodeKey,
  type SerializedLexicalNode,
  DecoratorNode,
} from "lexical";

import { getPathWithUpload } from "@/lib/utils/upload-file";

import { PdfViewer } from "./PdfViewer";

export interface SerializedPdfNode extends SerializedLexicalNode {
  type: "pdf",
  version: 1,
  src: string,
  title: string,
  className?: string,
}

export class PdfNode extends DecoratorNode<ReactElement> {
  __src: string;
  __title: string;
  __className: string;

  constructor(
    src: string = "",
    title: string = "",
    className: string = "",
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__title = title;
    this.__className = className;
  }

  static getType() {
    return "pdf";
  }

  static clone(node: PdfNode) {
    return new PdfNode(
      node.__src,
      node.__title,
      node.__className,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedPdfNode): PdfNode {
    const {
      src,
      title,
      className,
    } = serializedNode;
    return new PdfNode(
      getPathWithUpload(src),
      title,
      className,
    );
  }

  exportJSON(): SerializedPdfNode {
    return {
      ...super.exportJSON(),
      type: "pdf",
      version: 1,
      src: this.__src,
      title: this.__title,
      className: this.__className,
    };
  }

  isInline() {
    return false;
  }

  // HTML round-trip. JSON-путь первичен; здесь — фолбэк, поэтому кладём
  // все поля: data-file (путь к PDF), data-title, data-class.
  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.className = "tc-pdf-node";
    element.setAttribute("data-file", this.__src);
    element.setAttribute("data-title", this.__title);
    if (this.__className) element.setAttribute("data-class", this.__className);
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("tc-pdf-node")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            const src = el.getAttribute("data-file") || "";
            const title = el.getAttribute("data-title") || "";
            const className = el.getAttribute("data-class") || "";
            return { node: new PdfNode(
              src, title, className,
            ) };
          },
          priority: 2,
        };
      },
    };
  }

  createDOM() {
    const container = document.createElement("div");
    container.className = "tc-pdf-node";
    container.style.margin = "16px 0";
    return container;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return (
      <PdfViewer
        className={this.__className}
        fileUrl={this.__src}
        nodeKey={this.__key}
        title={this.__title}
      />
    );
  }
}
