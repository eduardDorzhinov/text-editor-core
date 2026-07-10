/**
 * ImageNode — блочный DecoratorNode для изображений (ресайз, подпись,
 * источник, выравнивание).
 *
 * Выравнивание (__format): DecoratorNode по умолчанию НЕ реагирует на
 * FORMAT_ELEMENT_COMMAND — дефолтный обработчик Lexical идёт вверх по дереву
 * и ставит format на ближайший ElementNode (в итоге на root, картинка не
 * двигается). Поэтому здесь добавлено собственное поле __format с
 * сериализацией, getFormatType()/setFormat() и applyImageFormatToDOM()
 * в createDOM/updateDOM, а команда перехватывается в images/index.tsx на
 * COMMAND_PRIORITY_HIGH. Подробности — docs/GOTCHAS.md.
 */
import { ReactElement } from "react";

import { $insertGeneratedNodes } from "@lexical/clipboard";
import { $generateNodesFromDOM } from "@lexical/html";
import { LinkNode } from "@lexical/link";
import {
  $applyNodeReplacement,
  $getEditor,
  $selectAll,
  $setSelection,
  createEditor,
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  LexicalUpdateJSON,
  LineBreakNode,
  NodeKey,
  ParagraphNode,
  RootNode,
  SerializedEditor,
  SerializedLexicalNode,
  SKIP_DOM_SELECTION_TAG,
  Spread,
  TextNode,
} from "lexical";

import { getPathWithUpload } from "@/lib/utils/upload-file";

import ImageComponent from "./ImageComponent";

export type ImageWidthMode = "full" | "fixed";

export interface ImagePayload {
  altText: string,
  caption?: LexicalEditor,
  /** Plain-text описание под картинкой (используется в новом UI). */
  captionText?: string,
  height?: number,
  key?: NodeKey,
  maxWidth?: number,
  showCaption?: boolean,
  src: string,
  source?: string,
  width?: number,
  captionsEnabled?: boolean,
  /** "full" — на всю ширину редактора, "fixed" — по пиксельной width/height. */
  widthMode?: ImageWidthMode,
  /** Выравнивание блока: left/center/right. */
  format?: ElementFormatType,
}

/**
 * Применяет выравнивание блока картинки к её DOM-обёртке. В fixed-режиме
 * <img> ведёт себя как inline-block, поэтому text-align на контейнере
 * центрирует/прижимает её. В full-режиме картинка 100% — выравнивание
 * визуально не влияет (и это нормально).
 */
function applyImageFormatToDOM(dom: HTMLElement, format: ElementFormatType): void {
  let textAlign = "";
  switch (format) {
    case "center":
      textAlign = "center";
      break;
    case "right":
    case "end":
      textAlign = "right";
      break;
    case "left":
    case "start":
      textAlign = "left";
      break;
    default:
      textAlign = "";
  }
  dom.style.textAlign = textAlign;
}

function isGoogleDocCheckboxImg(img: HTMLImageElement): boolean {
  return (
    img.parentElement !== null &&
    img.parentElement.tagName === "LI" &&
    img.previousSibling === null &&
    img.getAttribute("aria-roledescription") === "checkbox"
  );
}

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement;
  const src = img.getAttribute("src");
  if (!src || src.startsWith("file:///") || isGoogleDocCheckboxImg(img)) {
    return null;
  }
  const {
    alt: altText,
    width,
    height,
  } = img;
  // Наши data-атрибуты (если это наш экспорт) дают точный round-trip
  // режима ширины / выравнивания / источника / подписи. Для внешнего HTML
  // их нет — тогда режим ширины выводим из наличия размера.
  const dataWidthMode = img.getAttribute("data-width-mode");
  let widthMode: ImageWidthMode;
  if (dataWidthMode === "full" || dataWidthMode === "fixed") {
    widthMode = dataWidthMode;
  } else {
    widthMode = width > 0 ?
      "fixed" :
      "full";
  }
  const source = img.getAttribute("data-source") || undefined;
  const captionText = img.getAttribute("data-caption") || undefined;
  const format = (img.getAttribute("data-format") as ElementFormatType) || undefined;
  const node = $createImageNode({
    altText,
    captionText,
    format,
    height,
    showCaption: Boolean(captionText),
    source,
    src,
    width,
    widthMode,
  });
  return { node };
}

