import { $createCodeNode } from "@lexical/code";
import {
  type ListType,
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from "@lexical/list";
import { $isDecoratorBlockNode } from "@lexical/react/LexicalDecoratorBlockNode";
import {
  $isHeadingNode,
  HeadingTagType,
} from "@lexical/rich-text";
import { $patchStyleText, $setBlocksType } from "@lexical/selection";
import { $isTableSelection } from "@lexical/table";
import {
  $getNearestBlockElementAncestorOrThrow,
  $getNearestNodeOfType,
} from "@lexical/utils";
import {
  $addUpdateTag,
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  LexicalEditor,
  LexicalNode,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SELECTION_FOCUS_TAG,
} from "lexical";

import {
  DEFAULT_FONT_SIZE,
  MAX_ALLOWED_FONT_SIZE,
  MIN_ALLOWED_FONT_SIZE,
} from "@/model/providers/ToolbarContext";
import { $createAnchorHeadingNode } from "@/ui/plugins/anchor-heading-plugin/anchor-heading-node-creator";
import { $isCustomListNode } from "@/ui/plugins/list-plugin/CustomListNode";

export enum UpdateFontSizeType {
  increment = 1,
  decrement,
}

export const calculateNextFontSize = (currentFontSize: number, updateType: UpdateFontSizeType | null) => {
  if (!updateType) {
    return currentFontSize;
  }
  // Шаг изменения 1px на всём диапазоне. Раньше шаг был разный
  // (1/2/4/12) в зависимости от размера — это удобно для презентаций,
  // но в long-form тексте мешает точной подгонке размера.
  const delta = updateType === UpdateFontSizeType.increment ?
    1 :
    -1;
  const next = currentFontSize + delta;
  if (next < MIN_ALLOWED_FONT_SIZE) return MIN_ALLOWED_FONT_SIZE;
  if (next > MAX_ALLOWED_FONT_SIZE) return MAX_ALLOWED_FONT_SIZE;
  return next;
};

/**
 * Patches the selection with the updated font size.
 */
export const updateFontSizeInSelection = (
  editor: LexicalEditor,
  newFontSize: string | null,
  updateType: UpdateFontSizeType | null,
  skipRefocus: boolean,
) => {
  const getNextFontSize = (prevFontSize: string | null): string => {
    if (!prevFontSize) {
      prevFontSize = `${DEFAULT_FONT_SIZE}px`;
    }
    prevFontSize = prevFontSize.slice(0, -2);
    const nextFontSize = calculateNextFontSize(Number(prevFontSize),
      updateType);
    return `${nextFontSize}px`;
  };

  editor.update(() => {
    if (skipRefocus) {
      $addUpdateTag(SKIP_DOM_SELECTION_TAG);
    }
    if (editor.isEditable()) {
      const selection = $getSelection();
      if (selection !== null) {
        $patchStyleText(selection, {
          "font-size": newFontSize || getNextFontSize,
        });
      }
    }
  });
};

export const formatParagraph = (editor: LexicalEditor) => {
  editor.update(() => {
    $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
    const selection = $getSelection();
    $setBlocksType(selection, () => $createParagraphNode());
  });
};

export const formatHeading = (
  editor: LexicalEditor,
  blockType: string,
  headingSize: HeadingTagType,
) => {
  if (blockType !== headingSize) {
    editor.update(() => {
      $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
      const selection = $getSelection();
      $setBlocksType(selection, () => $createAnchorHeadingNode(headingSize));
    });
  }
};

/**
 * Приводит весь вложенный список (родительский + все дочерние уровни)
 * к одному типу. Вызывается после INSERT_*_LIST_COMMAND, чтобы смена типа
 * на любом уровне применялась ко всей ноде-списку: нельзя было получить
 * родителя нумерованным, а вложенный — маркированным.
 */
const $unifyListTypeFromSelection = (type: ListType) => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  // Ищем самый верхний ListNode над кареткой — на любом уровне вложенности
  // подъём доходит до внешнего списка.
  let topList: ListNode | null = null;
  let current: LexicalNode | null = selection.anchor.getNode();
  while (current !== null) {
    if ($isListNode(current)) {
      topList = current;
    }
    current = current.getParent();
  }
  if (topList === null) return;

  // Собираем все ListNode в поддереве и выставляем им общий тип.
  const lists: ListNode[] = [];
  const collect = (node: LexicalNode) => {
    if ($isListNode(node)) lists.push(node);
    if ($isElementNode(node)) node.getChildren().forEach(collect);
  };
  collect(topList);
  lists.forEach((list) => {
    if (list.getListType() !== type) list.setListType(type);
  });
};

