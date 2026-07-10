import { ReactElement } from "react";

import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  DecoratorNode,
} from "lexical";

import { AuthorQuoteAuthorComponent } from "./AuthorQuoteAuthorComponent";

export type SerializedAuthorQuoteAuthorNode = Spread<{
  type: "author-quote-author",
  version: 1,
  name: string,
  title: string,
  avatarSrc: string,
}, SerializedLexicalNode>;

/**
 * Блок автора цитаты — DecoratorNode для редактируемого UI
 * (avatar upload, поля имени и должности).
 */
export class AuthorQuoteAuthorNode extends DecoratorNode<ReactElement> {
  __name: string;
  __title: string;
  __avatarSrc: string;

  constructor(
    name: string = "",
    title: string = "",
    avatarSrc: string = "",
    key?: NodeKey,
  ) {
    super(key);
    this.__name = name;
    this.__title = title;
    this.__avatarSrc = avatarSrc;
  }

  static getType(): string {
    return "author-quote-author";
  }

  static clone(node: AuthorQuoteAuthorNode): AuthorQuoteAuthorNode {
    return new AuthorQuoteAuthorNode(
      node.__name,
      node.__title,
      node.__avatarSrc,
      node.__key,
    );
  }

  static importJSON(json: SerializedAuthorQuoteAuthorNode): AuthorQuoteAuthorNode {
    return new AuthorQuoteAuthorNode(
      json.name,
      json.title,
      json.avatarSrc,
    );
  }

  exportJSON(): SerializedAuthorQuoteAuthorNode {
    return {
      ...super.exportJSON(),
      type: "author-quote-author",
      version: 1,
      name: this.__name,
      title: this.__title,
      avatarSrc: this.__avatarSrc,
    };
  }

  isInline(): boolean {
    return false;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("figcaption");
    dom.className = "tc-author-quote__author";
    dom.setAttribute("data-author-quote-author", "true");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      figcaption: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-author-quote-author")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            const img = el.querySelector("img");
            const nameEl = el.querySelector("[data-author-name]");
            const titleEl = el.querySelector("[data-author-title]");
            return {
              node: new AuthorQuoteAuthorNode(
                nameEl?.textContent ?? "",
                titleEl?.textContent ?? "",
                img?.getAttribute("src") ?? "",
              ),
            };
          },
          priority: 1,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("figcaption");
    el.className = "tc-author-quote__author";
    el.setAttribute("data-author-quote-author", "true");
    if (this.__avatarSrc) {
      const img = document.createElement("img");
      img.src = this.__avatarSrc;
      img.alt = this.__name;
      img.className = "tc-author-quote__avatar";
      el.appendChild(img);
    }
    const info = document.createElement("span");
    info.className = "tc-author-quote__author-info";
    if (this.__name) {
      const name = document.createElement("strong");
      name.textContent = this.__name;
      name.setAttribute("data-author-name", "true");
      info.appendChild(name);
    }
    if (this.__title) {
      const title = document.createElement("span");
      title.textContent = this.__title;
      title.setAttribute("data-author-title", "true");
      info.appendChild(title);
    }
    el.appendChild(info);
    return { element: el };
  }

  getName(): string {
    return this.getLatest().__name;
  }
  getAuthorTitle(): string {
    return this.getLatest().__title;
  }
  getAvatarSrc(): string {
    return this.getLatest().__avatarSrc;
  }

  setName(name: string): void {
    this.getWritable().__name = name;
  }
  setAuthorTitle(title: string): void {
    this.getWritable().__title = title;
  }
  setAvatarSrc(src: string): void {
    this.getWritable().__avatarSrc = src;
  }

  decorate(): ReactElement {
    return (
      <AuthorQuoteAuthorComponent
        avatarSrc={this.__avatarSrc}
        name={this.__name}
        nodeKey={this.__key}
        title={this.__title}
      />
    );
  }
}

export function $createAuthorQuoteAuthorNode(
  name: string = "",
  title: string = "",
  avatarSrc: string = "",
): AuthorQuoteAuthorNode {
  return new AuthorQuoteAuthorNode(
    name, title, avatarSrc,
  );
}

export function $isAuthorQuoteAuthorNode(node: LexicalNode | null | undefined): node is AuthorQuoteAuthorNode {
  return node instanceof AuthorQuoteAuthorNode;
}
