import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from "@lexical/utils";
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  createCommand,
  ElementNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalCommand,
  LexicalNode,
  NodeKey,
} from "lexical";

import {
  $createLayoutContainerNode,
  $isLayoutContainerNode,
  LayoutContainerNode,
} from "./LayoutContainerNode";
import {
  $createLayoutItemNode,
  $isLayoutItemNode,
  LayoutItemNode,
} from "./LayoutItemNode";

export const INSERT_LAYOUT_COMMAND: LexicalCommand<string> =
  createCommand<string>();

export const UPDATE_LAYOUT_COMMAND: LexicalCommand<{
  template: string,
  nodeKey: NodeKey,
}> = createCommand<{ template: string, nodeKey: NodeKey }>();

export function LayoutPlugin(): null {
  const [ editor ] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([ LayoutContainerNode, LayoutItemNode ])) {
      throw new Error("LayoutPlugin: LayoutContainerNode, or LayoutItemNode not registered on editor");
    }

    const $onEscape = (before: boolean) => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return false;
      }

      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      // «before» (вверх/влево) — курсор должен стоять в самом начале контента;
      // «after» (вниз/вправо) — в самом конце последнего потомка колонок,
      // иначе стрелка просто двигает каретку внутри колонки (напр. между
      // строками/абзацами), а новый абзац не добавляется.
      const atBoundary = before ?
        anchor.offset === 0 :
        anchor.offset === anchorNode.getTextContentSize();
      if (!atBoundary) {
        return false;
      }

      const container = $findMatchingParent(anchorNode,
        $isLayoutContainerNode);
      if (!$isLayoutContainerNode(container)) {
        return false;
      }

      const parent = container.getParent<ElementNode>();
      const child =
        parent &&
        (before ?
          parent.getFirstChild<LexicalNode>() :
          parent.getLastChild<LexicalNode>());
      const descendant = before ?
        container.getFirstDescendant<LexicalNode>()?.getKey() :
        container.getLastDescendant<LexicalNode>()?.getKey();

      if (
        parent !== null &&
        child === container &&
        anchor.key === descendant
      ) {
        if (before) {
          container.insertBefore($createParagraphNode());
        } else {
          // Колонки — последняя нода, каретка в конце последней колонки:
          // добавляем пустой абзац после и переносим в него курсор.
          const paragraph = $createParagraphNode();
          container.insertAfter(paragraph);
          paragraph.selectEnd();
          return true;
        }
      }

      return false;
    };

    const $fillLayoutItemIfEmpty = (node: LayoutItemNode) => {
      if (node.isEmpty()) {
        node.append($createParagraphNode());
      }
    };

    const $removeIsolatedLayoutItem = (node: LayoutItemNode): boolean => {
      const parent = node.getParent<ElementNode>();
      if (!$isLayoutContainerNode(parent)) {
        const children = node.getChildren<LexicalNode>();
        for (const child of children) {
          node.insertBefore(child);
        }
        node.remove();
        return true;
      }
      return false;
    };

    return mergeRegister(
      // Стрелки регистрируем на COMMAND_PRIORITY_HIGH, а не LOW: у Lexical
      // есть штатный обработчик стрелок на COMMAND_PRIORITY_NORMAL, который на
      // границе контента возвращает true (гасит событие). На LOW наш обработчик
      // до него не доходил, и «выход» из последней колонки не срабатывал.
      // $onEscape возвращает true только когда реально вставляет абзац —
      // в остальных случаях false, поэтому обычное перемещение каретки не ломаем.
      //
      // When layout is the last child pressing down/right arrow will insert paragraph
      // below it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if trailing paragraph is accidentally deleted
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        () => $onEscape(false),
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        () => $onEscape(false),
        COMMAND_PRIORITY_HIGH,
      ),
      // When layout is the first child pressing up/left arrow will insert paragraph
      // above it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if leading paragraph is accidentally deleted
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => $onEscape(true),
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        () => $onEscape(true),
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        INSERT_LAYOUT_COMMAND,
        (template) => {
          editor.update(() => {
            const container = $createLayoutContainerNode(template);
            const itemsCount = getItemsCountFromTemplate(template);

            for (let i = 0; i < itemsCount; i++) {
              container.append($createLayoutItemNode().append($createParagraphNode()));
            }

            $insertNodeToNearestRoot(container);
            container.selectStart();
          });

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        UPDATE_LAYOUT_COMMAND,
        ({ template, nodeKey }) => {
          editor.update(() => {
            const container = $getNodeByKey<LexicalNode>(nodeKey);

            if (!$isLayoutContainerNode(container)) {
              return;
            }

            const itemsCount = getItemsCountFromTemplate(template);
            const prevItemsCount = getItemsCountFromTemplate(container.getTemplateColumns());

            // Add or remove extra columns if new template does not match existing one
            if (itemsCount > prevItemsCount) {
              for (let i = prevItemsCount; i < itemsCount; i++) {
                container.append($createLayoutItemNode().append($createParagraphNode()));
              }
            } else if (itemsCount < prevItemsCount) {
              for (let i = prevItemsCount - 1; i >= itemsCount; i--) {
                const layoutItem = container.getChildAtIndex<LexicalNode>(i);

                if ($isLayoutItemNode(layoutItem)) {
                  layoutItem.remove();
                }
              }
            }

            container.setTemplateColumns(template);
          });

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),

      editor.registerNodeTransform(LayoutItemNode, (node) => {
        // Structure enforcing transformers for each node type. In case nesting structure is not
        // "Container > Item" it'll unwrap nodes and convert it back
        // to regular content.
        const isRemoved = $removeIsolatedLayoutItem(node);

        if (!isRemoved) {
          // Layout item should always have a child. this function will listen
          // for any empty layout item and fill it with a paragraph node
          $fillLayoutItemIfEmpty(node);
        }
      }),
      editor.registerNodeTransform(LayoutContainerNode, (node) => {
        const children = node.getChildren<LexicalNode>();
        if (!children.every($isLayoutItemNode)) {
          for (const child of children) {
            node.insertBefore(child);
          }
          node.remove();
        }
      }),
    );
  }, [ editor ]);

  return null;
}

function getItemsCountFromTemplate(template: string): number {
  return template.trim().split(/\s+/).length;
}
