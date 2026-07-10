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

import { EmbedVideoComponent } from "./EmbedVideoComponent";
import { detectVideoSource } from "./videoUtils";

export const VIDEO_ORIENTATION = {
  Vertical: "vertical",
  Horizontal: "horizontal",
} as const;

export type VideoOrientation = typeof VIDEO_ORIENTATION[ keyof typeof VIDEO_ORIENTATION ];

export type SerializedVideoNode = {
  src: string,
  title: string,
  preview: string,
  orientation: VideoOrientation,
} & SerializedLexicalNode;

export class VideoNode extends DecoratorNode<ReactElement> {
  __src: string;
  __preview: string;
  __orientation: VideoOrientation;

  constructor(
    src: string = "",
    preview: string = "",
    orientation: VideoOrientation = VIDEO_ORIENTATION.Horizontal,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__preview = preview;
    this.__orientation = orientation;
  }

  static getType() {
    return "video";
  }

  static clone(node: VideoNode) {
    return new VideoNode(
      node.__src,
      node.__preview,
      node.__orientation,
      node.__key,
    );
  }

  exportJSON(): SerializedVideoNode {
    return {
      ...super.exportJSON(),
      type: "video",
      version: 1,
      src: this.__src,
      preview: this.__preview,
      orientation: this.__orientation,
    } as SerializedVideoNode;
  }

  static importJSON(json: SerializedVideoNode): VideoNode {
    const {
      src,
      preview,
      orientation,
    } = json;
    return new VideoNode(
      getPathWithUpload(src),
      preview,
      orientation,
    );
  }

  isInline() {
    return false;
  }

  // HTML round-trip (буфер обмена / внешняя вставка). JSON-путь
  // (exportJSON/importJSON) первичен для копирования статья→статья; этот
  // путь — фолбэк, поэтому сюда тоже кладём ВСЕ поля, включая orientation.
  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.className = "tc-video-node";
    element.setAttribute("data-src", this.__src);
    element.setAttribute("data-preview", this.__preview);
    element.setAttribute("data-orientation", this.__orientation);
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("tc-video-node")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            const src = el.getAttribute("data-src") || "";
            const preview = el.getAttribute("data-preview") || "";
            const orientation =
              (el.getAttribute("data-orientation") as VideoOrientation) ||
              VIDEO_ORIENTATION.Horizontal;
            return { node: new VideoNode(
              src, preview, orientation,
            ) };
          },
          priority: 2,
        };
      },
    };
  }

  createDOM() {
    const container = document.createElement("div");
    container.className = "tc-video-node";
    container.style.margin = "16px 0";
    return container;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    const sourceType = detectVideoSource(this.__src);

    return (
      <EmbedVideoComponent
        nodeKey={this.__key}
        orientation={this.__orientation}
        sourceType={sourceType}
        src={this.__src}
      />
    );
  }
}
