import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { MdHighlight } from "react-icons/md";

import { $patchStyleText } from "@lexical/selection";
import {
  $addUpdateTag,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  LexicalCommand,
  LexicalEditor,
  SKIP_DOM_SELECTION_TAG,
} from "lexical";

import { ColorPicker } from "@/ui/components/color-picker";
import { Tooltip } from "@/ui/components/tooltip";

/**
 * Открывает дропдаун цвета выделения (ColorPicker). Диспатчится из
 * хоткея highlight (Mod+Shift+H) — раньше хоткей ставил старый жёлтый
 * highlight через FORMAT_TEXT_COMMAND, теперь открывает то же меню,
 * что и кнопка «Выделение» в тулбаре.
 */
export const OPEN_HIGHLIGHT_MENU_COMMAND: LexicalCommand<void> =
  createCommand("OPEN_HIGHLIGHT_MENU_COMMAND");

import styles from "./HighlightDropdown.module.scss";

/**
 * Цвет по умолчанию, который ставится при клике на пресет без явного выбора
 * (используется как fallback, если у выделения ещё нет своего background-color).
 * #fff59d — близкий к жёлтому маркеру из Google Docs.
 */
const DEFAULT_HIGHLIGHT_COLOR = "#fff59d";

/**
 * Является ли цвет «пустым» (т.е. подсветка не применена). Сюда же относим
 * белый — в превью/документе он визуально не отличим от отсутствия фона,
 * поэтому индикатор полоски под иконкой его не показывает.
 */
const isEmptyColor = (c: string | null | undefined): boolean => {
  if (!c) return true;
  const lc = c.trim().toLowerCase();
  return lc === "" || lc === "transparent" || lc === "#fff" || lc === "#ffffff" || lc === "rgb(255, 255, 255)" || lc === "rgba(0, 0, 0, 0)";
};

interface HighlightDropdownProps {
  editor: LexicalEditor,
  /** Текущий цвет фона selection'а — снимается через $getSelectionStyleValueForProperty в Toolbar. */
  currentColor: string,
  disabled?: boolean,
}

