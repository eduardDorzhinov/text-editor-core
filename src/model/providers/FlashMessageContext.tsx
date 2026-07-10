import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import FlashMessage from "@/ui/components/flash-message";

export type ShowFlashMessage = (
  message?: ReactNode,
  duration?: number,
) => void;

interface FlashMessageProps {
  message?: ReactNode,
  duration?: number,
}

const Context = createContext<ShowFlashMessage | undefined>(undefined);
const INITIAL_STATE: FlashMessageProps = {};
const DEFAULT_DURATION = 1000;

export const FlashMessageContext = ({
  children,
}: {
  children: ReactNode,
}) =>{
  const [ flashState, setFlashState ] = useState(INITIAL_STATE);
  const showFlashMessage = useCallback<ShowFlashMessage>((message, duration) =>
    setFlashState(message ?
      { duration, message } :
      INITIAL_STATE),
  []);
  useEffect(() => {
    if (flashState.message) {
      const timeoutId = setTimeout(() => setFlashState(INITIAL_STATE),
        flashState.duration ?? DEFAULT_DURATION);
      return () => clearTimeout(timeoutId);
    }
  }, [ flashState ]);
  return (
    <Context.Provider value={showFlashMessage}>
      {children}
      {flashState.message && <FlashMessage>{flashState.message}</FlashMessage>}
    </Context.Provider>
  );
};

export const useFlashMessageContext = (): ShowFlashMessage => {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("Missing FlashMessageContext");
  }
  return ctx;
};
