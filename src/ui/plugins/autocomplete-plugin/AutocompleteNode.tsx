import {
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  NodeKey,
  SerializedTextNode,
  Spread,
  TextNode,
} from "lexical";

import { uuid } from "./index";

export type SerializedAutocompleteNode = Spread<
  {
    uuid: string,
  },
  SerializedTextNode
>;

export class AutocompleteNode extends TextNode {
  __uuid: string;

  static clone(node: AutocompleteNode): AutocompleteNode {
    return new AutocompleteNode(
      node.__text, node.__uuid, node.__key,
    );
  }

  static getType(): "autocomplete" {
    return "autocomplete";
  }

  static importDOM() {
    // Never import from DOM
    return null;
  }

  static importJSON(serializedNode: SerializedAutocompleteNode): AutocompleteNode {
    return $createAutocompleteNode(serializedNode.text,
      serializedNode.uuid).updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedAutocompleteNode {
    return {
      ...super.exportJSON(),
      uuid: this.__uuid,
    };
  }

  constructor(
    text: string, uuid: string, key?: NodeKey,
  ) {
    super(text, key);
    this.__uuid = uuid;
  }

  updateDOM(
    _prevNode: this, _dom: HTMLElement, _config: EditorConfig,
  ): boolean {
    return false;
  }

  exportDOM(_: LexicalEditor): DOMExportOutput {
    return { element: null };
  }

  excludeFromCopy() {
    return true;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add(config.theme.autocomplete);
    if (this.__uuid !== uuid) {
      dom.style.display = "none";
    }
    return dom;
  }
}

export function $createAutocompleteNode(text: string,
  uuid: string): AutocompleteNode {
  return new AutocompleteNode(text, uuid).setMode("token");
}