export function HighlightDropdown({
  editor,
  currentColor,
  disabled = false,
}: HighlightDropdownProps): ReactNode {
  const [ open, setOpen ] = useState(false);
  // «Последний выбранный» цвет — помним в этой сессии, чтобы при пустом
  // выделении полоска под иконкой что-то показывала и быстрый клик по
  // пресету в пикере работал предсказуемо.
  const [ lastColor, setLastColor ] = useState<string>(DEFAULT_HIGHLIGHT_COLOR);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Меню рендерится порталом в body с position:fixed, чтобы не обрезалось
  // тулбаром с горизонтальным скроллом. Координаты — под кнопкой.
  const [ pos, setPos ] = useState<{ top: number, left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const update = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    };
    update();
    document.addEventListener(
      "scroll", update, true,
    );
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener(
        "scroll", update, true,
      );
      window.removeEventListener("resize", update);
    };
  }, [ open ]);

  // Синхронизируем lastColor с реально применённым цветом, когда курсор
  // попадает в выделенный участок: пользователю удобнее повторно применять
  // именно тот цвет, который он уже видит.
  useEffect(() => {
    if (!isEmptyColor(currentColor)) setLastColor(currentColor);
  }, [ currentColor ]);

  // Открытие меню по хоткею (Mod+Shift+H). COMMAND_PRIORITY_LOW —
  // достаточно, конкуренции за эту команду нет.
  useEffect(() => {
    return editor.registerCommand(
      OPEN_HIGHLIGHT_MENU_COMMAND,
      () => {
        setOpen(true);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [ editor ]);

  // Закрытие по клику снаружи и Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      const insideWrap = wrapRef.current?.contains(t);
      const insidePopover = popoverRef.current?.contains(t);
      if (!insideWrap && !insidePopover) {
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
   * Применить background-color к выделенному тексту.
   * value === "" → удалить background-color (через $patchStyleText(..., null)).
   *
   * skipRefocus сохраняет курсор в редакторе при выборе цвета мышью —
   * иначе селекция теряется до выхода из ColorPicker.
   */
  const applyColor = useCallback((value: string, skipRefocus: boolean = false) => {
    editor.update(() => {
      if (skipRefocus) $addUpdateTag(SKIP_DOM_SELECTION_TAG);
      const selection = $getSelection();
      if (!selection) return;
      // Передавать null = удалить свойство; пустую строку Lexical
      // воспринимает как валидное значение и оставит "background-color:".
      $patchStyleText(selection, {
        "background-color": value === "" ?
          null :
          value,
      });
    });
  }, [ editor ]);

  const onColorChange = useCallback((
    value: string,
    _skipHistoryStack: boolean,
    skipRefocus: boolean,
  ) => {
    setLastColor(value);
    applyColor(value, skipRefocus);
  }, [ applyColor ]);

  /**
   * «Очистить» подсветку.
   *  - Есть выделение → снимаем background-color с выделенного текста.
   *  - Каретка без выделения → отключаем подсветку для ПОСЛЕДУЮЩЕГО ввода:
   *    обнуляем pending-стиль каретки. Так как он ("") ≠ стилю подсвеченной
   *    ноды, ядро Lexical при вводе включает controlled-вставку
   *    ($shouldPreventDefaultAndInsertText) и создаёт новую ноду без
   *    background-color. Фокус не теряем (preventDefault на кнопках), иначе
   *    selectionchange заново выведет стиль каретки из подсвеченной ноды.
   */
  const onRemove = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!selection) return;
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        // SKIP_DOM_SELECTION_TAG — не трогаем DOM-выделение, иначе оно вызовет
        // selectionchange, а тот заново выведет стиль каретки из подсвеченной
        // ноды и обнулит нашу очистку.
        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
        selection.setStyle("");
      } else {
        applyColor("", true);
      }
    });
    setOpen(false);
  }, [ editor, applyColor ]);

  // Полоска под иконкой — индикатор подсветки ТЕКУЩЕГО выделения. Показываем
  // строго фактический цвет: на тексте без подсветки полоска прозрачная.
  // Раньше был фолбэк на lastColor — из-за него индикатор «залипал» на
  // последнем цвете при переходе на текст без подсветки.
  const stripeColor = currentColor;
  const showStripe = !isEmptyColor(stripeColor);

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
    >
      <Tooltip
        hotkeyId="highlight"
        label="Цвет выделения"
      >
        <button
          aria-haspopup="true"
          aria-label="Цвет выделения"
          className={
            `toolbar-item spaced ${styles.trigger} ${!isEmptyColor(currentColor) ?
              "active" :
              ""}`
          }
          disabled={disabled}
          type="button"
          // preventDefault — не отдаём фокус из редактора при открытии меню:
          // иначе selectionchange заново выведет стиль каретки из подсвеченной
          // ноды и «Очистить» не сможет отключить подсветку для ввода.
          onClick={() => setOpen((v) => !v)}
          onMouseDown={(e) => e.preventDefault()}
        >
          <MdHighlight />
          <span
            className={styles.stripe}
            style={
              {
                backgroundColor: showStripe ?
                  stripeColor :
                  "transparent",
              }
            }
          />
        </button>
      </Tooltip>
      {
        open && createPortal(<div
          ref={popoverRef}
          className={styles.popover}
          style={
            {
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
            }
          }
        >
          <ColorPicker
            useColorPicker
            color={
              !isEmptyColor(currentColor) ?
                currentColor :
                lastColor
            }
            onChange={onColorChange}
          />
          <button
            className={styles.removeBtn}
            type="button"
            onClick={onRemove}
            onMouseDown={(e) => e.preventDefault()}
          >
            Очистить
          </button>
        </div>,
        // Портал в #text-creator-root (а не body) — чтобы сохранились
        // scoped-стили; position:fixed вырывает меню из overflow тулбара.
        wrapRef.current?.closest("#text-creator-root") ?? document.body)
      }
    </div>
  );
}
