import { addClassNamesToElement } from "@lexical/utils";
import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalNode,
  SerializedElementNode,
} from "lexical";

/**
 * Содержимое цитаты — обычный ElementNode, внутри живут абзацы,
 * списки, ссылки, видео и т.п. Просто <blockquote>-обёртка.
 */
export class AuthorQuoteContentNode extends ElementNode {
  static getType(): string {
    return "author-quote-content";
  }

  static clone(node: AuthorQuoteContentNode): AuthorQuoteContentNode {
    return new AuthorQuoteContentNode(node.__key);
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("blockquote");
    addClassNamesToElement(dom, "tc-author-quote__content");
    dom.setAttribute("data-author-quote-content", "true");
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("blockquote");
    element.className = "tc-author-quote__content";
    element.setAttribute("data-author-quote-content", "true");
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      blockquote: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-author-quote-content")) return null;
        return {
          conversion: (): DOMConversionOutput => ({ node: $createAuthorQuoteContentNode() }),
          priority: 2,
        };
      },
    };
  }

  static importJSON(json: SerializedElementNode): AuthorQuoteContentNode {
    return $createAuthorQuoteContentNode().updateFromJSON(json);
  }

  canBeEmpty(): boolean {
    return false;
  }

  /**
   * Помечаем как shadow root. Это нужно, чтобы `@lexical/list` корректно
   * обрабатывал Enter на пустом элементе списка: его handler ищет
   * `$isRootOrShadowRoot(grandparent)`, и без этого «выход из списка»
   * срабатывает только когда список лежит на корне документа.
   */
  isShadowRoot(): boolean {
    return true;
  }
}

export function $createAuthorQuoteContentNode(): AuthorQuoteContentNode {
  return new AuthorQuoteContentNode();
}

export function $isAuthorQuoteContentNode(node: LexicalNode | null | undefined): node is AuthorQuoteContentNode {
  return node instanceof AuthorQuoteContentNode;
}
