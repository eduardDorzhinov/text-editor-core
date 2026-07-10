import { IS_CHROME } from "@lexical/utils";
import {
  $getSiblingCaret,
  $isElementNode,
  $rewindSiblingCaret,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SerializedElementNode,
  Spread,
} from "lexical";

type SerializedCollapsibleContainerNode = Spread<
  {
    open: boolean,
  },
  SerializedElementNode
>;

export function $convertDetailsElement(domNode: HTMLDetailsElement): DOMConversionOutput | null {
  const isOpen = domNode.open !== undefined ?
    domNode.open :
    true;
  const node = $createCollapsibleContainerNode(isOpen);
  return {
    node,
  };
}

export class CollapsibleContainerNode extends ElementNode {
  __open: boolean;

  constructor(open: boolean, key?: NodeKey) {
    super(key);
    // __open — реальное значение «свёрнут ли в ПРЕВЬЮ». В редакторе контент
    // всегда виден (createDOM/updateDOM рендерят открытым независимо от
    // __open) — скрывать его в редакторе нельзя. А в превью аккордеон
    // сворачивается по этому флагу.
    this.__open = open;
  }

  static getType(): string {
    return "collapsible-container";
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  isShadowRoot(): boolean {
    return true;
  }

  collapseAtStart(_selection: RangeSelection): boolean {
    // Unwrap the CollapsibleContainerNode by replacing it with the children
    // of its children (CollapsibleTitleNode, CollapsibleContentNode)
    const nodesToInsert: LexicalNode[] = [];
    for (const child of this.getChildren()) {
      if ($isElementNode(child)) {
        nodesToInsert.push(...child.getChildren());
      }
    }
    const caret = $rewindSiblingCaret($getSiblingCaret(this, "previous"));
    caret.splice(1, nodesToInsert);
    // Merge the first child of the CollapsibleTitleNode with the
    // previous sibling of the CollapsibleContainerNode
    const [ firstChild ] = nodesToInsert;
    if (firstChild) {
      firstChild.selectStart().deleteCharacter(true);
    }
    return true;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    // details is not well supported in Chrome #5582
    let dom: HTMLElement;
    if (IS_CHROME) {
      dom = document.createElement("div");
      dom.setAttribute("open", "");
    } else {
      const detailsDom = document.createElement("details");
      detailsDom.open = true;
      // Запрет сворачивания: если браузер закрыл <details> по клику на
      // summary — сразу открываем обратно, контент нельзя скрыть.
      detailsDom.addEventListener("toggle", () => {
        if (!detailsDom.open) detailsDom.open = true;
      });
      dom = detailsDom;
    }
    dom.classList.add("edt_collapsible__container");

    return dom;
  }

  updateDOM(_prevNode: this, dom: HTMLElement): boolean {
    // Всегда раскрыт — контент не прячем.
    dom.setAttribute("open", "");
    if (dom instanceof HTMLDetailsElement) dom.open = true;
    return false;
  }

  static importDOM(): DOMConversionMap<HTMLDetailsElement> | null {
    return {
      details: (_domNode: HTMLDetailsElement) => {
        return {
          conversion: $convertDetailsElement,
          priority: 1,
        };
      },
    };
  }

  static importJSON(serializedNode: SerializedCollapsibleContainerNode): CollapsibleContainerNode {
    return $createCollapsibleContainerNode(serializedNode.open).updateFromJSON(serializedNode);
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("details");
    element.classList.add("edt_collapsible__container");
    // `open` — булев HTML-атрибут: важно само НАЛИЧИЕ, а не значение.
    // setAttribute("open", "false") при реимпорте даёт domNode.open === true,
    // и свёрнутый аккордеон раскрывается. Поэтому ставим атрибут только
    // когда открыт, иначе не ставим вовсе.
    if (this.__open) {
      element.setAttribute("open", "");
    }
    return { element };
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      open: this.__open,
    };
  }

  setOpen(open: boolean): void {
    const writable = this.getWritable();
    writable.__open = open;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen());
  }
}

export function $createCollapsibleContainerNode(isOpen: boolean): CollapsibleContainerNode {
  return new CollapsibleContainerNode(isOpen);
}

export function $isCollapsibleContainerNode(node: LexicalNode | null | undefined): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}
