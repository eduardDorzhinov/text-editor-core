import {
  Context as ContextType,
  createContext,
  ReactNode,
  useContext,
  useMemo,
} from "react";

import { createEmptyHistoryState, HistoryState } from "@lexical/react/LexicalHistoryPlugin";

type ContextShape = {
  historyState?: HistoryState,
};

const Context: ContextType<ContextShape> = createContext({});

export const SharedHistoryContext = ({
  children,
}: {
  children: ReactNode,
}) => {
  const historyContext = useMemo(() => ({ historyState: createEmptyHistoryState() }), []);
  return <Context.Provider value={historyContext}>{children}</Context.Provider>;
};

export const useSharedHistoryContext = (): ContextShape => {
  return useContext(Context);
};
