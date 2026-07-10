import {
  $createParagraphNode,
  $isElementNode,
  buildImportMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalNode,
  RangeSelection,
} from "lexical";

import { $isCollapsibleContainerNode } from "./CollapsibleContainerNode";
import { $isCollapsibleContentNode } from "./CollapsibleContentNode";

export function $convertSummaryElement(_domNode: HTMLElement): DOMConversionOutput | null {
  const node = $createCollapsibleTitleNode();
  return {
    node,
  };
}

/** @noInheritDoc */
export class CollapsibleTitleNode extends ElementNode {
  /** @internal */
  $config() {
    return this.config("collapsible-title", {
      $transform(node: CollapsibleTitleNode) {
        if (node.isEmpty()) {
          node.remove();
        }
      },
      extends: ElementNode,
      importDOM: buildImportMap({
        summary: () => ({
          conversion: $convertSummaryElement,
          priority: 1,
        }),
      }),
    });
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("summary");
    dom.classList.add("edt_collapsible__title");
    // Клик по заголовку НЕ сворачивает аккордеон — контент нельзя скрыть.
    return dom;
  }

  updateDOM(_prevNode: this, _dom: HTMLElement): boolean {
    return false;
  }

  // Симметрично importDOM(summary) из $config — без exportDOM ядро при
  // HTML-генерации делало обёртку по дефолту ElementNode (без <summary>),
  // и заголовок аккордеона при реимпорте не опознавался.
  exportDOM(): DOMExportOutput {
    const element = document.createElement("summary");
    element.classList.add("edt_collapsible__title");
    return { element };
  }

  insertNewAfter(_: RangeSelection, restoreSelection = true): ElementNode {
    const containerNode = this.getParentOrThrow();

    if (!$isCollapsibleContainerNode(containerNode)) {
      throw new Error("CollapsibleTitleNode expects to be child of CollapsibleContainerNode");
    }

    if (containerNode.getOpen()) {
      const contentNode = this.getNextSibling();
      if (!$isCollapsibleContentNode(contentNode)) {
        throw new Error("CollapsibleTitleNode expects to have CollapsibleContentNode sibling");
      }

      const firstChild = contentNode.getFirstChild();
      if ($isElementNode(firstChild)) {
        return firstChild;
      } else {
        const paragraph = $createParagraphNode();
        contentNode.append(paragraph);
        return paragraph;
      }
    } else {
      const paragraph = $createParagraphNode();
      containerNode.insertAfter(paragraph, restoreSelection);
      return paragraph;
    }
  }
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  return new CollapsibleTitleNode();
}

export function $isCollapsibleTitleNode(node: LexicalNode | null | undefined): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}
