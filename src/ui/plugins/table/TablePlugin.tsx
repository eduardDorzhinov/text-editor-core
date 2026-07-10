import {
  ReactElement,
  useContext,
  useEffect,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  INSERT_TABLE_COMMAND,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import {
  LexicalEditor,
} from "lexical";

import { CellContext, CellEditorConfig } from "@/model/providers/TableContext";
import { Button } from "@/ui/components/button";
import { TextInput } from "@/ui/components/input";

export const InsertTableDialog = ({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}) => {
  const [ rows, setRows ] = useState("2");
  const [ columns, setColumns ] = useState("2");

  const isDisabled =
    !Number(rows) ||
    Number(rows) < 1 ||
    Number(rows) >= 500 ||
    !Number(columns) ||
    Number(columns) < 1 ||
    Number(columns) >= 50;

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns,
      rows,
    });

    onClose();
  };

  return (
    <>
      <TextInput
        label="Строки"
        placeholder={"# кол-во строк (1-500)"}
        type="number"
        value={rows}
        onChange={setRows}
      />
      <TextInput
        label="Столбцы"
        placeholder={"# кол-во столбцов (1-50)"}
        type="number"
        value={columns}
        onChange={setColumns}
      />
      <Button
        disabled={isDisabled}
        onClick={onClick}
      >
        Создать
      </Button>
    </>
  );
};

export const TablePlugin = ({
  cellEditorConfig,
  children,
}: {
  cellEditorConfig: CellEditorConfig,
  children: ReactElement | Array<ReactElement>,
}): ReactElement | null => {
  const [ editor ] = useLexicalComposerContext();
  const cellContext = useContext(CellContext);
  useEffect(() => {
    if (!editor.hasNodes([
      // @ts-ignore
      TableNode,
      // @ts-ignore
      TableRowNode,
      // @ts-ignore
      TableCellNode,
    ])) {
      throw new Error("TablePlugin: TableNode, TableRowNode, or TableCellNode is not registered on editor");
    }
  }, [ editor ]);
  useEffect(() => {
    cellContext.set(cellEditorConfig, children);
  }, [
    cellContext,
    cellEditorConfig,
    children,
  ]);
  return null;
};
