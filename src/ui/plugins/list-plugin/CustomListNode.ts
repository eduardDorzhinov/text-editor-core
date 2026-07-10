import {
  type ListType,
  type SerializedListNode,
  ListNode,
} from "@lexical/list";
import {
  type DOMConversionMap,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type Spread,
  $applyNodeReplacement,
} from "lexical";

import { resolveBulletStyle } from "@/parser";

export type BulletStyle =
  | "disc" |
  "circle" |
  "square" |
  "none" |
  "'—'" |
  "'→'" |
  "'★'" |
  "'✓'" |
  string;

export type SerializedCustomListNode = Spread<
  { bulletStyle?: string },
  SerializedListNode
>;

/**
 * Расширение стандартного ListNode с возможностью хранить
 * собственный bullet-стиль для конкретного маркированного списка
 * (per-level — каждый вложенный <ul> = отдельный ListNode).
 *
 * Стиль применяется только когда listType === "bullet".
 * Для "number"-списков нумерация строится через CSS counters
 * в теме (поэтому здесь поле не используется).
 */
export class CustomListNode extends ListNode {
  __bulletStyle?: string;

  constructor(
    listType: ListType,
    start: number,
    bulletStyle?: string,
    key?: NodeKey,
  ) {
    super(
      listType, start, key,
    );
    this.__bulletStyle = bulletStyle;
  }

  static getType(): string {
    // Уникальный тип, чтобы прошла проверка errorOnTypeKlassMismatch
    // в Lexical dev-режиме. В JSON пишется именно "custom-list"; парсер
    // превью обрабатывает и "list", и "custom-list" как один тип.
    return "custom-list";
  }

  static clone(node: CustomListNode): CustomListNode {
    return new CustomListNode(
      node.getListType(),
      node.getStart(),
      node.__bulletStyle,
      node.__key,
    );
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const dom = super.createDOM(config, editor);
    this.__applyBulletStyle(dom);
    return dom;
  }

  updateDOM(
    prev: this,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const baseResult = super.updateDOM(
      prev, dom, config,
    );
    if (prev.__bulletStyle !== this.__bulletStyle) {
      this.__applyBulletStyle(dom);
    }
    return baseResult;
  }

  private __applyBulletStyle(dom: HTMLElement): void {
    if (this.getListType() === "bullet" && this.__bulletStyle) {
      // resolveBulletStyle добавляет боковой отступ узким глифам (→, ★).
      dom.style.listStyleType = resolveBulletStyle(this.__bulletStyle) ?? "";
    } else {
      dom.style.listStyleType = "";
    }
  }

  // HTML-импорт: дочитываем inline list-style-type (его пишет createDOM/
  // exportDOM для bullet-списков) обратно в __bulletStyle. Базовый
  // $convertListNode этого не делает, поэтому без обёртки кастомный маркер
  // терялся при HTML-вставке.
  static importDOM(): DOMConversionMap | null {
    const base = ListNode.importDOM?.();
    if (!base) return null;
    const result: DOMConversionMap = { ...base };
    for (const tag of [ "ul", "ol" ] as const) {
      const orig = base[ tag ];
      if (!orig) continue;
      result[ tag ] = (domNode: HTMLElement) => {
        const conv = orig(domNode);
        if (!conv || !conv.conversion) return null;
        const originalConversion = conv.conversion;
        return {
          ...conv,
          conversion: (el: HTMLElement) => {
            const output = originalConversion(el);
            const node = output?.node;
            if (node && !Array.isArray(node) && $isCustomListNode(node)) {
              const lst = el.style?.listStyleType;
              if (lst && node.getListType() === "bullet") {
                node.setBulletStyle(lst);
              }
            }
            return output;
          },
        };
      };
    }
    return result;
  }

  static importJSON(serialized: SerializedCustomListNode): CustomListNode {
    return $createCustomListNode(
      serialized.listType,
      serialized.start,
      serialized.bulletStyle,
    ).updateFromJSON(serialized);
  }

  updateFromJSON(serialized: LexicalUpdateJSON<SerializedCustomListNode>): this {
    const self = super.updateFromJSON(serialized) as this;
    if (serialized.bulletStyle !== undefined) {
      return self.setBulletStyle(serialized.bulletStyle);
    }
    return self;
  }

  exportJSON(): SerializedCustomListNode {
    // type здесь = "custom-list" (из super.exportJSON() → getType()),
    // менять его нельзя — Lexical проверяет соответствие с getType().
    // Парсер превью обрабатывает и "list", и "custom-list" как один тип.
    return {
      ...super.exportJSON(),
      bulletStyle: this.__bulletStyle,
    };
  }

  getBulletStyle(): string | undefined {
    return this.getLatest().__bulletStyle;
  }

  setBulletStyle(style: string | undefined): this {
    const self = this.getWritable() as this;
    self.__bulletStyle = style;
    return self;
  }
}

export function $createCustomListNode(
  listType: ListType,
  start: number = 1,
  bulletStyle?: string,
): CustomListNode {
  return $applyNodeReplacement(new CustomListNode(
    listType, start, bulletStyle,
  ));
}

export function $isCustomListNode(node: LexicalNode | null | undefined): node is CustomListNode {
  return node instanceof CustomListNode;
}
