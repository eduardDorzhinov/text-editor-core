import {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MdFormatColorFill } from "react-icons/md";
import {
  TbColumnInsertLeft,
  TbColumnInsertRight,
  TbColumnRemove,
  TbRowInsertBottom,
  TbRowInsertTop,
  TbRowRemove,
  TbTableMinus,
} from "react-icons/tb";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getNodeTriplet,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableSelection,
  $mergeCells,
  $unmergeCell,
  TableCellNode,
  TableNode,
} from "@lexical/table";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  ElementNode,
  SELECTION_CHANGE_COMMAND,
} from "lexical";

import { ColorPicker } from "@/ui/components/color-picker";
import { useModal } from "@/ui/components/modal";
import { Tooltip } from "@/ui/components/tooltip";
import { $isCustomTableNode, CustomTableNode } from "@/ui/plugins/table-plugin";

import "./TableToolbar.scss";

function $selectLastDescendant(node: ElementNode): void {
  const last = node.getLastDescendant();
  if ($isTextNode(last)) last.select();
  else if ($isElementNode(last)) last.selectEnd();
  else if (last !== null) last.selectNext();
}

function $canUnmerge(): boolean {
  const selection = $getSelection();
  if (
    ($isRangeSelection(selection) && !selection.isCollapsed()) ||
    ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
    (!$isRangeSelection(selection) && !$isTableSelection(selection))
  ) {
    return false;
  }
  const [ cell ] = $getNodeTriplet(selection.anchor);
  return cell.__colSpan > 1 || cell.__rowSpan > 1;
}

function computeSelectionCount(): { columns: number, rows: number } {
  const selection = $getSelection();
  if ($isTableSelection(selection)) {
    const s = selection.getShape();
    return {
      columns: s.toX - s.fromX + 1,
      rows: s.toY - s.fromY + 1,
    };
  }
  return { columns: 1, rows: 1 };
}

