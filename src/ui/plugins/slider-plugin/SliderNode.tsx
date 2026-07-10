import { ReactElement } from "react";

import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  createCommand,
  DecoratorNode,
  NodeKey,
  SerializedLexicalNode,
} from "lexical";

import { getPathWithUpload } from "@/lib/utils/upload-file";

import {
  ImageSlide,
  SliderComponent,
} from "./LexicalImageSlider";

export interface SerializedSliderNode extends SerializedLexicalNode {
  type: "edt-slider",
  version: 1,
  images: ImageSlide[],
}

export class SliderNode extends DecoratorNode<ReactElement> {
  __images: ImageSlide[];

  static getType(): string {
    return "edt-slider";
  }

  static clone(node: SliderNode): SliderNode {
    return new SliderNode(node.__images, node.__key);
  }

  constructor(images: ImageSlide[] = [], key?: NodeKey) {
    super(key);
    this.__images = images;
  }

  static importJSON(serializedNode: SerializedSliderNode): SliderNode {
    return new SliderNode(serializedNode.images.map((img) => ({ ...img, src: getPathWithUpload(img.src) })));
  }

  exportJSON(): SerializedSliderNode {
    return {
      ...super.exportJSON(),
      type: "edt-slider",
      version: 1,
      images: this.__images.map((img) => ({ ...img })),
    };
  }

  isInline(): false {
    return false;
  }

  // HTML round-trip. Массив слайдов сериализуем в data-images (JSON).
  // JSON-путь первичен; этот путь — фолбэк.
  exportDOM(): DOMExportOutput {
    const el = document.createElement("div");
    el.className = "edt-slider-node";
    el.setAttribute("data-images", JSON.stringify(this.__images));
    return { element: el };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("edt-slider-node")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            let images: ImageSlide[] = [];
            try {
              const raw = el.getAttribute("data-images");
              if (raw) images = JSON.parse(raw) as ImageSlide[];
            } catch {
              images = [];
            }
            return { node: new SliderNode(images) };
          },
          priority: 2,
        };
      },
    };
  }

  createDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "edt-slider-node";
    return el;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): ReactElement {
    return (
      <SliderComponent
        images={this.__images}
        nodeKey={this.getKey()}
      />
    );
  }
}

export const INSERT_SLIDER_COMMAND = createCommand<void>("INSERT_SLIDER_COMMAND");
