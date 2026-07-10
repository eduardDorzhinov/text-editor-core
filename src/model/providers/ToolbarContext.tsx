import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ElementFormatType } from "lexical";

export const MIN_ALLOWED_FONT_SIZE = 8;
export const MAX_ALLOWED_FONT_SIZE = 72;
export const DEFAULT_FONT_SIZE = 15;


type RootTypeToRootName = {
  root: "Root",
  table: "Table",
};

export const BLOCK_TYPE_TO_BLOCK_NAME = {
  bullet: "Список",
  code: "Блок кода",
  h1: "Заголовок 1",
  h2: "Заголовок 2",
  h3: "Заголовок 3",
  h4: "Заголовок 4",
  h5: "Заголовок 5",
  h6: "Заголовок 6",
  number: "Нумерованный список",
  paragraph: "Текст",
};

export const DEFAULT_BACKGROUND = "#fff";
export const DEFAULT_TEXT_COLOR = "#000";

const INITIAL_TOOLBAR_STATE = {
  // "" == нет background-color у текста (нет подсветки). HighlightDropdown
  // обращается к этому полю и отображает индикатор только если значение
  // непустое и не «белое».
  bgColor: "",
  blockType: "paragraph" as keyof typeof BLOCK_TYPE_TO_BLOCK_NAME,
  // Маркер текущего маркированного списка (list-style-type). ""/"disc" —
  // маркер по умолчанию. Заполняется, когда каретка в bullet-списке.
  bulletStyle: "" as string,
  canRedo: false,
  canUndo: false,
  codeLanguage: "",
  codeTheme: "",
  elementFormat: "left" as ElementFormatType,
  fontColor: DEFAULT_TEXT_COLOR,
  // fontFamily: 'Arial',
  // Current font size in px
  fontSize: `${DEFAULT_FONT_SIZE}px`,
  // Font size input value - for controlled input
  fontSizeInputValue: `${DEFAULT_FONT_SIZE}`,
  isBold: false,
  isCode: false,
  isHighlight: false,
  isImageCaption: false,
  isInBanner: false,
  isItalic: false,
  isLink: false,
  isRTL: false,
  isStrikethrough: false,
  isSubscript: false,
  isSuperscript: false,
  isUnderline: false,
  isLowercase: false,
  isUppercase: false,
  isCapitalize: false,
  rootType: "root" as keyof RootTypeToRootName,
  listStartNumber: null as number | null,
};

type ToolbarState = typeof INITIAL_TOOLBAR_STATE;

// Utility type to get keys and infer value types
export type ToolbarStateKey = keyof ToolbarState;
type ToolbarStateValue<Key extends ToolbarStateKey> = ToolbarState[ Key ];

type ContextShape = {
  toolbarState: ToolbarState,
  updateToolbarState<Key extends ToolbarStateKey>(
    key: Key,
    value: ToolbarStateValue<Key>,
  ): void,
};

const Context = createContext<ContextShape | undefined>(undefined);

export const ToolbarContext = ({ children }: { children: ReactNode }) => {
  const [ toolbarState, setToolbarState ] = useState(INITIAL_TOOLBAR_STATE);
  const selectionFontSize = toolbarState.fontSize;

  const updateToolbarState = useCallback(<Key extends ToolbarStateKey>(key: Key, value: ToolbarStateValue<Key>) => {
    setToolbarState((prev) => ({
      ...prev,
      [ key ]: value,
    }));
  },
  []);

  useEffect(() => {
    updateToolbarState("fontSizeInputValue", selectionFontSize.slice(0, -2));
  }, [ selectionFontSize, updateToolbarState ]);

  const contextValue = useMemo(() => {
    return {
      toolbarState,
      updateToolbarState,
    };
  }, [ toolbarState, updateToolbarState ]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useToolbarState = () => {
  const context = useContext(Context);

  if (context === undefined) {
    throw new Error("useToolbarState must be used within a ToolbarProvider");
  }

  return context;
};
