import {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import {
  $findMatchingParent,
  mergeRegister,
} from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  NodeKey,
  SELECTION_CHANGE_COMMAND,
} from "lexical";

import { ColorPicker } from "@/ui/components/color-picker";

import {
  $isLayoutContainerNode,
  LayoutContainerNode,
} from "./LayoutContainerNode";
import { $isLayoutItemNode, LayoutItemNode } from "./LayoutItemNode";

import "./ColumnToolbar.scss";

/**
 * Тулбар колонок — sticky, появляется, когда каретка внутри LayoutItemNode.
 * Даёт:
 *  - Цвет фона колонки (через ColorPicker)
 *  - «Скопировать колонку» / «Скопировать все колонки» — выделяет нужный
 *    диапазон и вызывает document.execCommand("copy"). Lexical-обработчик
 *    клавиатурного copy пишет в буфер и HTML, и JSON-формат с маркерами
 *    data-lexical-layout-*, поэтому вставка обратно восстанавливает
 *    структуру колонок, а не вываливает голый текст.
 */
export function ColumnToolbar(): ReactElement | null {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();

  const [ itemKey, setItemKey ] = useState<NodeKey | null>(null);
  const [ containerKey, setContainerKey ] = useState<NodeKey | null>(null);
  const [ backgroundColor, setBackgroundColor ] = useState<string>("");
  const [ open, setOpen ] = useState(false);
  // Чекбокс «применить ко всем колонкам контейнера». Когда включён —
  // setBackgroundColor пишется во все LayoutItem'ы родительского
  // LayoutContainer, не только в текущий.
  const [ applyToAll, setApplyToAll ] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);

  // Считываем ближайшие LayoutItemNode/LayoutContainerNode по каретке.
  const sync = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        setItemKey(null);
        setContainerKey(null);
        return;
      }
      const node = selection.anchor.getNode();
      const item = $findMatchingParent(node, $isLayoutItemNode);
      if (!item) {
        setItemKey(null);
        setContainerKey(null);
        return;
      }
      const container = $findMatchingParent(item, $isLayoutContainerNode);
      setItemKey(item.getKey());
      setContainerKey(container ?
        container.getKey() :
        null);
      setBackgroundColor(item.getBackgroundColor() || "");
    });
  }, [ editor ]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => sync()),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          sync();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerMutationListener(LayoutItemNode, () => sync()),
      editor.registerMutationListener(LayoutContainerNode, () => sync()),
    );
  }, [ editor, sync ]);

  // При уходе из колонки закрываем дропдаун.
  useEffect(() => {
    if (!itemKey) setOpen(false);
  }, [ itemKey ]);

  // Закрытие popover по клику снаружи и Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener(
      "pointerdown", onPointer, true,
    );
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener(
        "pointerdown", onPointer, true,
      );
      window.removeEventListener("keydown", onKey);
    };
  }, [ open ]);

  /**
   * Применить фон. В режиме applyToAll проходимся по всем колонкам
   * родительского контейнера; иначе — только текущая колонка.
   */
  const applyBackground = useCallback((value: string | null) => {
    if (!itemKey) return;
    editor.update(() => {
      if (applyToAll && containerKey) {
        const container = $getNodeByKey(containerKey);
        if ($isLayoutContainerNode(container)) {
          container.getChildren().forEach((child) => {
            if ($isLayoutItemNode(child)) child.setBackgroundColor(value);
          });
          return;
        }
      }
      const item = $getNodeByKey(itemKey);
      if ($isLayoutItemNode(item)) item.setBackgroundColor(value);
    });
  }, [
    editor,
    itemKey,
    containerKey,
    applyToAll,
  ]);

  const onChangeColor = useCallback((value: string) => {
    applyBackground(value || null);
  }, [ applyBackground ]);

  const onRemoveColor = useCallback(() => {
    applyBackground(null);
    setOpen(false);
  }, [ applyBackground ]);

  if (!isEditable || !itemKey) return null;

  return (
    <div
      ref={wrapRef}
      className="column-toolbar"
    >
      <div className="column-toolbar__color">
        <button
          className={
            `column-toolbar__btn${backgroundColor ?
              " column-toolbar__btn--active" :
              ""}`
          }
          type="button"
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className="column-toolbar__color-swatch"
            style={
              {
                backgroundColor: backgroundColor || "transparent",
                backgroundImage: backgroundColor ?
                  undefined :
                  "linear-gradient(45deg, #d8dadd 25%, transparent 25%, transparent 75%, #d8dadd 75%), linear-gradient(45deg, #d8dadd 25%, transparent 25%, transparent 75%, #d8dadd 75%)",
                backgroundPosition: backgroundColor ?
                  undefined :
                  "0 0, 4px 4px",
                backgroundSize: backgroundColor ?
                  undefined :
                  "8px 8px",
              }
            }
          />
          <span>Цвет фона</span>
        </button>
        {
          open && (
            <div className="column-toolbar__popover">
              <ColorPicker
                useColorPicker
                color={backgroundColor || "#ffffff"}
                onChange={onChangeColor}
              />
              <label className="column-toolbar__apply-all">
                <input
                  checked={applyToAll}
                  disabled={!containerKey}
                  type="checkbox"
                  onChange={(e) => setApplyToAll(e.target.checked)}
                />
                <span>Применить ко всем колонкам</span>
              </label>
              <button
                className="column-toolbar__remove-btn"
                type="button"
                onClick={onRemoveColor}
              >
                Убрать фон
              </button>
            </div>
          )
        }
      </div>

      <span className="column-toolbar__divider" />
    </div>
  );
}
