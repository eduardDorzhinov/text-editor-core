import { ReactElement } from "react";

import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type NodeKey,
  type SerializedLexicalNode,
  DecoratorNode,
} from "lexical";

import { ScormViewer } from "./ScormViewer";

export interface SerializedScormNode extends SerializedLexicalNode {
  type: "scorm",
  version: 1,
  scormid: string,
  file: string,
  className?: string,
}

export class ScormNode extends DecoratorNode<ReactElement> {
  __scormid: string;
  __file: string;
  __className?: string;

  constructor(
    scormid: string = "",
    file: string = "",
    className: string = "",
    key?: NodeKey,
  ) {
    super(key);
    this.__scormid = scormid;
    this.__file = file;
    this.__className = className;
  }

  static getType() {
    return "scorm";
  }

  static clone(node: ScormNode) {
    return new ScormNode(
      node.__scormid,
      node.__file,
      node.__className,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedScormNode): ScormNode {
    const {
      scormid,
      file,
      className,
    } = serializedNode;
    return new ScormNode(
      scormid,
      file,
      className,
    );
  }

  exportJSON(): SerializedScormNode {
    return {
      ...super.exportJSON(),
      type: "scorm",
      version: 1,
      scormid: this.__scormid,
      file: this.__file,
      className: this.__className,
    };
  }

  isInline() {
    return false;
  }

  // HTML round-trip. JSON-путь первичен; здесь — фолбэк, кладём все поля.
  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.className = "tc-scorm-node";
    element.setAttribute("data-file", this.__file);
    element.setAttribute("data-scorm-id", this.__scormid);
    if (this.__className) element.setAttribute("data-class", this.__className);
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("tc-scorm-node")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            const file = el.getAttribute("data-file") || "";
            const scormid = el.getAttribute("data-scorm-id") || "";
            const className = el.getAttribute("data-class") || "";
            return { node: new ScormNode(
              scormid, file, className,
            ) };
          },
          priority: 2,
        };
      },
    };
  }

  createDOM() {
    const container = document.createElement("div");
    container.className = "tc-scorm-node";
    container.style.margin = "16px 0";
    return container;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return (
      <ScormViewer
        className={this.__className}
        file={this.__file}
        nodeKey={this.__key}
      />
    );
  }
}
