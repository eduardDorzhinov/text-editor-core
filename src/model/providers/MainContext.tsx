import {
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useMemo,
  useRef,
} from "react";

interface MainContextType {
  userName?: string,
  toolbarRef?: RefObject<HTMLDivElement | null>,
  fieldUid?: string,
  objUid?: string,
  localUsed?: boolean,
  wrapRef?: RefObject<HTMLDivElement>,
}

const INITIAL_STATE: MainContextType = {};

const Context = createContext<MainContextType>(INITIAL_STATE);

export const MainContext = ({
  children,
  fieldUid,
  userName,
  objUid,
  localUsed,
  wrapRef,
}: {
  children: ReactNode,
  fieldUid?: string,
  userName?: string,
  objUid?: string,
  localUsed?: boolean,
  wrapRef: RefObject<HTMLDivElement>,
}) => {
  const toolbarRef = useRef(null);
  const value = useMemo(() => {
    return (
      {
        fieldUid,
        toolbarRef,
        objUid,
        wrapRef,
        localUsed,
        userName,
      }
    );
  }, [
    fieldUid,
    userName,
    localUsed,
    objUid,
    wrapRef,
  ]);

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
};

export const useMainContext = (): MainContextType => {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("Missing MainContext");
  }
  return ctx;
};
