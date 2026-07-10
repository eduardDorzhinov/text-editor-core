import { addClassNamesToElement } from "@lexical/utils";
import {
  $applyNodeReplacement,
  EditorConfig,
  LexicalNode,
  SerializedTextNode,
  TextNode,
} from "lexical";

/** @noInheritDoc */
export class SpecialTextNode extends TextNode {
  static getType(): string {
    return "specialText";
  }

  static clone(node: SpecialTextNode): SpecialTextNode {
    return new SpecialTextNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("span");
    addClassNamesToElement(dom, config.theme.specialText);
    dom.textContent = this.getTextContent();
    return dom;
  }

  updateDOM(
    prevNode: this,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    if (prevNode.__text.startsWith("[") && prevNode.__text.endsWith("]")) {
      // Strip brackets again
      const strippedText = this.__text.substring(1, this.__text.length - 1);
      // Update the text content
      dom.textContent = strippedText;
    }

    addClassNamesToElement(dom, config.theme.specialText);

    return false;
  }

  static importJSON(serializedNode: SerializedTextNode): SpecialTextNode {
    return $createSpecialTextNode().updateFromJSON(serializedNode);
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextAfter(): boolean {
    // Prevents appending text to this node
    return false;
  }
}

/**
 * Creates a SpecialTextNode with the given text.
 * @param text - Text content for the SpecialTextNode.
 * @returns A new SpecialTextNode instance.
 */
export function $createSpecialTextNode(text = ""): SpecialTextNode {
  return $applyNodeReplacement(new SpecialTextNode(text));
}

/**
 * Checks if a node is a SpecialTextNode.
 * @param node - Node to check.
 * @returns True if the node is a SpecialTextNode.
 */
export function $isSpecialTextNode(node: LexicalNode | null | undefined): node is SpecialTextNode {
  return node instanceof SpecialTextNode;
}
