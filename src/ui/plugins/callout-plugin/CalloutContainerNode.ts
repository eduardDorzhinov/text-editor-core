import {
  $createParagraphNode,
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

export const CALLOUT_TYPES = [
  "info",
  "success",
  "warning",
  "error",
  "tip",
] as const;

export type CalloutType = typeof CALLOUT_TYPES[ number ];

type SerializedCalloutContainerNode = Spread<
  { calloutType: CalloutType },
  SerializedElementNode
>;

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: "\u2139\uFE0F",
  success: "\u2705",
  warning: "\u26A0\uFE0F",
  error: "\u274C",
  tip: "\uD83D\uDCA1",
};

export class CalloutContainerNode extends ElementNode {
  __calloutType: CalloutType;

  constructor(calloutType: CalloutType = "info", key?: NodeKey) {
    super(key);
    this.__calloutType = calloutType;
  }

  static getType(): string {
    return "callout-container";
  }

  static clone(node: CalloutContainerNode): CalloutContainerNode {
    return new CalloutContainerNode(node.__calloutType, node.__key);
  }

  isShadowRoot(): boolean {
    return true;
  }

  collapseAtStart(_selection: RangeSelection): boolean {
    const nodesToInsert: LexicalNode[] = [];
    for (const child of this.getChildren()) {
      if ($isElementNode(child)) {
        nodesToInsert.push(...child.getChildren());
      } else {
        nodesToInsert.push(child);
      }
    }
    const caret = $rewindSiblingCaret($getSiblingCaret(this, "previous"));
    caret.splice(1, nodesToInsert);

    const [ firstChild ] = nodesToInsert;
    if (firstChild) {
      firstChild.selectStart().deleteCharacter(true);
    }
    return true;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.classList.add("tc-callout", `tc-callout--${this.__calloutType}`);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement): boolean {
    if (prevNode.__calloutType !== this.__calloutType) {
      dom.classList.remove(`tc-callout--${prevNode.__calloutType}`);
      dom.classList.add(`tc-callout--${this.__calloutType}`);
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("tc-callout")) {
          return null;
        }
        return {
          conversion: $convertCalloutElement,
          priority: 2,
        };
      },
    };
  }

  static importJSON(serialized: SerializedCalloutContainerNode): CalloutContainerNode {
    return $createCalloutContainerNode(serialized.calloutType).updateFromJSON(serialized);
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.classList.add("tc-callout", `tc-callout--${this.__calloutType}`);
    element.setAttribute("data-callout-type", this.__calloutType);
    return { element };
  }

  exportJSON(): SerializedCalloutContainerNode {
    return {
      ...super.exportJSON(),
      calloutType: this.__calloutType,
    };
  }

  getCalloutType(): CalloutType {
    return this.getLatest().__calloutType;
  }

  setCalloutType(type: CalloutType): void {
    this.getWritable().__calloutType = type;
  }

  getIcon(): string {
    return CALLOUT_ICONS[ this.__calloutType ];
  }
}

function $convertCalloutElement(domNode: HTMLElement): DOMConversionOutput | null {
  let calloutType: CalloutType = "info";
  const dataType = domNode.getAttribute("data-callout-type");
  if (dataType && CALLOUT_TYPES.includes(dataType as CalloutType)) {
    calloutType = dataType as CalloutType;
  } else {
    for (const t of CALLOUT_TYPES) {
      if (domNode.classList.contains(`tc-callout--${t}`)) {
        calloutType = t;
        break;
      }
    }
  }

  return {
    node: $createCalloutContainerNode(calloutType).append($createParagraphNode()),
  };
}

export function $createCalloutContainerNode(calloutType: CalloutType = "info"): CalloutContainerNode {
  return new CalloutContainerNode(calloutType);
}

export function $isCalloutContainerNode(node: LexicalNode | null | undefined): node is CalloutContainerNode {
  return node instanceof CalloutContainerNode;
}
