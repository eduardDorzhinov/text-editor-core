import {
  createContext,
  ReactElement,
  useMemo,
  useState,
} from "react";

import {
  EditorThemeClasses,
  Klass,
  LexicalEditor,
  LexicalNode,
} from "lexical";

export type CellContextShape = {
  cellEditorConfig: null | CellEditorConfig,
  cellEditorPlugins: null | ReactElement | Array<ReactElement>,
  set: (
    cellEditorConfig: null | CellEditorConfig,
    cellEditorPlugins: null | ReactElement | Array<ReactElement>,
  ) => void,
};

export type CellEditorConfig = Readonly<{
  namespace: string,
  nodes?: ReadonlyArray<Klass<LexicalNode>>,
  onError: (error: Error, editor: LexicalEditor) => void,
  readOnly?: boolean,
  theme?: EditorThemeClasses,
}>;

export const CellContext = createContext<CellContextShape>({
  cellEditorConfig: null,
  cellEditorPlugins: null,
  set: () => {
    // Empty
  },
});

export const TableContext = ({ children }: { children: ReactElement }) => {
  const [ contextValue, setContextValue ] = useState<{
    cellEditorConfig: null | CellEditorConfig,
    cellEditorPlugins: null | ReactElement | Array<ReactElement>,
  }>({
    cellEditorConfig: null,
    cellEditorPlugins: null,
  });
  return (
    <CellContext.Provider
      value={
        useMemo(() => ({
          cellEditorConfig: contextValue.cellEditorConfig,
          cellEditorPlugins: contextValue.cellEditorPlugins,
          set: (cellEditorConfig, cellEditorPlugins) => {
            setContextValue({ cellEditorConfig, cellEditorPlugins });
          },
        }),
        [ contextValue.cellEditorConfig, contextValue.cellEditorPlugins ])
      }
    >
      {children}
    </CellContext.Provider>
  );
};
