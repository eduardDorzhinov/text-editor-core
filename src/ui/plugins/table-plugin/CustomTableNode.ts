/**
 * CustomTableNode — подмена встроенного TableNode. Добавляет widthMode
 * ("full" | "fixed") и equalColumns.
 *
 * Подводный камень: нода рендерит скроллируемую обёртку <div> вокруг <table>,
 * а CSS-селекторы ([data-width-mode="full"]) бьют по самой таблице. Поэтому
 * __applyAttributes сначала находит элемент <table>
 * (dom.tagName === "TABLE" ? dom : dom.querySelector("table")) и ставит
 * data-width-mode / data-equal-columns именно на него. См. docs/GOTCHAS.md.
 */
import {
  type SerializedTableNode,
  TableNode,
} from "@lexical/table";
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

export type TableWidthMode = "full" | "fixed";

export type SerializedCustomTableNode = Spread<{
  widthMode?: TableWidthMode,
  equalColumns?: boolean,
}, SerializedTableNode>;

/**
 * Расширенный TableNode с двумя дополнительными полями:
 *  - __widthMode: "full" (100% контейнера) | "fixed" (ширина по colWidths)
 *  - __equalColumns: при true колонки равны (colWidths игнорируется визуально);
 *                    сбрасывается в false при первом ресайзе.
 */
export class CustomTableNode extends TableNode {
  __widthMode: TableWidthMode;
  __equalColumns: boolean;

  constructor(
    widthMode: TableWidthMode = "full",
    equalColumns: boolean = true,
    key?: NodeKey,
  ) {
    super(key);
    this.__widthMode = widthMode;
    this.__equalColumns = equalColumns;
  }

  static getType(): string {
    // Свой тип — иначе registered-klass mismatch при subclass + replacement.
    // В preview-парсере смотрим оба типа.
    return "custom-table";
  }

  static clone(node: CustomTableNode): CustomTableNode {
    const cloned = new CustomTableNode(
      node.__widthMode,
      node.__equalColumns,
      node.__key,
    );
    // Перенос внутренних полей TableNode (rowStriping/frozen и т.д.) делает super.clone,
    // но мы клонируем напрямую — копируем явно.
    cloned.__colWidths = node.__colWidths;
    cloned.__rowStriping = node.__rowStriping;
    cloned.__frozenColumnCount = node.__frozenColumnCount;
    cloned.__frozenRowCount = node.__frozenRowCount;
    return cloned;
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const dom = super.createDOM(config, editor);
    this.__applyAttributes(dom);
    this.__applyWidth(dom);
    return dom;
  }

  updateDOM(
    prev: this, dom: HTMLElement, config: EditorConfig,
  ): boolean {
    const baseResult = super.updateDOM(
      prev, dom, config,
    );
    if (
      prev.__widthMode !== this.__widthMode ||
      prev.__equalColumns !== this.__equalColumns
    ) {
      this.__applyAttributes(dom);
    }
    // colWidths меняется через setColWidths(TableNode) и любой мутации
    // writable-копии. Просто всегда переприменяем ширину таблицы.
    this.__applyWidth(dom);
    return baseResult;
  }

  private __applyAttributes(dom: HTMLElement): void {
    // data-* атрибуты ДОЛЖНЫ быть на самом <table>, т.к. CSS-селекторы
    // вида `.table[data-width-mode="full"]` (table-layout: fixed) таргетят
    // таблицу. При hasHorizontalScroll super.createDOM возвращает
    // div.tableScrollableWrapper, а не <table> — поэтому ищем реальный
    // <table> внутри. Раньше атрибуты вешались на wrapper, селекторы не
    // матчились, table-layout: fixed не применялся, и в режиме
    // full+equalColumns (без colWidths) колонки растягивались по контенту.
    const tableEl = dom.tagName === "TABLE" ?
      dom :
      dom.querySelector("table");
    if (tableEl) {
      tableEl.setAttribute("data-width-mode", this.__widthMode);
      tableEl.setAttribute("data-equal-columns", String(this.__equalColumns));
    }
  }

