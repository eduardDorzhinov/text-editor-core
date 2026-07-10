/**
 * CustomParagraphNode — подмена встроенного ParagraphNode (см.
 * model/lexical-nodes.ts). Добавляет __firstLineIndent для двухступенчатого
 * Tab: первый Tab задаёт отступ ПЕРВОЙ строки (text-indent), последующие —
 * общий отступ блока (логика в ParagraphIndentPlugin.tsx).
 *
 * getType() возвращает "custom-paragraph" (НЕ "paragraph") — иначе Lexical
 * бросит коллизию типов. Парсер обрабатывает этот тип fall-through на
 * обычный параграф. См. docs/GOTCHAS.md.
 */
import {
  $applyNodeReplacement,
  DOMConversionMap,
  EditorConfig,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  ParagraphNode,
  SerializedParagraphNode,
  Spread,
} from "lexical";

/** Базовый шаг отступа в пикселях — совпадает с `--lexical-indent-base-value`
 *  из темы (`PlaygroundEditorTheme.scss`), чтобы first-line indent визуально
 *  был соразмерен block-indent'у. */
const FIRST_LINE_INDENT_UNIT_PX = 40;

export type SerializedCustomParagraphNode = Spread<
  { firstLineIndent?: number },
  SerializedParagraphNode
>;

/**
 * ParagraphNode с дополнительным «отступом первой строки» (`text-indent`).
 *
 * Поведение Tab/Shift+Tab привязано к нему:
 *  - первый Tab — `firstLineIndent: 0 → 1`;
 *  - следующие Tab'ы — обычный INDENT_CONTENT_COMMAND (__indent +1);
 *  - Shift+Tab сначала снимает first-line, потом — OUTDENT_CONTENT_COMMAND.
 *
 * Это даёт типографское поведение «красная строка» отдельно от блочного
 * отступа всего абзаца — как в Word/Google Docs.
 */
export class CustomParagraphNode extends ParagraphNode {
  __firstLineIndent: number = 0;

  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    // Уникальный тип, чтобы прошла проверка errorOnTypeKlassMismatch
    // в Lexical (нельзя зарегистрировать два узла с одним type'ом —
    // ParagraphNode уже занимает "paragraph"). В JSON пишется
    // "custom-paragraph"; парсер обрабатывает оба значения как один тип.
    return "custom-paragraph";
  }

  static clone(node: CustomParagraphNode): CustomParagraphNode {
    const next = new CustomParagraphNode(node.__key);
    next.__firstLineIndent = node.__firstLineIndent;
    return next;
  }

  // HTML-импорт: дочитываем inline text-indent (его пишет createDOM/exportDOM)
  // обратно в __firstLineIndent. Базовый $convertParagraphElement читает только
  // padding-inline-start, поэтому без обёртки отступ первой строки терялся.
  static importDOM(): DOMConversionMap | null {
    const base = ParagraphNode.importDOM?.();
    const pConv = base?.p;
    if (!base || !pConv) return base ?? null;
    return {
      ...base,
      p: (domNode: HTMLElement) => {
        const conv = pConv(domNode);
        if (!conv || !conv.conversion) return null;
        const originalConversion = conv.conversion;
        return {
          ...conv,
          conversion: (el: HTMLElement) => {
            const output = originalConversion(el);
            const node = output?.node;
            if (node && !Array.isArray(node) && $isCustomParagraphNode(node)) {
              const ti = parseFloat(el.style?.textIndent || "");
              if (Number.isFinite(ti) && ti > 0) {
                node.setFirstLineIndent(Math.round(ti / FIRST_LINE_INDENT_UNIT_PX));
              }
            }
            return output;
          },
        };
      },
    };
  }

  static importJSON(serialized: SerializedCustomParagraphNode): CustomParagraphNode {
    return $createCustomParagraphNode().updateFromJSON(serialized);
  }

  updateFromJSON(serialized: LexicalUpdateJSON<SerializedCustomParagraphNode>): this {
    const self = super.updateFromJSON(serialized);
    if (typeof serialized.firstLineIndent === "number") {
      self.setFirstLineIndent(serialized.firstLineIndent);
    }
    return self;
  }

  exportJSON(): SerializedCustomParagraphNode {
    return {
      ...super.exportJSON(),
      // Не пишем поле при 0 — старые документы остаются без diff'а.
      firstLineIndent: this.__firstLineIndent || undefined,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    if (this.__firstLineIndent > 0) {
      dom.style.textIndent = `${this.__firstLineIndent * FIRST_LINE_INDENT_UNIT_PX}px`;
    }
    return dom;
  }

  updateDOM(
    prev: this, dom: HTMLElement, config: EditorConfig,
  ): boolean {
    const result = super.updateDOM(
      prev, dom, config,
    );
    if (prev.__firstLineIndent !== this.__firstLineIndent) {
      if (this.__firstLineIndent > 0) {
        dom.style.textIndent = `${this.__firstLineIndent * FIRST_LINE_INDENT_UNIT_PX}px`;
      } else {
        dom.style.removeProperty("text-indent");
      }
    }
    return result;
  }

  getFirstLineIndent(): number {
    return this.getLatest().__firstLineIndent;
  }

  setFirstLineIndent(value: number): this {
    const self = this.getWritable();
    (self as CustomParagraphNode).__firstLineIndent = Math.max(0, value);
    return self;
  }
}

export function $createCustomParagraphNode(): CustomParagraphNode {
  return $applyNodeReplacement(new CustomParagraphNode());
}

export function $isCustomParagraphNode(node: LexicalNode | null | undefined): node is CustomParagraphNode {
  return node instanceof CustomParagraphNode;
}
