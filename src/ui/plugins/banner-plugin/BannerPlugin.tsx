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
  COMMAND_PRIORITY_CRITICAL,
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
  PASTE_COMMAND,
} from "lexical";

import { $createBannerNode, $isBannerNode, BannerNode } from "./BannerNode";

import "./Banner.scss";

export const INSERT_BANNER_COMMAND: LexicalCommand<void> = createCommand("INSERT_BANNER_COMMAND");

export function BannerPlugin(): null {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ BannerNode ])) {
      throw new Error("BannerPlugin: BannerNode is not registered on editor");
    }

    /** Пустой баннер по Delete/Backspace удаляется целиком (он shadow root). */
    const $onDeleteEmpty = () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
      const banner = $findMatchingParent(selection.anchor.getNode(), $isBannerNode);
      if (!$isBannerNode(banner)) return false;
      if (banner.getTextContent().trim() !== "") return false;

      const prev = banner.getPreviousSibling();
      if ($isElementNode(prev)) {
        banner.remove();
        prev.selectEnd();
        return true;
      }
      const next = banner.getNextSibling();
      if ($isElementNode(next)) {
        banner.remove();
        next.selectStart();
        return true;
      }
      const paragraph = $createParagraphNode();
      banner.replace(paragraph);
      paragraph.select();
      return true;
    };

    /** Вставка абзаца перед баннером при Arrow Up/Left на его первой границе. */
    const $onEscapeUp = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed() && selection.anchor.offset === 0) {
        const banner = $findMatchingParent(selection.anchor.getNode(), $isBannerNode);
        if ($isBannerNode(banner) &&
          selection.anchor.key === banner.getFirstDescendant()?.getKey()) {
          const parent = banner.getParent();
          if (parent !== null && parent.getFirstChild() === banner) {
            banner.insertBefore($createParagraphNode());
          }
        }
      }
      return false;
    };

    /** Вставка абзаца после баннера при Arrow Down/Right на его последней границе. */
    const $onEscapeDown = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        const banner = $findMatchingParent(selection.anchor.getNode(), $isBannerNode);
        if ($isBannerNode(banner)) {
          const parent = banner.getParent();
          const last = banner.getLastDescendant();
          if (
            parent !== null &&
            parent.getLastChild() === banner &&
            last !== null &&
            selection.anchor.key === last.getKey() &&
            selection.anchor.offset === last.getTextContentSize()
          ) {
            banner.insertAfter($createParagraphNode());
          }
        }
      }
      return false;
    };

    /**
     * Внутри баннера разрешён только текст: Cmd+V вставляет plain-text,
     * срезая любое форматирование и посторонние ноды.
     */
    const $onPaste = (event: ClipboardEvent | InputEvent | KeyboardEvent) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return false;
      const banner = $findMatchingParent(selection.anchor.getNode(), $isBannerNode);
      if (!$isBannerNode(banner)) return false;

      const clipboardData = event instanceof ClipboardEvent ?
        event.clipboardData :
        null;
      const text = clipboardData?.getData("text/plain") ?? "";
      event.preventDefault();
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) sel.insertText(text);
      });
      return true;
    };

    return mergeRegister(
      // Баннер без детей — добавляем пустой абзац (canBeEmpty: false).
      editor.registerNodeTransform(BannerNode, (node) => {
        if (node.getChildrenSize() === 0) {
          node.append($createParagraphNode());
        }
      }),

      editor.registerCommand(
        INSERT_BANNER_COMMAND,
        () => {
          editor.update(() => {
            const banner = $createBannerNode();
            const paragraph = $createParagraphNode();
            banner.append(paragraph);
            $insertNodeToNearestRoot(banner);
            paragraph.select();
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      editor.registerCommand(
        PASTE_COMMAND, $onPaste, COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND, $onDeleteEmpty, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND, $onDeleteEmpty, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND, $onEscapeUp, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND, $onEscapeUp, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND, $onEscapeDown, COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND, $onEscapeDown, COMMAND_PRIORITY_LOW,
      ),
    );
  }, [ editor ]);

  return null;
}