export type SerializedImageNode = Spread<
  {
    altText: string,
    caption: SerializedEditor,
    captionText?: string,
    height?: number,
    maxWidth: number,
    showCaption: boolean,
    source?: string,
    src: string,
    width?: number,
    widthMode?: ImageWidthMode,
    format?: ElementFormatType,
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<ReactElement> {
  __src: string;
  __altText: string;
  __width: "inherit" | number;
  __height: "inherit" | number;
  __maxWidth: number;
  __showCaption: boolean;
  __caption: LexicalEditor;
  __captionsEnabled: boolean;
  __source: string;
  __widthMode: ImageWidthMode;
  // Простой текстовый caption. Старые документы могли хранить caption
  // как nested editor — на import достаём оттуда текст и кладём сюда.
  __captionText: string;
  // Выравнивание блока (left/center/right). DecoratorNode по умолчанию
  // не хранит format, поэтому FORMAT_ELEMENT_COMMAND его не выравнивал.
  __format: ElementFormatType;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__captionsEnabled,
      node.__source,
      node.__widthMode,
      node.__captionText,
      node.__format,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const {
      altText,
      height,
      width,
      maxWidth,
      src,
      source,
      showCaption,
      widthMode,
      captionText,
    } = serializedNode;
    // Старые документы без widthMode: если есть конкретная width — это
    // пиксельный режим (как было раньше), иначе full-width.
    let resolvedWidthMode: ImageWidthMode;
    if (widthMode) {
      resolvedWidthMode = widthMode;
    } else if (width && width > 0) {
      resolvedWidthMode = "fixed";
    } else {
      resolvedWidthMode = "full";
    }
    // Старые документы хранили caption в nested editor. На import достаём
    // оттуда plain text (если новый captionText не задан), чтобы не потерять.
    let resolvedCaptionText = captionText || "";
    if (!resolvedCaptionText && showCaption && serializedNode.caption?.editorState) {
      try {
        const state = serializedNode.caption.editorState as unknown as {
          root?: { children?: Array<{ children?: Array<{ text?: string }> }> },
        };
        const paragraphs = state.root?.children || [];
        resolvedCaptionText = paragraphs
          .map((p) => (p.children || []).map((c) => c.text || "").join(""))
          .join("\n")
          .trim();
      } catch {
        resolvedCaptionText = "";
      }
    }
    return $createImageNode({
      altText,
      captionText: resolvedCaptionText,
      format: serializedNode.format,
      height,
      maxWidth,
      showCaption: showCaption || resolvedCaptionText.length > 0,
      source,
      src: getPathWithUpload(src),
      width,
      widthMode: resolvedWidthMode,
    }).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedImageNode>): this {
    const node = super.updateFromJSON(serializedNode);
    const { caption } = serializedNode;

    const nestedEditor = node.__caption;
    const editorState = nestedEditor.parseEditorState(caption.editorState);
    if (!editorState.isEmpty()) {
      nestedEditor.setEditorState(editorState);
    }
    return node;
  }

  exportDOM(): DOMExportOutput {
    const imgElement = document.createElement("img");
    imgElement.setAttribute("src", this.__src);
    imgElement.setAttribute("alt", this.__altText);
    imgElement.setAttribute("width", this.__width.toString());
    imgElement.setAttribute("height", this.__height.toString());
    // Поля, которые ядро не переносит в HTML автоматически — кладём в
    // data-атрибуты на сам <img>, чтобы round-trip был точным независимо
    // от обёртки (figure/cite). $convertImageElement читает их обратно.
    imgElement.setAttribute("data-width-mode", this.__widthMode);
    if (this.__format) {
      imgElement.setAttribute("data-format", this.__format);
    }
    if (this.__captionText) {
      imgElement.setAttribute("data-caption", this.__captionText);
    }

    if (this.__source) {
      imgElement.setAttribute("data-source", this.__source);
    }

    // Caption теперь plain text (как у source). Старая логика с nested
    // editor не используется при экспорте — данные хранятся в __captionText.
    if (this.__captionText) {
      const figureElement = document.createElement("figure");
      const figcaptionElement = document.createElement("figcaption");
      figcaptionElement.textContent = this.__captionText;

      figureElement.appendChild(imgElement);
      figureElement.appendChild(figcaptionElement);
      if (this.__source) {
        const sourceElement = document.createElement("cite");
        sourceElement.textContent = this.__source;
        sourceElement.className = "image-source";
        figureElement.appendChild(sourceElement);
      }

      return { element: figureElement };
    }

    if (this.__source) {
      const figureElement = document.createElement("figure");
      figureElement.appendChild(imgElement);
      const sourceElement = document.createElement("cite");
      sourceElement.textContent = this.__source;
      sourceElement.className = "image-source";
      figureElement.appendChild(sourceElement);
      return { element: figureElement };
    }

    return { element: imgElement };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      figcaption: () => ({
        conversion: () => ({ node: null }),
        priority: 0,
      }),
      figure: () => ({
        conversion: (node) => {
          return {
            after: (childNodes) => {
              const imageNodes = childNodes.filter($isImageNode);
              const figcaption = node.querySelector("figcaption");
              if (figcaption) {
                for (const imgNode of imageNodes) {
                  // Если подпись уже восстановлена из data-caption (наш
                  // экспорт) — не дублируем её в nested-editor. Nested-путь
                  // нужен только для внешнего HTML без data-caption.
                  if (imgNode.getCaptionText()) continue;
                  imgNode.setShowCaption(true);
                  imgNode.__caption.update(() => {
                    const editor = $getEditor();
                    $insertGeneratedNodes(
                      editor,
                      $generateNodesFromDOM(editor, figcaption),
                      $selectAll(),
                    );
                    $setSelection(null);
                  },
                  { tag: SKIP_DOM_SELECTION_TAG });
                }
              }
              return imageNodes;
            },
            node: null,
          };
        },
        priority: 0,
      }),
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: "inherit" | number,
    height?: "inherit" | number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    captionsEnabled?: boolean,
    source?: string,
    widthMode?: ImageWidthMode,
    captionText?: string,
    format?: ElementFormatType,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || "inherit";
    this.__height = height || "inherit";
    this.__showCaption = showCaption || false;
    this.__caption =
      caption ||
      createEditor({
        namespace: "Playground/ImageNodeCaption",
        nodes: [
          RootNode,
          TextNode,
          LineBreakNode,
          ParagraphNode,
          LinkNode,
        ],
      });
    this.__captionsEnabled = captionsEnabled || captionsEnabled === undefined;
    this.__source = source || "";
    // По умолчанию новая картинка занимает всю ширину редактора. Старые
    // документы без widthMode откатываются на "fixed", чтобы не разломать
    // их верстку при загрузке (там у картинок прописана конкретная width).
    this.__widthMode = widthMode || "full";
    this.__captionText = captionText || "";
    this.__format = format || "";
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      altText: this.getAltText(),
      caption: this.__caption.toJSON(),
      captionText: this.__captionText || undefined,
      height: this.__height === "inherit" ?
        0 :
        this.__height,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption,
      source: this.__source || undefined,
      src: this.getSrc(),
      width: this.__width === "inherit" ?
        0 :
        this.__width,
      widthMode: this.__widthMode,
      format: this.__format || undefined,
    };
  }

  getCaptionText(): string {
    return this.__captionText;
  }

  setCaptionText(text: string): void {
    const writable = this.getWritable();
    writable.__captionText = text;
    writable.__showCaption = text.length > 0;
  }

  setWidthAndHeight(width: "inherit" | number,
    height: "inherit" | number): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  getWidthMode(): ImageWidthMode {
    return this.__widthMode;
  }

  setWidthMode(mode: ImageWidthMode): void {
    const writable = this.getWritable();
    writable.__widthMode = mode;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    writable.__showCaption = showCaption;
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  getSource(): string {
    return this.__source;
  }

  setSource(source: string): void {
    const writable = this.getWritable();
    writable.__source = source;
  }

  // View

  // Блочная нода — курсор перед/после картинки стоит как у других блочных
  // декораторов (slider, video), а не «налипает» к подписи. Парный с этим
  // флаг — это createDOM() ниже, возвращающий <div>, чтобы DOM не вступал
  // в противоречие с inline/block-семантикой Lexical'я.
  isInline(): false {
    return false;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement("div");
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      div.className = className;
    }
    applyImageFormatToDOM(div, this.__format);
    // Lexical сам ставит contenteditable=false на decorator DOM (см.
    // Lexical.dev.js: «// Decorators are always non editable»), руками
    // дублировать не нужно.
    return div;
  }

  updateDOM(prevNode: ImageNode, dom: HTMLElement): false {
    if (prevNode.__format !== this.__format) {
      applyImageFormatToDOM(dom, this.__format);
    }
    return false;
  }

  getFormatType(): ElementFormatType {
    return this.getLatest().__format;
  }

  setFormat(format: ElementFormatType): this {
    const self = this.getWritable();
    self.__format = format;
    return self;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): ReactElement {
    return (
      <ImageComponent
        altText={this.__altText}
        captionText={this.__captionText}
        height={this.__height}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
        resizable={true}
        source={this.__source}
        src={this.__src}
        width={this.__width}
        widthMode={this.__widthMode}
      />
    );
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 1000,
  captionsEnabled,
  src,
  source,
  width,
  showCaption,
  caption,
  widthMode,
  captionText,
  format,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(
    src,
    altText,
    maxWidth,
    width,
    height,
    showCaption,
    caption,
    captionsEnabled,
    source,
    widthMode,
    captionText,
    format,
    key,
  ));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
