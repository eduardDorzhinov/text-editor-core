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

import { EmbedAudioComponent } from "./EmbedAudioComponent";

const NODE_TYPE = "edt-audio";

export type SerializedAudioNode = {
  type: typeof NODE_TYPE,
  src: string,
  title: string,
  id: string,
} & SerializedLexicalNode;

export class AudioNode extends DecoratorNode<ReactElement> {
  __src: string;
  __title: string;
  __id: string;

  constructor(
    src: string = "",
    title: string = "",
    id: string = "",
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__title = title;
    this.__id = id;
  }

  static getType() {
    return NODE_TYPE;
  }

  static clone(node: AudioNode) {
    return new AudioNode(
      node.__src,
      node.__title,
      node.__id,
      node.__key,
    );
  }

  exportJSON(): SerializedAudioNode {
    return {
      ...super.exportJSON(),
      type: NODE_TYPE,
      version: 1,
      src: this.__src,
      title: this.__title,
      id: this.__id,
    } as SerializedAudioNode;
  }

  static importJSON(json: SerializedAudioNode): AudioNode {
    const { src, title, id } = json;
    return new AudioNode(
      getPathWithUpload(src), title, id,
    );
  }

  isInline() {
    return false;
  }

  // HTML round-trip. JSON-путь первичен; здесь — фолбэк, кладём все поля.
  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.className = "tc-audio-node";
    element.setAttribute("data-src", this.__src);
    element.setAttribute("data-title", this.__title);
    element.setAttribute("data-id", this.__id);
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("tc-audio-node")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            const src = el.getAttribute("data-src") || "";
            const title = el.getAttribute("data-title") || "";
            const id = el.getAttribute("data-id") || "";
            return { node: new AudioNode(
              src, title, id,
            ) };
          },
          priority: 2,
        };
      },
    };
  }

  createDOM() {
    const container = document.createElement("div");
    container.className = "tc-audio-node";
    container.style.margin = "16px 0";
    return container;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return (
      <EmbedAudioComponent
        nodeKey={this.__key}
        src={this.__src}
      />
    );
  }
}
