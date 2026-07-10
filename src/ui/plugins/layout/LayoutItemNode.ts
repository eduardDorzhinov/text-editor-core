import { addClassNamesToElement } from "@lexical/utils";
import {
  $isParagraphNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedElementNode,
  Spread,
} from "lexical";

export type SerializedLayoutItemNode = Spread<
  { backgroundColor?: string | null },
  SerializedElementNode
>;

function $convertLayoutItemElement(domNode: HTMLElement): DOMConversionOutput | null {
  const bg = domNode.style.backgroundColor || null;
  return { node: $createLayoutItemNode(bg) };
}

export function $isEmptyLayoutItemNode(node: LexicalNode): boolean {
  if (!$isLayoutItemNode(node) || node.getChildrenSize() !== 1) {
    return false;
  }
  const firstChild = node.getFirstChild();
  return $isParagraphNode(firstChild) && firstChild.isEmpty();
}

export class LayoutItemNode extends ElementNode {
  /**
   * Цвет фона колонки. Хранится как CSS-значение (любая строка, валидная
   * для `background-color`). null = без фона. Применяется в createDOM,
   * exportDOM и через ColumnToolbar UI.
   */
  __backgroundColor: string | null;

  constructor(backgroundColor: string | null = null, key?: NodeKey) {
    super(key);
    this.__backgroundColor = backgroundColor;
  }

  static getType(): string {
    return "layout-item";
  }

  static clone(node: LayoutItemNode): LayoutItemNode {
    return new LayoutItemNode(node.__backgroundColor, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.setAttribute("data-lexical-layout-item", "true");
    if (typeof config.theme.layoutItem === "string") {
      addClassNamesToElement(dom, config.theme.layoutItem);
    }
    if (this.__backgroundColor) {
      dom.style.backgroundColor = this.__backgroundColor;
    }
    return dom;
  }

  updateDOM(prev: this, dom: HTMLElement): boolean {
    if (prev.__backgroundColor !== this.__backgroundColor) {
      dom.style.backgroundColor = this.__backgroundColor || "";
    }
    return false;
  }

  collapseAtStart(): boolean {
    const parent = this.getParentOrThrow();
    if (
      this.is(parent.getFirstChild()) &&
      parent.getChildren().every($isEmptyLayoutItemNode)
    ) {
      parent.remove();
      return true;
    }
    return false;
  }

  exportDOM(): DOMExportOutput {
    // Без exportDOM Lexical при копировании теряет data-атрибут — на вставке
    // обратно importDOM не находит маркер и колонка превращается в обычный
    // div. Из-за этого «копировать колонку как колонку» не работало.
    const element = document.createElement("div");
    element.setAttribute("data-lexical-layout-item", "true");
    if (this.__backgroundColor) {
      element.style.backgroundColor = this.__backgroundColor;
    }
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-layout-item")) {
          return null;
        }
        return {
          conversion: $convertLayoutItemElement,
          priority: 2,
        };
      },
    };
  }

  static importJSON(serializedNode: SerializedLayoutItemNode): LayoutItemNode {
    return $createLayoutItemNode(serializedNode.backgroundColor ?? null).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedLayoutItemNode>): this {
    const self = super.updateFromJSON(serializedNode);
    if (serializedNode.backgroundColor !== undefined) {
      self.setBackgroundColor(serializedNode.backgroundColor);
    }
    return self;
  }

  exportJSON(): SerializedLayoutItemNode {
    return {
      ...super.exportJSON(),
      // Не пишем поле, если фона нет — экономим место и не плодим diff'ы
      // на старых документах, у которых ноды без backgroundColor.
      backgroundColor: this.__backgroundColor || undefined,
    };
  }

  isShadowRoot(): boolean {
    return true;
  }

  getBackgroundColor(): string | null {
    return this.getLatest().__backgroundColor;
  }

  setBackgroundColor(color: string | null): this {
    const self = this.getWritable();
    self.__backgroundColor = color;
    return self;
  }
}

export function $createLayoutItemNode(backgroundColor: string | null = null): LayoutItemNode {
  return new LayoutItemNode(backgroundColor);
}

export function $isLayoutItemNode(node: LexicalNode | null | undefined): node is LayoutItemNode {
  return node instanceof LayoutItemNode;
}
