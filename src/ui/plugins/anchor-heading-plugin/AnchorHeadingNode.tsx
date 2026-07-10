import {
  HeadingNode,
  HeadingTagType,
  SerializedHeadingNode,
} from "@lexical/rich-text";
import {
  type DOMConversionMap,
  type DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalUpdateJSON,
  NodeKey,
} from "lexical";

type SerializedHeadingWithId = SerializedHeadingNode & {
  id?: string,
  tocHidden?: boolean,
};

export class AnchorHeadingNode extends HeadingNode {
  __id?: string;
  __tocHidden: boolean = false;

  constructor(tag: HeadingTagType, key?: NodeKey) {
    super(tag, key);
  }

  static getType() {
    return "heading";
  }

  static clone(node: AnchorHeadingNode) {
    const cloned = new AnchorHeadingNode(node.getTag(), node.__key);
    cloned.__id = node.__id;
    cloned.__tocHidden = node.__tocHidden;
    return cloned;
  }

  static importJSON(serialized: SerializedHeadingWithId) {
    // ВАЖНО: через updateFromJSON, а не вручную — иначе теряются
    // унаследованные от ElementNode поля (format/выравнивание, indent,
    // direction, textFormat, textStyle). Это главный путь для copy/paste
    // статья→статья (JSON) и для загрузки сохранённого документа.
    return new AnchorHeadingNode(serialized.tag).updateFromJSON(serialized);
  }

  updateFromJSON(serialized: LexicalUpdateJSON<SerializedHeadingWithId>): this {
    const self = super.updateFromJSON(serialized);
    self.__id = serialized.id;
    self.__tocHidden = serialized.tocHidden ?? false;
    return self;
  }

  exportJSON(): SerializedHeadingWithId {
    return {
      ...super.exportJSON(),
      id: this.__id,
      tocHidden: this.__tocHidden || undefined,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const tag = this.getTag();
    const dom = document.createElement("p");
    const className = config.theme?.heading?.[ tag ];
    if (className) {
      dom.className = className;
    }
    if (this.__id) {
      dom.id = this.__id;
    }
    return dom;
  }

  updateDOM(prevNode: AnchorHeadingNode): boolean {
    return this.getTag() !== prevNode.getTag() || this.__id !== prevNode.__id;
  }

  static importDOM(): DOMConversionMap | null {
    const tags = [ "p" ] as const;
    const map: DOMConversionMap = {};

    for (const tag of tags) {
      map[ tag ] = (node: HTMLElement) => {
        const cls = node.className || "";
        const match = cls.match(/tc-heading-(h[1-6])/);
        if (!match) return null;

        return {
          conversion: (domNode: HTMLElement): DOMConversionOutput => {
            const headingTag = match[ 1 ] as HeadingTagType;
            const lexicalNode = new AnchorHeadingNode(headingTag);
            const id = domNode.id;
            if (id) lexicalNode.__id = id;
            const align = domNode.style?.textAlign;
            if (align) lexicalNode.setFormat(align as ElementFormatType);
            if (domNode.getAttribute("data-toc-hidden") === "true") {
              lexicalNode.__tocHidden = true;
            }
            return { node: lexicalNode };
          },
          priority: 1,
        };
      };
    }

    return map;
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const tag = this.getTag();
    const element = document.createElement("p");
    element.className = `tc-heading-${tag}`;
    if (this.__id) {
      element.id = this.__id;
    }
    // Выравнивание (__format) при HTML-генерации не применяется ядром
    // автоматически (это делает реконсайлер только в редакторе), поэтому
    // переносим его в inline text-align вручную — иначе центрированный/
    // правый заголовок теряет выравнивание в HTML round-trip.
    const format = this.getFormatType();
    if (format) {
      element.style.textAlign = format;
    }
    if (this.__tocHidden) {
      element.setAttribute("data-toc-hidden", "true");
    }
    return { element };
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

