/**
 * Ресайз колонок таблицы.
 *
 * Подводный камень: при table-layout: fixed ширина таблицы =
 * max(заданная, Σ ширин колонок), а border-collapse + округление до субпикселя
 * даёт сумму прямоугольников ячеек чуть больше ширины таблицы → правая граница
 * уезжает за вьюпорт. Поэтому readColWidthsFromDOM НОРМАЛИЗУЕТ сумму ширин к
 * ширине контента редактора (getEditorContentWidth): масштабирует все колонки,
 * остаток округления забирает последняя колонка. См. docs/GOTCHAS.md.
 */
import {
  CSSProperties,
  PointerEventHandler,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import {
  type TableCellNode,
  type TableDOMCell,
  type TableMapType,
  $computeTableMapSkipCellCheck,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableRowNode,
  getDOMCellFromTarget,
  getTableElement,
  TableNode,
} from "@lexical/table";
import { calculateZoomLevel } from "@lexical/utils";
import {
  $getNearestNodeFromDOMNode,
  isHTMLElement,
  LexicalEditor,
  NodeKey,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from "lexical";

import { $isCustomTableNode } from "@/ui/plugins/table-plugin";
import { useScopedPortal } from "@/vendor/shared";

import "./index.scss";

/**
 * Возвращает ширину контента редактора без padding'а.
 * clientWidth включает padding, а у ContentEditable обычно большие
 * горизонтальные отступы — без вычитания таблица будет «помещаться»
 * до тех пор, пока её правая граница не наедет на padding-area.
 */
function getEditorContentWidth(editor: LexicalEditor): number {
  const root = editor.getRootElement();
  if (!root) return Infinity;
  const cs = getComputedStyle(root);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  return Math.max(0, root.clientWidth - padL - padR - 1);
}

function readColWidthsFromDOM(
  tableNode: TableNode,
  editor: LexicalEditor,
  numColumns: number,
): number[] {
  const tableEl = editor.getElementByKey(tableNode.getKey());
  const firstRow = tableEl?.querySelector("tr");
  if (!firstRow) return Array(numColumns).fill(MIN_COLUMN_WIDTH);
  const cells = Array.from(firstRow.children) as HTMLElement[];
  if (cells.length === 0) return Array(numColumns).fill(MIN_COLUMN_WIDTH);

  const widths = Array.from({ length: numColumns }, (_, i) =>
    Math.round((cells[ i % cells.length ]?.getBoundingClientRect().width) || MIN_COLUMN_WIDTH));

  // Нормализуем сумму к ширине контент-области редактора. Сумма
  // округлённых cell-rect'ов (особенно с border-collapse) на 1-2px
  // больше реальной ширины таблицы. В full-режиме table-layout: fixed
  // делает ширину таблицы = max(100%, sum(colWidths)) — лишний пиксель
  // вызывает горизонтальный скролл (таблица 847 при вьюпорте 846).
  // Зажимаем сумму к доступной ширине; остаток отдаём последней колонке.
  const available = getEditorContentWidth(editor);
  const total = widths.reduce((s, w) => s + w, 0);
  if (Number.isFinite(available) && available > 0 && total > available) {
    const scale = available / total;
    const scaled = widths.map((w) => Math.max(MIN_COLUMN_WIDTH, Math.floor(w * scale)));
    const used = scaled.slice(0, -1).reduce((s, w) => s + w, 0);
    scaled[ scaled.length - 1 ] = Math.max(MIN_COLUMN_WIDTH, available - used);
    return scaled;
  }
  return widths;
}

type PointerPosition = {
  x: number,
  y: number,
};

type PointerDraggingDirection = "right" | "bottom";

const MIN_ROW_HEIGHT = 33;
const MIN_COLUMN_WIDTH = 50;

const TableCellResizer = ({ editor }: { editor: LexicalEditor }): ReactElement => {
  const targetRef = useRef<HTMLElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const tableRectRef = useRef<ClientRect | null>(null);
  const [ hasTable, setHasTable ] = useState(false);

  const pointerStartPosRef = useRef<PointerPosition | null>(null);
  const [ pointerCurrentPos, updatePointerCurrentPos ] =
    useState<PointerPosition | null>(null);

  const [ activeCell, updateActiveCell ] = useState<TableDOMCell | null>(null);
  const [ draggingDirection, updateDraggingDirection ] =
    useState<PointerDraggingDirection | null>(null);

  const resetState = useCallback(() => {
    updateActiveCell(null);
    targetRef.current = null;
    updateDraggingDirection(null);
    pointerStartPosRef.current = null;
    tableRectRef.current = null;
  }, []);

  useEffect(() => {
    const tableKeys = new Set<NodeKey>();
    // Не заполняем colWidths автоматически — дефолтная новая таблица должна
    // оставаться с равными колонками (table-layout: fixed + width: 100%
    // распределит ширину поровну сам). colWidths появится при первом ресайзе.
    return editor.registerMutationListener(TableNode, (nodeMutations) => {
      for (const [ nodeKey, mutation ] of nodeMutations) {
        if (mutation === "destroyed") {
          tableKeys.delete(nodeKey);
        } else {
          tableKeys.add(nodeKey);
        }
      }
      setHasTable(tableKeys.size > 0);
    });
  }, [ editor ]);

  useEffect(() => {
    if (!hasTable) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const target = event.target;
      if (!isHTMLElement(target)) {
        return;
      }

      if (draggingDirection) {
        event.preventDefault();
        event.stopPropagation();
        updatePointerCurrentPos({
          x: event.clientX,
          y: event.clientY,
        });
        return;
      }
      if (resizerRef.current && resizerRef.current.contains(target)) {
        return;
      }

      if (targetRef.current !== target) {
        targetRef.current = target;
        const cell = getDOMCellFromTarget(target);

        if (cell && activeCell !== cell) {
          editor.getEditorState().read(() => {
            const tableCellNode = $getNearestNodeFromDOMNode(cell.elem);
            if (!tableCellNode) {
              throw new Error("TableCellResizer: Table cell node not found.");
            }

            const tableNode =
              $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
            const tableElement = getTableElement(tableNode,
              editor.getElementByKey(tableNode.getKey()));

            if (!tableElement) {
              throw new Error("TableCellResizer: Table element not found.");
            }

            targetRef.current = target;
            tableRectRef.current = tableElement.getBoundingClientRect();
            updateActiveCell(cell);
          },
          { editor });
        } else if (cell === null) {
          resetState();
        }
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const isTouchEvent = event.pointerType === "touch";
      if (isTouchEvent) {
        onPointerMove(event);
      }
    };

    const resizerContainer = resizerRef.current;
    resizerContainer?.addEventListener(
      "pointermove", onPointerMove, {
        capture: true,
      },
    );

    const removeRootListener = editor.registerRootListener((rootElement, prevRootElement) => {
      prevRootElement?.removeEventListener("pointermove", onPointerMove);
      prevRootElement?.removeEventListener("pointerdown", onPointerDown);
      rootElement?.addEventListener("pointermove", onPointerMove);
      rootElement?.addEventListener("pointerdown", onPointerDown);
    });

    return () => {
      removeRootListener();
      resizerContainer?.removeEventListener("pointermove", onPointerMove);
    };
  }, [
    activeCell,
    draggingDirection,
    editor,
    resetState,
    hasTable,
  ]);

  const isHeightChanging = (direction: PointerDraggingDirection) => {
    return direction === "bottom";
  };

  const updateRowHeight = useCallback((heightChange: number) => {
    if (!activeCell) {
      throw new Error("TableCellResizer: Expected active cell.");
    }

    editor.update(() => {
      const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
      if (!$isTableCellNode(tableCellNode)) {
        throw new Error("TableCellResizer: Table cell node not found.");
      }

      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      const baseRowIndex =
        $getTableRowIndexFromTableCellNode(tableCellNode);
      const tableRows = tableNode.getChildren();

      // Determine if this is a full row merge by checking colspan
      const isFullRowMerge =
        tableCellNode.getColSpan() === tableNode.getColumnCount();

      // For full row merges, apply to first row. For partial merges, apply to last row
      const tableRowIndex = isFullRowMerge ?
        baseRowIndex :
        baseRowIndex + tableCellNode.getRowSpan() - 1;

      if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
        throw new Error("Expected table cell to be inside of table row.");
      }

      const tableRow = tableRows[ tableRowIndex ];

      if (!$isTableRowNode(tableRow)) {
        throw new Error("Expected table row");
      }

      // Базовая высота: 1) явное значение из ноды; 2) реальная высота <tr> из DOM;
      // 3) максимум по высотам ячеек; 4) fallback на MIN_ROW_HEIGHT.
      // НЕ берём min по ячейкам — это занижает базу и ломает ресайз.
      let height = tableRow.getHeight();
      if (height === undefined || !Number.isFinite(height)) {
        const rowEl = editor.getElementByKey(tableRow.getKey());
        const domHeight = rowEl?.getBoundingClientRect().height;
        if (domHeight && Number.isFinite(domHeight)) {
          height = domHeight;
        } else {
          const rowCells = tableRow.getChildren<TableCellNode>();
          const cellHeights = rowCells
            .map((cell) => getCellNodeHeight(cell, editor))
            .filter((h): h is number => typeof h === "number" && Number.isFinite(h));
          height = cellHeights.length > 0 ?
            Math.max(...cellHeights) :
            MIN_ROW_HEIGHT;
        }
      }

      // Любая попытка уйти ниже минимума → клампим к MIN_ROW_HEIGHT.
      const proposed = height + heightChange;
      const newHeight = proposed < MIN_ROW_HEIGHT ?
        MIN_ROW_HEIGHT :
        proposed;
      tableRow.setHeight(newHeight);
    },
    { tag: SKIP_SCROLL_INTO_VIEW_TAG });
  },
  [ activeCell, editor ]);

  const getCellNodeHeight = (cell: TableCellNode,
    activeEditor: LexicalEditor): number | undefined => {
    const domCellNode = activeEditor.getElementByKey(cell.getKey());
    return domCellNode?.clientHeight;
  };

  const getCellColumnIndex = (tableCellNode: TableCellNode,
    tableMap: TableMapType) => {
    for (let row = 0; row < tableMap.length; row++) {
      for (let column = 0; column < tableMap[ row ].length; column++) {
        if (tableMap[ row ][ column ].cell === tableCellNode) {
          return column;
        }
      }
    }
  };

  const updateColumnWidth = useCallback((widthChange: number) => {
    if (!activeCell) {
      throw new Error("TableCellResizer: Expected active cell.");
    }
    editor.update(() => {
      const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
      if (!$isTableCellNode(tableCellNode)) {
        throw new Error("TableCellResizer: Table cell node not found.");
      }

      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      const [ tableMap ] = $computeTableMapSkipCellCheck(
        tableNode,
        null,
        null,
      );
      const columnIndex = getCellColumnIndex(tableCellNode, tableMap);
      if (columnIndex === undefined) {
        throw new Error("TableCellResizer: Table column not found.");
      }

      const numColumns = tableMap[ 0 ]?.length ?? 0;
      const isLastColumn = columnIndex === numColumns - 1;
      const widthMode = $isCustomTableNode(tableNode) ?
        tableNode.getWidthMode() :
        "full";

      // Снимаем равные колонки при первом ресайзе. До этого момента
      // colWidths могло отсутствовать — заполняем из реального DOM, чтобы
      // ничего не «прыгнуло».
      let colWidths = tableNode.getColWidths();
      if (
        $isCustomTableNode(tableNode) &&
        (tableNode.isEqualColumns() || !colWidths || colWidths.length !== numColumns)
      ) {
        colWidths = readColWidthsFromDOM(
          tableNode, editor, numColumns,
        );
        tableNode.setColWidths(colWidths);
        tableNode.setEqualColumns(false);
      }
      if (!colWidths || colWidths.length !== numColumns) return;

      const newColWidths = [ ...colWidths ];
      const width = colWidths[ columnIndex ];

      if (isLastColumn) {
        // Полноширинный режим: у последней колонки нет соседа справа — расти некуда.
        if (widthMode === "full") return;
        // Fixed-режим: тянем последнюю колонку → растёт сама таблица.
        newColWidths[ columnIndex ] = Math.max(width + widthChange, MIN_COLUMN_WIDTH);
      } else {
        // Borrow from neighbor: уменьшаем/увеличиваем правого соседа на ту же величину.
        // Если одна из сторон уходит ниже MIN_COLUMN_WIDTH — зажимаем её к MIN,
        // а вторую пересчитываем так, чтобы сумма пары сохранилась.
        const neighborWidth = colWidths[ columnIndex + 1 ];
        const pairTotal = width + neighborWidth;
        // Инвариант: оба больше MIN до ресайза, значит pairTotal >= 2*MIN
        // и зажатие всегда оставляет валидную пару.
        let newTarget = width + widthChange;
        let newNeighbor = neighborWidth - widthChange;
        if (newTarget < MIN_COLUMN_WIDTH) {
          newTarget = MIN_COLUMN_WIDTH;
          newNeighbor = pairTotal - MIN_COLUMN_WIDTH;
        } else if (newNeighbor < MIN_COLUMN_WIDTH) {
          newNeighbor = MIN_COLUMN_WIDTH;
          newTarget = pairTotal - MIN_COLUMN_WIDTH;
        }
        newColWidths[ columnIndex ] = newTarget;
        newColWidths[ columnIndex + 1 ] = newNeighbor;
      }

      // Концепция: таблица по умолчанию во всю ширину редактора. Если в
      // fixed-режиме её ширина перестаёт помещаться в доступную область —
      // автоматически переключаемся в "full" и масштабируем colWidths под
      // доступную ширину (CSS table-layout:fixed возьмёт max(width, sum(col)) —
      // поэтому одного только переключения widthMode недостаточно).
      // Меряем root редактора БЕЗ padding'а (у ContentEditable обычно большие
      // отступы — clientWidth их не вычитает).
      let finalColWidths = newColWidths;
      if ($isCustomTableNode(tableNode) && tableNode.getWidthMode() === "fixed") {
        const containerWidth = getEditorContentWidth(editor);
        const newTotal = newColWidths.reduce((s, w) => s + (w || 0), 0);
        if (newTotal > containerWidth && containerWidth > 0) {
          // Пропорционально сжимаем под containerWidth, остаток округления
          // отдаём последней колонке, чтобы сумма точно совпала.
          const scale = containerWidth / newTotal;
          const scaled = newColWidths.map((w) =>
            Math.max(MIN_COLUMN_WIDTH, Math.floor(w * scale)));
          const diff = containerWidth - scaled.reduce((s, w) => s + w, 0);
          scaled[ scaled.length - 1 ] = Math.max(MIN_COLUMN_WIDTH,
            scaled[ scaled.length - 1 ] + diff);
          finalColWidths = scaled;
          tableNode.setWidthMode("full");
        }
      }

      tableNode.setColWidths(finalColWidths);
    },
    { tag: SKIP_SCROLL_INTO_VIEW_TAG });
  },
  [ activeCell, editor ]);

  const pointerUpHandler = useCallback((direction: PointerDraggingDirection) => {
    const handler = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!activeCell) {
        throw new Error("TableCellResizer: Expected active cell.");
      }

      if (pointerStartPosRef.current) {
        const { x, y } = pointerStartPosRef.current;

        if (activeCell === null) {
          return;
        }
        const zoom = calculateZoomLevel(event.target as Element);

        if (isHeightChanging(direction)) {
          const heightChange = (event.clientY - y) / zoom;
          updateRowHeight(heightChange);
        } else {
          const widthChange = (event.clientX - x) / zoom;
          updateColumnWidth(widthChange);
        }

        resetState();
        document.removeEventListener("pointerup", handler);
      }
    };
    return handler;
  },
  [
    activeCell,
    resetState,
    updateColumnWidth,
    updateRowHeight,
  ]);

  const toggleResize = useCallback((direction: PointerDraggingDirection): PointerEventHandler<HTMLDivElement> =>
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!activeCell) {
        throw new Error("TableCellResizer: Expected active cell.");
      }

      pointerStartPosRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      updatePointerCurrentPos(pointerStartPosRef.current);
      updateDraggingDirection(direction);

      document.addEventListener("pointerup", pointerUpHandler(direction));
    },
  [ activeCell, pointerUpHandler ]);

  const getResizers = useCallback(() => {
    if (activeCell) {
      const {
        height,
        width,
        top,
        left,
      } =
        activeCell.elem.getBoundingClientRect();
      const zoom = calculateZoomLevel(activeCell.elem);
      // Pixel width of the zone where you can drag the edge
      const zoneWidth = 16;
      const styles: Record<string, CSSProperties> = {
        bottom: {
          backgroundColor: "none",
          cursor: "row-resize",
          height: `${zoneWidth}px`,
          left: `${window.scrollX + left}px`,
          top: `${window.scrollY + top + height - zoneWidth / 2}px`,
          width: `${width}px`,
        },
        right: {
          backgroundColor: "none",
          cursor: "col-resize",
          height: `${height}px`,
          left: `${window.scrollX + left + width - zoneWidth / 2}px`,
          top: `${window.scrollY + top}px`,
          width: `${zoneWidth}px`,
        },
      };

      const tableRect = tableRectRef.current;

      if (draggingDirection && pointerCurrentPos && tableRect) {
        if (isHeightChanging(draggingDirection)) {
          styles[ draggingDirection ].left = `${
            window.scrollX + tableRect.left
          }px`;
          styles[ draggingDirection ].top = `${
            window.scrollY + pointerCurrentPos.y / zoom
          }px`;
          styles[ draggingDirection ].height = "3px";
          styles[ draggingDirection ].width = `${tableRect.width}px`;
        } else {
          styles[ draggingDirection ].top = `${window.scrollY + tableRect.top}px`;
          styles[ draggingDirection ].left = `${
            window.scrollX + pointerCurrentPos.x / zoom
          }px`;
          styles[ draggingDirection ].width = "3px";
          styles[ draggingDirection ].height = `${tableRect.height}px`;
        }

        styles[ draggingDirection ].backgroundColor = "#adf";
        styles[ draggingDirection ].mixBlendMode = "unset";
      }

      return styles;
    }

    return {
      bottom: null,
      left: null,
      right: null,
      top: null,
    };
  }, [
    activeCell,
    draggingDirection,
    pointerCurrentPos,
  ]);

  const resizerStyles = getResizers();

  // В режиме "на всю ширину" правую границу последней колонки тянуть нельзя
  // (расти некуда — соседа справа нет, а таблица упирается в редактор).
  // Прячем правый resizer на крайней правой ячейке.
  const hideRightResizer = (() => {
    if (!activeCell) return false;
    const cellEl = activeCell.elem;
    const tableEl = cellEl.closest("table");
    if (!tableEl) return false;
    if (tableEl.getAttribute("data-width-mode") !== "full") return false;
    const row = cellEl.parentElement;
    if (!row) return false;
    return cellEl === row.lastElementChild;
  })();

  return (
    <div ref={resizerRef}>
      {
        activeCell !== null && (
          <>
            {
              !hideRightResizer && (
                <div
                  className="TableCellResizer__resizer TableCellResizer__ui"
                  style={resizerStyles.right || undefined}
                  onPointerDown={toggleResize("right")}
                />
              )
            }
            <div
              className="TableCellResizer__resizer TableCellResizer__ui"
              style={resizerStyles.bottom || undefined}
              onPointerDown={toggleResize("bottom")}
            />
          </>
        )
      }
    </div>
  );
};

export const TableCellResizerPlugin = () => {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const scopedPortal = useScopedPortal();

  return useMemo(() =>
    isEditable ?
      scopedPortal(<TableCellResizer editor={editor} />, document.body) :
      null,
  [
    editor,
    isEditable,
    scopedPortal,
  ]);
};