export function TableToolbar(): ReactElement | null {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();

  const [ inTable, setInTable ] = useState(false);
  const [ widthMode, setWidthMode ] = useState<"full" | "fixed">("full");
  const [ equalColumns, setEqualColumns ] = useState(true);
  const [ canMerge, setCanMerge ] = useState(false);
  const [ canUnmerge, setCanUnmerge ] = useState(false);
  const [ bgColor, setBgColor ] = useState<string>("");
  const tableNodeKeyRef = useRef<string | null>(null);

  const [ colorPickerModal, showColorPickerModal ] = useModal();

  // Считываем текущее состояние таблицы для активной ячейки.
  const sync = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      let cellNode: TableCellNode | null = null;

      if ($isRangeSelection(selection)) {
        cellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
      } else if ($isTableSelection(selection)) {
        cellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
      }

      if (!cellNode || !$isTableCellNode(cellNode)) {
        setInTable(false);
        tableNodeKeyRef.current = null;
        return;
      }

      const table = $getTableNodeFromLexicalNodeOrThrow(cellNode);
      tableNodeKeyRef.current = table.getKey();
      setInTable(true);

      if ($isCustomTableNode(table)) {
        setWidthMode(table.getWidthMode());
        setEqualColumns(table.isEqualColumns());
      } else {
        setWidthMode("full");
        setEqualColumns(true);
      }

      // bg-цвет ячейки якоря
      setBgColor(cellNode.getBackgroundColor() || "");

      // merge / unmerge доступность
      const counts = computeSelectionCount();
      setCanMerge(counts.columns > 1 || counts.rows > 1);
      setCanUnmerge($canUnmerge());
    });
  }, [ editor ]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => sync()),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          sync();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerMutationListener(TableNode, () => sync()),
      editor.registerMutationListener(CustomTableNode, () => sync()),
    );
  }, [ editor, sync ]);

  // --- handlers ---

  const toggleWidthMode = useCallback(() => {
    editor.update(() => {
      const key = tableNodeKeyRef.current;
      if (!key) return;
      const selection = $getSelection();
      if (!$isRangeSelection(selection) && !$isTableSelection(selection)) return;
      const cell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
      if (!cell) return;
      const t = $getTableNodeFromLexicalNodeOrThrow(cell);
      if (!$isCustomTableNode(t)) return;

      const nextMode = t.getWidthMode() === "full" ?
        "fixed" :
        "full";

      // Переходим в fixed: гарантируем актуальные colWidths.
      // Берём ширину доступного контейнера (scrollable wrapper, либо его
      // родителя у редактора), а не сумму ячеек. Так гарантируем, что
      // sum(colWidths) === визуальной ширине таблицы и правый край НЕ
      // уйдёт за вьюпорт. getBoundingClientRect ячеек суммировать
      // нельзя — из-за border-collapse + box-sizing: border-box их
      // суммарная ширина больше реальной ширины <table>.
      if (nextMode === "fixed") {
        const colCount = t.getColumnCount();
        const existing = t.getColWidths();
        if (!existing || existing.length !== colCount || t.isEqualColumns()) {
          const wrapperEl = editor.getElementByKey(t.getKey());
          // Ширина доступного контейнера = clientWidth wrapper'а (учитывает
          // padding и scrollbar родителя). Дополнительно клампим к
          // ширине корня редактора как safety-net на случай, если у
          // wrapper'а вдруг overflow и он шире своего родителя.
          const wrapperWidth = wrapperEl?.clientWidth ?? 0;
          const rootEl = editor.getRootElement();
          const rootWidth = rootEl?.clientWidth ?? 0;
          // rootEl имеет padding — учтём его, чтобы taблица не залазила
          // на padding и не вызывала горизонтальный скролл редактора.
          const rootPad = rootEl ?
            (parseFloat(getComputedStyle(rootEl).paddingLeft) || 0) +
            (parseFloat(getComputedStyle(rootEl).paddingRight) || 0) :
            0;
          const rootInner = Math.max(0, rootWidth - rootPad);
          const available = Math.min(wrapperWidth || Infinity,
            rootInner || Infinity);
          const target = Number.isFinite(available) && available > 0 ?
            Math.floor(available) :
            Math.max(colCount * 100, 200);

          // Равномерное деление. Последняя колонка добивает остаток
          // округления, чтобы sum точно равнялась target.
          const base = Math.floor(target / colCount);
          const widths = Array.from({ length: colCount }, (_, i) =>
            (i === colCount - 1 ?
              target - base * (colCount - 1) :
              base));

          t.setColWidths(widths);
          t.setEqualColumns(false);
        }
      }

      t.setWidthMode(nextMode);
    });
  }, [ editor ]);

  // «Колонки равной ширины»: возврат к equalColumns=true и сброс colWidths.
  const setEqualColumnsOn = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) && !$isTableSelection(selection)) return;
      const cell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
      if (!cell) return;
      const t = $getTableNodeFromLexicalNodeOrThrow(cell);
      if (!$isCustomTableNode(t)) return;

      // В full-режиме можно просто очистить colWidths.
      if (t.getWidthMode() === "full") {
        t.setColWidths(undefined);
        t.setEqualColumns(true);
        return;
      }

      // В fixed-режиме нужны валидные colWidths (= sum), но одинаковые.
      // Возьмём среднее по DOM первой строки.
      const colCount = t.getColumnCount();
      const tableEl = editor.getElementByKey(t.getKey());
      const firstRow = tableEl?.querySelector("tr");
      const cells = firstRow ?
        Array.from(firstRow.children) as HTMLElement[] :
        [];
      const total = cells.reduce((sum, c) => sum + (c?.getBoundingClientRect().width || 100),
        0) || (colCount * 100);
      const avg = Math.round(total / colCount);
      t.setColWidths(Array.from({ length: colCount }, () => avg));
      t.setEqualColumns(true);
    });
  }, [ editor ]);

  const handleEqualColumnsClick = useCallback(() => {
    // Если уже включено — клик ничего не делает (чекбокс остаётся включённым).
    if (equalColumns) return;
    setEqualColumnsOn();
  }, [ equalColumns, setEqualColumnsOn ]);

  const applyBgColor = useCallback((value: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!selection) return;
      if ($isRangeSelection(selection) || $isTableSelection(selection)) {
        const [ cell ] = $getNodeTriplet(selection.anchor);
        if ($isTableCellNode(cell)) cell.setBackgroundColor(value);
        if ($isTableSelection(selection)) {
          for (const n of selection.getNodes()) {
            if ($isTableCellNode(n)) n.setBackgroundColor(value);
          }
        }
      }
    });
  }, [ editor ]);

  const openColorPicker = useCallback(() => {
    showColorPickerModal(
      "Цвет фона ячейки",
      () => (
        <ColorPicker
          useColorPicker
          color={bgColor}
          onChange={applyBgColor}
        />
      ),
      false,
      true,
    );
  }, [
    showColorPickerModal,
    bgColor,
    applyBgColor,
  ]);

  const insertRow = useCallback((after: boolean) => {
    editor.update(() => {
      const counts = computeSelectionCount();
      for (let i = 0; i < counts.rows; i++) $insertTableRowAtSelection(after);
    });
  }, [ editor ]);

  const insertColumn = useCallback((after: boolean) => {
    editor.update(() => {
      const counts = computeSelectionCount();
      for (let i = 0; i < counts.columns; i++) $insertTableColumnAtSelection(after);
    });
  }, [ editor ]);

  const deleteRow = useCallback(() => {
    editor.update(() => {
      $deleteTableRowAtSelection();
    });
  }, [ editor ]);

  const deleteColumn = useCallback(() => {
    editor.update(() => {
      $deleteTableColumnAtSelection();
    });
  }, [ editor ]);

  const deleteTable = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) && !$isTableSelection(selection)) return;
      const cell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
      if (!cell) return;
      const t = $getTableNodeFromLexicalNodeOrThrow(cell);
      t.remove();
    });
  }, [ editor ]);

  const mergeCellsAction = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isTableSelection(selection)) return;
      const nodes = selection.getNodes();
      const cells = nodes.filter($isTableCellNode);
      const target = $mergeCells(cells);
      if (target) $selectLastDescendant(target);
    });
  }, [ editor ]);

  const unmergeAction = useCallback(() => {
    editor.update(() => {
      $unmergeCell();
    });
  }, [ editor ]);

  if (!isEditable || !inTable) {
    return colorPickerModal || null;
  }

  return (
    <>
      {colorPickerModal}
      <div className="table-toolbar">
        <label className="table-toolbar__checkbox">
          <input
            checked={widthMode === "full"}
            type="checkbox"
            onChange={toggleWidthMode}
          />
          <span>На всю ширину</span>
        </label>

        <label className="table-toolbar__checkbox">
          <input
            checked={equalColumns}
            type="checkbox"
            onChange={handleEqualColumnsClick}
          />
          <span>Равные колонки</span>
        </label>

        <span className="table-toolbar__divider" />

        <Tooltip label="Цвет фона ячейки">
          <button
            className="table-toolbar__btn"
            type="button"
            onClick={openColorPicker}
          >
            <MdFormatColorFill />
            <span
              className="table-toolbar__color-swatch"
              style={{ backgroundColor: bgColor || "transparent" }}
            />
          </button>
        </Tooltip>

        <span className="table-toolbar__divider" />

        <Tooltip label="Вставить строку выше">
          <button
            className="table-toolbar__btn"
            type="button"
            onClick={() => insertRow(false)}
          >
            <TbRowInsertTop />
          </button>
        </Tooltip>
        <Tooltip label="Вставить строку ниже">
          <button
            className="table-toolbar__btn"
            type="button"
            onClick={() => insertRow(true)}
          >
            <TbRowInsertBottom />
          </button>
        </Tooltip>
        <Tooltip label="Вставить колонку слева">
          <button
            className="table-toolbar__btn"
            type="button"
            onClick={() => insertColumn(false)}
          >
            <TbColumnInsertLeft />
          </button>
        </Tooltip>
        <Tooltip label="Вставить колонку справа">
          <button
            className="table-toolbar__btn"
            type="button"
            onClick={() => insertColumn(true)}
          >
            <TbColumnInsertRight />
          </button>
        </Tooltip>

        <span className="table-toolbar__divider" />

        <Tooltip
          label={
            canUnmerge ?
              "Разделить ячейки" :
              "Объединить ячейки"
          }
        >
          <button
            className="table-toolbar__btn"
            disabled={!canMerge && !canUnmerge}
            type="button"
            onClick={
              canUnmerge ?
                unmergeAction :
                mergeCellsAction
            }
          >
            <span className="table-toolbar__merge-label">
              {
                canUnmerge ?
                  "Разъединить" :
                  "Объединить"
              }
            </span>
          </button>
        </Tooltip>

        <span className="table-toolbar__divider" />

        <Tooltip label="Удалить строку">
          <button
            className="table-toolbar__btn"
            type="button"
            onClick={deleteRow}
          >
            <TbRowRemove />
          </button>
        </Tooltip>
        <Tooltip label="Удалить колонку">
          <button
            className="table-toolbar__btn"
            type="button"
            onClick={deleteColumn}
          >
            <TbColumnRemove />
          </button>
        </Tooltip>
        <Tooltip label="Удалить таблицу">
          <button
            className="table-toolbar__btn table-toolbar__btn--danger"
            type="button"
            onClick={deleteTable}
          >
            <TbTableMinus />
          </button>
        </Tooltip>
      </div>
    </>
  );
}
