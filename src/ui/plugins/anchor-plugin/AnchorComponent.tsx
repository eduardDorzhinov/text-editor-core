import {
  FC,
  MouseEvent,
  RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { IoCopyOutline } from "react-icons/io5";
import { MdOutlineDone } from "react-icons/md";
import { SlPencil } from "react-icons/sl";
import { TbCancel } from "react-icons/tb";

import clsx from "clsx";
import { $getNodeByKey, LexicalEditor } from "lexical";

import { makeUniqueAnchorId } from "@/lib/utils/make-uniq-ancor-id";
import { slugify } from "@/lib/utils/transliteration";
import { useClickOutside } from "@/vendor/shared";

import { AnchorNode } from "./AnchorNode";

import styles from "./anchor.module.scss";

type Props = {
  id: string,
  nodeKey: string,
  editor: LexicalEditor,
};

// Оценочная высота поповера (одна строка: инпут + 2 кнопки) — используется
// до первого замера, чтобы поповер сразу открывался в правильную сторону.
const ESTIMATED_POPUP_HEIGHT = 56;
const VERTICAL_GAP = 8;

// Верхняя граница, выше которой поповеру нельзя выезжать: низ липкого тулбара
// (а не край вьюпорта) — иначе поповер, открытый вверх, спрячется за тулбаром.
const getBoundaryTop = (el: HTMLElement | null): number => {
  const root = el?.closest("#text-creator-root");
  const toolbar = root?.querySelector<HTMLElement>(".toolbar");
  return toolbar ?
    toolbar.getBoundingClientRect().bottom :
    0;
};

export const AnchorComponent: FC<Props> = ({
  id,
  nodeKey,
  editor,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [ position, setPosition ] = useState<"left" | "right">("left");
  const [ vertical, setVertical ] = useState<"top" | "bottom">("top");
  const [ open, setOpen ] = useState(false);
  const [ editMode, setEditMode ] = useState(false);
  const [ inputValue, setInputValue ] = useState(id);
  const [ lastValue, setLastValue ] = useState(id);

  const isValue = inputValue.replace(/^#/, "").length;

  const save = () => {
    let formatValue = `${slugify(inputValue)}`;

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!(node instanceof AnchorNode)) return;

      formatValue = makeUniqueAnchorId(formatValue, nodeKey);
      node.setId(formatValue);
    });

    setLastValue(formatValue);
    setInputValue(formatValue);

    setOpen(false);
    setEditMode(false);
  };

  const copyAction = () => {
    navigator.clipboard.writeText(lastValue);
  };

  const editAction = () => {
    setEditMode(true);
    setLastValue(inputValue);
    queueMicrotask(() => inputRef.current?.focus());
  };

  const cancelAction = () => {
    setEditMode(false);
    setInputValue(lastValue);
  };

  const triggerOnClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const center = window.innerWidth / 2;
      setPosition(rect.left > center ?
        "right" :
        "left");
      // По вертикали: если над якорем не хватает места (он близко к верху
      // видимой области — под тулбаром), раскрываем поповер вниз, иначе он
      // уезжал за верхнюю границу. Точная высота уточняется в useLayoutEffect.
      const boundaryTop = getBoundaryTop(triggerRef.current);
      setVertical(rect.top - boundaryTop < ESTIMATED_POPUP_HEIGHT + VERTICAL_GAP ?
        "bottom" :
        "top");
    }

    setOpen(true);
  };

  // После рендера меряем реальную высоту поповера и его положение и,
  // если сверху всё же не помещается, разворачиваем вниз (как у ссылки).
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const popup = wrapRef.current;
    if (!trigger || !popup) return;
    const triggerRect = trigger.getBoundingClientRect();
    const popupHeight = popup.offsetHeight || ESTIMATED_POPUP_HEIGHT;
    const boundaryTop = getBoundaryTop(trigger);
    setVertical(triggerRect.top - boundaryTop < popupHeight + VERTICAL_GAP ?
      "bottom" :
      "top");
  }, [ open ]);


  useClickOutside(
    wrapRef as RefObject<HTMLElement>,
    triggerRef as RefObject<HTMLElement>,
    () => {
      cancelAction();
      setOpen(false);
    },
  );

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        className={clsx(styles.button, { [ styles.buttonEmpty ]: !isValue })}
        type="button"
        onClick={triggerOnClick}
      >
        #
      </button>

      {
        open && (
          <div
            ref={wrapRef}
            className={
              clsx(styles.popup,
                {
                  [ styles.popupRight ]: position === "right",
                  [ styles.popupLeft ]: position === "left",
                  [ styles.popupTop ]: vertical === "top",
                  [ styles.popupBottom ]: vertical === "bottom",
                })
            }
          >
            <input
              ref={inputRef}
              className={styles.input}
              disabled={!editMode}
              name="anchor_input"
              placeholder="anchor"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            {
              editMode ?
                (
                  <>
                    <button
                      className={styles.action}
                      onClick={cancelAction}
                    >
                      <TbCancel />
                    </button>
                    <button
                      className={styles.action}
                      disabled={!isValue}
                      onClick={save}
                    >
                      <MdOutlineDone />
                    </button>
                  </>
                ) :
                (
                  <>
                    <button
                      className={styles.action}
                      onClick={copyAction}
                    >
                      <IoCopyOutline />
                    </button>
                    <button
                      className={styles.action}
                      onClick={editAction}
                    >
                      <SlPencil />
                    </button>
                  </>
                )
            }

          </div>
        )
      }
    </div>
  );
};
