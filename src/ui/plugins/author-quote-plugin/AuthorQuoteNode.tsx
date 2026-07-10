import { addClassNamesToElement } from "@lexical/utils";
import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  $createParagraphNode,
  $createTextNode,
  ElementNode,
} from "lexical";

import {
  $createAuthorQuoteAuthorNode,
  $isAuthorQuoteAuthorNode,
  AuthorQuoteAuthorNode,
} from "./AuthorQuoteAuthorNode";
import { $createAuthorQuoteContentNode } from "./AuthorQuoteContentNode";

/**
 * Старая форма JSON (когда AuthorQuoteNode был DecoratorNode со строкой
 * __quote и плоскими полями автора). Используем при загрузке для миграции.
 */
type LegacyShape = {
  quote?: string,
  showAuthor?: boolean,
  authorName?: string,
  authorTitle?: string,
  avatarSrc?: string,
};

/**
 * Контейнер цитаты — ElementNode. Внутри живут:
 *  - AuthorQuoteContentNode (обязателен, всегда первый)
 *  - AuthorQuoteAuthorNode (опционально, последний)
 * Контент свободно редактируется как обычный rich-text — туда можно
 * вставлять списки, ссылки, видео, картинки и т.п.
 */
export class AuthorQuoteNode extends ElementNode {
  static getType(): string {
    return "author-quote";
  }

  static clone(node: AuthorQuoteNode): AuthorQuoteNode {
    return new AuthorQuoteNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  isShadowRoot(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return false;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("figure");
    addClassNamesToElement(dom, "tc-author-quote");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("figure");
    element.className = "tc-author-quote";
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      figure: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("tc-author-quote")) return null;
        return {
          conversion: (): DOMConversionOutput => ({ node: $createAuthorQuoteNode() }),
          priority: 1,
        };
      },
    };
  }

  static importJSON(json: SerializedElementNode & LegacyShape): AuthorQuoteNode {
    const node = $createAuthorQuoteNode();
    // Бэк-совмещение: старый формат хранил quote как строку и поля автора плоско.
    // Если children отсутствуют — собираем структуру руками из legacy-полей.
    if (!Array.isArray(json.children) && typeof json.quote === "string") {
      const content = $createAuthorQuoteContentNode();
      const paragraph = $createParagraphNode();
      if (json.quote) {
        paragraph.append($createTextNode(json.quote));
      }
      content.append(paragraph);
      node.append(content);
      const hasAuthor = json.showAuthor ?? (!!json.authorName || !!json.avatarSrc);
      if (hasAuthor) {
        node.append($createAuthorQuoteAuthorNode(
          json.authorName ?? "",
          json.authorTitle ?? "",
          json.avatarSrc ?? "",
        ));
      }
    }
    return node.updateFromJSON(json);
  }

  exportJSON(): SerializedElementNode {
    return { ...super.exportJSON() };
  }

  /** Есть ли у цитаты блок автора. */
  hasAuthor(): boolean {
    return this.getLatest().getChildren()
      .some($isAuthorQuoteAuthorNode);
  }

  /** Найти существующий блок автора. */
  getAuthorNode(): AuthorQuoteAuthorNode | null {
    const child = this.getLatest().getChildren()
      .find($isAuthorQuoteAuthorNode);
    return child ?? null;
  }
}

export function $createAuthorQuoteNode(): AuthorQuoteNode {
  return new AuthorQuoteNode();
}

export function $isAuthorQuoteNode(node: LexicalNode | null | undefined): node is AuthorQuoteNode {
  return node instanceof AuthorQuoteNode;
}
