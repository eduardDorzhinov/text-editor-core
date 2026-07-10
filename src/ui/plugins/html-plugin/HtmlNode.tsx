import { ReactElement } from "react";

import {
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";

import { HtmlComponent } from "./HtmlComponent";

export type SerializedHtmlNode = Spread<
  {
    html: string,
  },
  SerializedLexicalNode
>;

/**
 * Блочный декоратор для произвольного HTML. Хранит исходник в __html,
 * рендерит inline в редакторе через dangerouslySetInnerHTML; превью
 * (с iframe-изоляцией) открывается через кнопку в HtmlComponent.
 *
 * Сохраняется в JSON и в HTML-экспорт через data-lexical-html-node —
 * чтобы round-trip копирование внутри редактора сохраняло блок целиком,
 * а внешний экспорт мог отдать сырой HTML.
 */
export class HtmlNode extends DecoratorNode<ReactElement> {
  __html: string;

  constructor(html: string = "", key?: NodeKey) {
    super(key);
    this.__html = html;
  }

  static getType(): string {
    return "html";
  }

  static clone(node: HtmlNode): HtmlNode {
    return new HtmlNode(node.__html, node.__key);
  }

  static importJSON(serialized: SerializedHtmlNode): HtmlNode {
    return new HtmlNode(serialized.html || "");
  }

  exportJSON(): SerializedHtmlNode {
    return {
      type: HtmlNode.getType(),
      version: 1,
      html: this.__html,
    };
  }

  isInline(): boolean {
    return false;
  }

  createDOM(): HTMLElement {
    // Внешний контейнер блока. Содержимое отрисует React-decorate.
    const dom = document.createElement("div");
    dom.className = "tc-html-node";
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("div");
    el.className = "tc-html-node";
    el.setAttribute("data-lexical-html-node", "true");
    // Внутрь — сам пользовательский HTML, чтобы внешние потребители
    // не разбирали data-атрибут, а получили готовую разметку.
    el.innerHTML = this.__html;
    return { element: el };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-html-node")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => ({
            node: new HtmlNode(el.innerHTML),
          }),
          priority: 3,
        };
      },
    };
  }

  decorate(): ReactElement {
    return (
      <HtmlComponent
        html={this.__html}
        nodeKey={this.__key}
      />
    );
  }

  getHtml(): string {
    return this.getLatest().__html;
  }

  setHtml(html: string): this {
    const self = this.getWritable();
    self.__html = html;
    return self;
  }
}

export function $createHtmlNode(html: string = ""): HtmlNode {
  return new HtmlNode(html);
}

export function $isHtmlNode(node: LexicalNode | null | undefined): node is HtmlNode {
  return node instanceof HtmlNode;
}
