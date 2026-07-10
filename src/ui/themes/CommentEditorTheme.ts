import type { EditorThemeClasses } from "lexical";

import { LEXICAL_THEME } from "@/model";

import "./CommentEditorTheme.scss";

export const COMMENT_THEME: EditorThemeClasses = {
  ...LEXICAL_THEME,
  paragraph: "CommentEditorTheme__paragraph",
};