export const formatBulletList = (editor: LexicalEditor, blockType: string) => {
  if (blockType !== "bullet") {
    editor.update(() => {
      $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      $unifyListTypeFromSelection("bullet");
    });
  } else {
    formatParagraph(editor);
  }
};

/**
 * Меняет маркер (list-style-type) ближайшего к каретке маркированного
 * списка. Работает per-level: если каретка во вложенном <ul>, стиль
 * применяется именно к этому <ul>, а не к родительскому. Значение
 * undefined/"disc" — вернуть маркер по умолчанию.
 */
export const setBulletStyle = (editor: LexicalEditor,
  style: string | undefined) => {
  editor.update(() => {
    $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const anchorNode = selection.anchor.getNode();
    const list = $getNearestNodeOfType(anchorNode, ListNode);
    if ($isCustomListNode(list) && list.getListType() === "bullet") {
      list.setBulletStyle(style);
    }
  });
};

export const formatNumberedList = (editor: LexicalEditor,
  blockType: string) => {
  if (blockType !== "number") {
    editor.update(() => {
      $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      $unifyListTypeFromSelection("number");
    });
  } else {
    formatParagraph(editor);
  }
};

export const formatCode = (editor: LexicalEditor, blockType: string) => {
  if (blockType !== "code") {
    editor.update(() => {
      $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
      let selection = $getSelection();
      if (!selection) {
        return;
      }
      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        $setBlocksType(selection, () => $createCodeNode());
      } else {
        const textContent = selection.getTextContent();
        const codeNode = $createCodeNode();
        selection.insertNodes([ codeNode ]);
        selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertRawText(textContent);
        }
      }
    });
  }
};

export const clearFormatting = (editor: LexicalEditor, skipRefocus: boolean = false) => {
  editor.update(() => {
    if (skipRefocus) {
      $addUpdateTag(SKIP_DOM_SELECTION_TAG);
    }
    const selection = $getSelection();
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      const anchor = selection.anchor;
      const focus = selection.focus;
      const nodes = selection.getNodes();
      const extractedNodes = selection.extract();

      if (anchor.key === focus.key && anchor.offset === focus.offset) {
        return;
      }

      nodes.forEach((node, idx) => {
        // We split the first and last node by the selection
        // So that we don't format unselected text inside those nodes
        if ($isTextNode(node)) {
          // Use a separate variable to ensure TS does not lose the refinement
          let textNode = node;
          if (idx === 0 && anchor.offset !== 0) {
            textNode = textNode.splitText(anchor.offset)[ 1 ] || textNode;
          }
          if (idx === nodes.length - 1) {
            textNode = textNode.splitText(focus.offset)[ 0 ] || textNode;
          }
          /**
           * If the selected text has one format applied
           * selecting a portion of the text, could
           * clear the format to the wrong portion of the text.
           *
           * The cleared text is based on the length of the selected text.
           */
          // We need this in case the selected text only has one format
          const extractedTextNode = extractedNodes[ 0 ];
          if (nodes.length === 1 && $isTextNode(extractedTextNode)) {
            textNode = extractedTextNode;
          }

          if (textNode.__style !== "") {
            textNode.setStyle("");
          }
          if (textNode.__format !== 0) {
            textNode.setFormat(0);
          }
          const nearestBlockElement =
            $getNearestBlockElementAncestorOrThrow(textNode);
          if (nearestBlockElement.__format !== 0) {
            nearestBlockElement.setFormat("");
          }
          if (nearestBlockElement.__indent !== 0) {
            nearestBlockElement.setIndent(0);
          }
          node = textNode;
        } else if ($isHeadingNode(node)) {
          node.replace($createParagraphNode(), true);
        } else if ($isDecoratorBlockNode(node)) {
          node.setFormat("");
        }
      });
    }
  });
};

export const updateFontSize = (
  editor: LexicalEditor,
  updateType: UpdateFontSizeType,
  inputValue: string,
  skipRefocus: boolean = false,
) => {
  if (inputValue !== "") {
    const nextFontSize = calculateNextFontSize(Number(inputValue), updateType);
    updateFontSizeInSelection(
      editor,
      String(nextFontSize) + "px",
      null,
      skipRefocus,
    );
  } else {
    updateFontSizeInSelection(
      editor,
      null,
      updateType,
      skipRefocus,
    );
  }
};