  /**
   * В режиме "fixed" таблица должна занимать ширину = sum(colWidths),
   * иначе table-layout: fixed без явной ширины деградирует к auto и
   * <col width> из colgroup перестают работать предсказуемо.
   *
   * Правую границу даёт сама table (border-right в CSS), поэтому
   * добавлять +1px на ширину не нужно.
   *
   * В режиме "full" ширину задаёт CSS (100%) — снимаем inline width.
   *
   * ВАЖНО: при включённой scrollable-обёртке Lexical (hasHorizontalScroll)
   * createDOM возвращает <div class="tableScrollableWrapper">, а не <table>.
   * Ставить style.width на обёртку нельзя — она и так должна занимать
   * ширину контейнера и скроллить таблицу внутри. Поэтому ищем настоящий
   * <table> и стилизуем именно его.
   */
  private __applyWidth(dom: HTMLElement): void {
    const tableEl = dom.tagName === "TABLE" ?
      dom :
      dom.querySelector("table");
    if (!tableEl) return;

    if (this.__widthMode === "fixed") {
      const colWidths = this.__colWidths;
      if (colWidths && colWidths.length > 0) {
        const total = colWidths.reduce((s, w) => s + (w || 0), 0);
        if (total > 0) {
          (tableEl as HTMLElement).style.width = `${total}px`;
          return;
        }
      }
    }
    (tableEl as HTMLElement).style.width = "";
  }

  // HTML-импорт: базовый TableNode.importDOM строит строки/ячейки, но не
  // знает про наши data-width-mode/data-equal-columns (они на <table>).
  // Оборачиваем его конвертер и дочитываем атрибуты в созданную ноду
  // (через replacement это уже CustomTableNode). Иначе при HTML-вставке
  // режимы таблицы сбрасываются на дефолт full/equalColumns.
  static importDOM(): DOMConversionMap | null {
    const base = TableNode.importDOM?.();
    const tableConv = base?.table;
    if (!base || !tableConv) return base ?? null;
    return {
      ...base,
      table: (domNode: HTMLElement) => {
        const conv = tableConv(domNode);
        if (!conv || !conv.conversion) return null;
        const originalConversion = conv.conversion;
        return {
          ...conv,
          conversion: (el: HTMLElement) => {
            const output = originalConversion(el);
            const node = output?.node;
            if (node && !Array.isArray(node) && $isCustomTableNode(node)) {
              const wm = el.getAttribute("data-width-mode");
              if (wm === "full" || wm === "fixed") node.__widthMode = wm;
              const eq = el.getAttribute("data-equal-columns");
              if (eq !== null) node.__equalColumns = eq === "true";
            }
            return output;
          },
        };
      },
    };
  }

  static importJSON(json: SerializedCustomTableNode): CustomTableNode {
    return $createCustomTableNode(json.widthMode ?? "full",
      json.equalColumns ?? true).updateFromJSON(json);
  }

  updateFromJSON(json: LexicalUpdateJSON<SerializedCustomTableNode>): this {
    const self = super.updateFromJSON(json) as this;
    if (json.widthMode !== undefined) self.setWidthMode(json.widthMode);
    if (json.equalColumns !== undefined) self.setEqualColumns(json.equalColumns);
    return self;
  }

  exportJSON(): SerializedCustomTableNode {
    return {
      ...super.exportJSON(),
      widthMode: this.__widthMode,
      equalColumns: this.__equalColumns,
    };
  }

  getWidthMode(): TableWidthMode {
    return this.getLatest().__widthMode;
  }

  setWidthMode(mode: TableWidthMode): this {
    const self = this.getWritable() as this;
    self.__widthMode = mode;
    return self;
  }

  toggleWidthMode(): this {
    return this.setWidthMode(this.getWidthMode() === "full" ?
      "fixed" :
      "full");
  }

  isEqualColumns(): boolean {
    return this.getLatest().__equalColumns;
  }

  setEqualColumns(equal: boolean): this {
    const self = this.getWritable() as this;
    self.__equalColumns = equal;
    return self;
  }
}

export function $createCustomTableNode(widthMode: TableWidthMode = "full",
  equalColumns: boolean = true): CustomTableNode {
  return $applyNodeReplacement(new CustomTableNode(widthMode, equalColumns));
}

export function $isCustomTableNode(node: LexicalNode | null | undefined): node is CustomTableNode {
  return node instanceof CustomTableNode;
}
