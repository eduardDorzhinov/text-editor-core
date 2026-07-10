import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { useSettings } from "@/model/providers/SettingsContext";
import { CommentStore } from "@/ui/plugins/comment-plugin/comment-store";

interface CommentContextType {
  showCommentSidebar: boolean,
  commentStore: CommentStore | null,
  setShowCommentSidebar: Dispatch<SetStateAction<boolean>> | (() => null),
}

const INITIAL_STATE: CommentContextType = {
  showCommentSidebar: false,
  commentStore: null,
  setShowCommentSidebar: () => null,
};

const Context = createContext<CommentContextType>(INITIAL_STATE);

export const CommentContextProvider = ({
  children,
}: {
  children: ReactNode,
}) => {
  const { settings: { commentMode }} = useSettings();
  const [ editor ] = useLexicalComposerContext();

  const [ showCommentSidebar, setShowCommentSidebar ] = useState(false);

  const commentStore = useMemo(() => new CommentStore(editor), [ editor ]);

  useEffect(() => {
    if (!commentMode) setShowCommentSidebar(false);
  }, [ commentMode ]);

  const value = useMemo(() => {
    return (
      {
        showCommentSidebar,
        setShowCommentSidebar,
        commentStore,
      }
    );
  }, [ commentStore, showCommentSidebar ]);

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
};

export const useCommentContext = (): CommentContextType => {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("Missing CommentContext");
  }
  return ctx;
};
