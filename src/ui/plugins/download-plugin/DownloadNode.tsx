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

import { InlineDownloadComponent } from "./InlineDownloadComponent";

export interface SerializedDownloadNode extends SerializedLexicalNode {
  type: "download",
  version: 1,
  fileName: string,
  file: string,
}

export class DownloadNode extends DecoratorNode<ReactElement> {
  __file: string;
  __fileName: string;

  constructor(
    file: string = "",
    fileName: string = "",
    key?: NodeKey,
  ) {
    super(key);
    this.__file = file;
    this.__fileName = fileName;
  }

  static getType() {
    return "download";
  }

  static clone(node: DownloadNode) {
    return new DownloadNode(
      node.__file,
      node.__fileName,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedDownloadNode): DownloadNode {
    const { file, fileName } = serializedNode;
    return new DownloadNode(getPathWithUpload(file), fileName);
  }

  exportJSON(): SerializedDownloadNode {
    return {
      ...super.exportJSON(),
      type: "download",
      version: 1,
      file: this.__file,
      fileName: this.__fileName,
    };
  }

  // HTML round-trip. Inline-нода → <span>. JSON-путь первичен, это фолбэк.
  exportDOM(): DOMExportOutput {
    const span = document.createElement("span");
    span.className = "tc-download-node";
    span.setAttribute("data-file", this.__file);
    span.setAttribute("data-file-name", this.__fileName);
    return { element: span };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("tc-download-node")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            const file = el.getAttribute("data-file") || "";
            const fileName = el.getAttribute("data-file-name") || "";
            return { node: new DownloadNode(file, fileName) };
          },
          priority: 2,
        };
      },
    };
  }

  createDOM() {
    const span = document.createElement("span");
    span.className = "tc-download-node";
    return span;
  }

  updateDOM() {
    return false;
  }

  isInline() {
    return true;
  }

  decorate() {
    return (
      <InlineDownloadComponent
        file={this.__file}
        fileName={this.__fileName}
        nodeKey={this.__key}
      />
    );
  }
}
