import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  LexicalCommand,
} from "lexical";

import {
  $createAuthorQuoteAuthorNode,
  $isAuthorQuoteAuthorNode,
  AuthorQuoteAuthorNode,
} from "./AuthorQuoteAuthorNode";
import {
  $createAuthorQuoteContentNode,
  $isAuthorQuoteContentNode,
  AuthorQuoteContentNode,
} from "./AuthorQuoteContentNode";
import {
  $createAuthorQuoteNode,
  $isAuthorQuoteNode,
  AuthorQuoteNode,
} from "./AuthorQuoteNode";

export const INSERT_AUTHOR_QUOTE_COMMAND: LexicalCommand<void> = createCommand("INSERT_AUTHOR_QUOTE_COMMAND");
export const TOGGLE_AUTHOR_QUOTE_AUTHOR_COMMAND: LexicalCommand<string> = createCommand("TOGGLE_AUTHOR_QUOTE_AUTHOR_COMMAND");

export function AuthorQuotePlugin(): null {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([
      AuthorQuoteNode,
      AuthorQuoteContentNode,
      AuthorQuoteAuthorNode,
    ])) {
      throw new Error("AuthorQuotePlugin: nodes not registered on editor");
    }

    /** Вставка нового абзаца перед/после контейнера при Arrow Up/Down на границах. */
    const $onEscapeUp = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed() && selection.anchor.offset === 0) {
        const container = $findMatchingParent(selection.anchor.getNode(), $isAuthorQuoteNode);
        if ($isAuthorQuoteNode(container)) {
          const parent = container.getParent();
          if (
            parent !== null &&
            parent.getFirstChild() === container &&
            selection.anchor.key === container.getFirstDescendant()?.getKey()
          ) {
            container.insertBefore($createParagraphNode());
          }
        }
      }
      return false;
    };

    const $onEscapeDown = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        const container = $findMatchingParent(selection.anchor.getNode(), $isAuthorQuoteNode);
        if ($isAuthorQuoteNode(container)) {
          const parent = container.getParent();
          if (parent !== null && parent.getLastChild() === container) {
            const lastDescendant = container.getLastDescendant();
            if (
              lastDescendant !== null &&
              selection.anchor.key === lastDescendant.getKey() &&
              selection.anchor.offset === lastDescendant.getTextContentSize()
            ) {
              container.insertAfter($createParagraphNode());
            }
          }
        }
      }
      return false;
    };

    /**
     * Пустой блок цитаты по Delete/Backspace удаляется целиком. Контейнер —
     * shadow root (isShadowRoot: true), поэтому обычные Delete/Backspace не
     * выходят за его границы и не удаляют его — приходилось «уводить курсор».
     * Пустой = нет текста в контенте и нет заполненного автора.
     */
    const $onDeleteEmptyQuote = () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;

      const container = $findMatchingParent(selection.anchor.getNode(), $isAuthorQuoteNode);
      if (!$isAuthorQuoteNode(container)) return false;

      const contentEmpty = container.getTextContent().trim() === "";
      const author = container.getAuthorNode();
      const authorEmpty = !author ||
        (author.getName().trim() === "" &&
          author.getAuthorTitle().trim() === "" &&
          author.getAvatarSrc().trim() === "");
      if (!contentEmpty || !authorEmpty) return false;

      // Удаляем цитату, ставим каретку в соседний блок; если соседей нет —
      // заменяем пустым параграфом.
      const prev = container.getPreviousSibling();
      if ($isElementNode(prev)) {
        container.remove();
        prev.selectEnd();
        return true;
      }
      const next = container.getNextSibling();
      if ($isElementNode(next)) {
        container.remove();
        next.selectStart();
        return true;
      }
      const paragraph = $createParagraphNode();
      container.replace(paragraph);
      paragraph.select();
      return true;
    };

    return mergeRegister(
      // Целостность структуры контейнера: внутри должен быть один Content,
      // опционально Author в конце.
      editor.registerNodeTransform(AuthorQuoteNode, (node) => {
        const children = node.getChildren();
        const hasContent = children.some($isAuthorQuoteContentNode);
        if (!hasContent) {
          // Пустой контейнер — добавим пустой content с параграфом
          const content = $createAuthorQuoteContentNode();
          content.append($createParagraphNode());
          node.splice(
            0, 0, [ content ],
          );
        }
        // Если посторонние дети (не Content и не Author) на верхнем уровне —
        // переносим их перед контейнером (вытаскиваем наружу).
        for (const child of node.getChildren()) {
          if (!$isAuthorQuoteContentNode(child) && !$isAuthorQuoteAuthorNode(child)) {
            node.insertBefore(child);
          }
        }
      }),

      editor.registerNodeTransform(AuthorQuoteContentNode, (node) => {
        const parent = node.getParent();
        if (!$isAuthorQuoteNode(parent)) {
          // Контент вне контейнера → разворачиваем в обычные параграфы
          const children = node.getChildren();
          for (const child of children) {
            node.insertBefore(child);
          }
          node.remove();
        }
      }),

      editor.registerNodeTransform(AuthorQuoteAuthorNode, (node) => {
        const parent = node.getParent();
        if (!$isAuthorQuoteNode(parent)) {
          node.remove();
        }
      }),

      editor.registerCommand(
        INSERT_AUTHOR_QUOTE_COMMAND,
        () => {
          editor.update(() => {
            const container = $createAuthorQuoteNode();
            const content = $createAuthorQuoteContentNode();
            const paragraph = $createParagraphNode();
            content.append(paragraph);
            container.append(content);
            $insertNodeToNearestRoot(container);
            paragraph.select();
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      editor.registerCommand<string>(
        TOGGLE_AUTHOR_QUOTE_AUTHOR_COMMAND,
        (containerKey) => {
          editor.update(() => {
            const container = editor.getEditorState()._nodeMap.get(containerKey);
            if (!$isAuthorQuoteNode(container)) return;
            const writable = container.getWritable();
            const existing = writable.getAuthorNode();
            if (existing) {
              existing.remove();
            } else {
              writable.append($createAuthorQuoteAuthorNode());
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      editor.registerCommand(
        KEY_DELETE_COMMAND, $onDeleteEmptyQuote, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND, $onDeleteEmptyQuote, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND, $onEscapeDown, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND, $onEscapeDown, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND, $onEscapeUp, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND, $onEscapeUp, COMMAND_PRIORITY_LOW,
      ),
    );
  }, [ editor ]);

  return null;
}
