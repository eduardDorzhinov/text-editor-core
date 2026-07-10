import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiChevronDown, FiChevronRight, FiEye, FiEyeOff } from "react-icons/fi";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNodeByKey, $getRoot } from "lexical";

import { AnchorHeadingNode } from "@/ui/plugins/anchor-heading-plugin";

import {
  getStoredTocAccordionLevel,
  getStoredTocVisibleLevels,
  setStoredTocAccordionLevel,
  setStoredTocVisibleLevels,
} from "./toc-settings";

import styles from "./TOCSidebar.module.scss";

type TOCEntry = {
  key: string,
  id: string,
  text: string,
  level: number,
  hidden: boolean,
};

type EnrichedEntry = TOCEntry & {
  parentKey: string | null,
  // Визуально приглушено? OR по двум источникам: (1) per-entry скрытие
  // через глаз; (2) уровень исключён из списка отображаемых в дропдауне.
  displayHidden: boolean,
};

const TAG_TO_LEVEL: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

const ALL_LEVELS = [
  1,
  2,
  3,
  4,
  5,
  6,
];

/**
 * Дропдаун уровней заголовков, попадающих в содержание (множественный выбор).
 * Открывается по клику на триггер, закрывается по клику снаружи / Escape.
 */
const LevelsMultiSelect: FC<{
  value: Set<number>,
  available: number[],
  onChange: (next: Set<number>) => void,
}> = ({ value, available, onChange }) => {
  const [ open, setOpen ] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Закрытие по клику снаружи и по Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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

  const toggle = (level: number) => {
    const next = new Set(value);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    onChange(next);
  };

  // Сводка показывает только реально выбранные уровни, существующие в тексте,
  // чтобы не было "H2" в подписи, если такого уровня в документе нет.
  const summary = available
    .filter((l) => value.has(l))
    .map((l) => `H${l}`)
    .join(", ") || "Ничего не выбрано";

  return (
    <div
      ref={ref}
      className={styles.dropdown}
    >
      <button
        className={styles.dropdownTrigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.dropdownValue}>{summary}</span>
        <FiChevronDown
          className={
            `${styles.dropdownCaret} ${open ?
              styles.dropdownCaretOpen :
              ""}`
          }
        />
      </button>
      {
        open && (
          <div className={styles.dropdownMenu}>
            {
              available.length === 0 ?
                <div className={styles.dropdownEmpty}>Нет заголовков</div> :
                available.map((level) => {
                  const checked = value.has(level);
                  return (
                    <label
                      key={level}
                      className={styles.dropdownOption}
                    >
                      <input
                        checked={checked}
                        type="checkbox"
                        onChange={() => toggle(level)}
                      />
                      <span>H{level}</span>
                    </label>
                  );
                })
            }
          </div>
        )
      }
    </div>
  );
};

/**
 * Дропдаун выбора уровня заголовков, c которого вложенные группируются под
 * аккордеоном. `null` — без скрытия (плоский список).
 */
const AccordionLevelSelect: FC<{
  value: number | null,
  available: number[],
  onChange: (next: number | null) => void,
}> = ({ value, available, onChange }) => {
  return (
    <select
      className={styles.nativeSelect}
      value={
        value === null ?
          "" :
          String(value)
      }
      onChange={
        (e) => onChange(e.target.value === "" ?
          null :
          Number(e.target.value))
      }
    >
      <option value="">Без скрытия</option>
      {
        available.map((l) => (
          <option
            key={l}
            value={l}
          >
            {`С уровня H${l}`}
          </option>
        ))
      }
    </select>
  );
};

export const TOCSidebar: FC<{
  onClose: () => void,
}> = ({ onClose }) => {
  const [ editor ] = useLexicalComposerContext();
  const [ entries, setEntries ] = useState<TOCEntry[]>([]);

  // Инициализируем из localStorage — то же читает превью, чтобы списки
  // уровней в редакторе и превью совпадали.
  const [ visibleLevels, setVisibleLevels ] =
    useState<Set<number>>(() => getStoredTocVisibleLevels());
  // Инициализируем из localStorage — то же значение читает превью, поэтому
  // аккордеон в редакторе и превью совпадают.
  const [ accordionLevel, setAccordionLevel ] = useState<number | null>(() => getStoredTocAccordionLevel());
  // Развёрнутые аккордеоны (по умолчанию все свёрнуты).
  const [ expanded, setExpanded ] = useState<Set<string>>(new Set());

  const updateTOC = useCallback(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const items: TOCEntry[] = [];

      for (const child of root.getChildren()) {
        if ($isHeadingNode(child)) {
          const tag = child.getTag();
          const level = TAG_TO_LEVEL[ tag ] || 4;
          const text = child.getTextContent();
          const id = (child instanceof AnchorHeadingNode ?
            child.getId() :
            "") || "";
          const hidden = child instanceof AnchorHeadingNode ?
            child.isTocHidden() :
            false;

          if (text.trim()) {
            items.push({ key: child.getKey(), id, text: text.trim(), level, hidden });
          }
        }
      }

      setEntries(items);
    });
  }, [ editor ]);

  useEffect(() => {
    updateTOC();
    return editor.registerUpdateListener(() => updateTOC());
  }, [ editor, updateTOC ]);

  // Меняем уровень аккордеона: локальный стейт + localStorage (откуда
  // его читает превью). Это view-настройка, не часть контента, поэтому
  // живёт в localStorage, а не в нодах документа.
  const handleAccordionLevelChange = useCallback((next: number | null) => {
    setAccordionLevel(next);
    setStoredTocAccordionLevel(next);
  }, []);

  const scrollTo = useCallback((key: string) => {
    editor.getEditorState().read(() => {
      const el = editor.getElementByKey(key);
      if (!el) return;
      const scrollContainer = el.closest("#text-creator-root") || el.closest(".editor-scroller");
      if (scrollContainer) {
        const elRect = el.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const offset = elRect.top - containerRect.top + scrollContainer.scrollTop - 60;
        scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [ editor ]);

  const toggleHidden = useCallback((key: string) => {
    editor.update(() => {
      const node = $getNodeByKey(key);
      if (node instanceof AnchorHeadingNode) {
        node.setTocHidden(!node.isTocHidden());
      }
    });
  }, [ editor ]);

  // При включении уровня в дропдауне снимаем per-entry hidden у всех нод
  // этого уровня. Иначе: пользователь скрывает заголовок глазом, потом
  // снимает галку с уровня, потом возвращает — заголовок остаётся скрытым,
  // потому что node.hidden=true. Возврат уровня концептуально == «показать
  // все заголовки этого уровня».
  const handleVisibleLevelsChange = useCallback((next: Set<number>) => {
    const reEnabled: number[] = [];
    for (const level of next) {
      if (!visibleLevels.has(level)) reEnabled.push(level);
    }
    if (reEnabled.length > 0) {
      editor.update(() => {
        for (const entry of entries) {
          if (!reEnabled.includes(entry.level)) continue;
          const node = $getNodeByKey(entry.key);
          if (node instanceof AnchorHeadingNode && node.isTocHidden()) {
            node.setTocHidden(false);
          }
        }
      });
    }
    setVisibleLevels(next);
    // Персистим, чтобы превью исключало невыбранные уровни из содержания.
    setStoredTocVisibleLevels(next);
  }, [
    editor,
    entries,
    visibleLevels,
  ]);

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Уровни заголовков, реально встречающиеся в документе. Используется,
  // чтобы в дропдаунах не показывать H5/H6, если в тексте их нет.
  const availableLevels = useMemo(() => {
    const present = new Set<number>();
    for (const e of entries) present.add(e.level);
    return ALL_LEVELS.filter((l) => present.has(l));
  }, [ entries ]);

  // Если выбранный уровень аккордеона исчез из текста — сбрасываем
  // на «без скрытия», иначе в select'е окажется невалидное значение.
  useEffect(() => {
    if (accordionLevel !== null && !availableLevels.includes(accordionLevel)) {
      handleAccordionLevelChange(null);
    }
  }, [
    availableLevels,
    accordionLevel,
    handleAccordionLevelChange,
  ]);

  // Дропдаун «Уровни в содержании» НЕ выкидывает записи из списка,
  // а лишь визуально приглушает их — как если бы пользователь нажал глаз
  // на каждой записи этого уровня. Поэтому структура (порядок, accordion-
  // группировка) считается по полному списку entries.
  const enrichedEntries = useMemo<EnrichedEntry[]>(() => {
    return entries.map((e, i) => {
      let parentKey: string | null = null;
      if (accordionLevel !== null && e.level > accordionLevel) {
        for (let j = i - 1; j >= 0; j--) {
          if (entries[ j ].level <= accordionLevel) {
            parentKey = entries[ j ].key;
            break;
          }
        }
      }
      const displayHidden = e.hidden || !visibleLevels.has(e.level);
      return { ...e, parentKey, displayHidden };
    });
  }, [
    entries,
    accordionLevel,
    visibleLevels,
  ]);

  // Ключи записей, у которых есть дети-аккордеона (только им рисуем chevron).
  const accordionParents = useMemo(() => {
    const set = new Set<string>();
    if (accordionLevel === null) return set;
    for (const e of enrichedEntries) {
      if (e.parentKey !== null) set.add(e.parentKey);
    }
    return set;
  }, [ enrichedEntries, accordionLevel ]);

  // Финальный список к рендеру: если есть родитель — показываем только если
  // он развёрнут. Без accordionLevel у всех parentKey = null → показываются все.
  const visibleEntries = useMemo(() => enrichedEntries.filter((e) =>
    e.parentKey === null || expanded.has(e.parentKey)),
  [ enrichedEntries, expanded ]);

  const minLevel = visibleEntries.length > 0 ?
    Math.min(...visibleEntries.map((e) => e.level)) :
    1;

  return (
    <div className={`${styles.panel} TOCSidebar_Panel`}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Содержание</h2>
        <button
          aria-label="Закрыть"
          className={styles.closeButton}
          type="button"
          onClick={onClose}
        >
          &times;
        </button>
      </div>
      {
        entries.length === 0 ?
          <div className={styles.empty}>Добавьте заголовки в текст</div> :
          (
            <div className={styles.body}>
              {
                visibleEntries.length === 0 ?
                  <div className={styles.empty}>Нет заголовков для отображения</div> :
                  (
                    <ul className={styles.list}>
                      {
                        visibleEntries.map((entry) => {
                          const isAccordionParent = accordionParents.has(entry.key);
                          const isOpen = expanded.has(entry.key);
                          return (
                            <li
                              key={entry.key}
                              className={
                                `${styles.item} ${entry.displayHidden ?
                                  styles.itemHidden :
                                  ""}`
                              }
                              style={
                                {
                                  paddingLeft: `${(entry.level - minLevel) * 16 + 8}px`,
                                }
                              }
                            >
                              {
                                isAccordionParent ?
                                  (
                                    <button
                                      aria-label={
                                        isOpen ?
                                          "Свернуть" :
                                          "Развернуть"
                                      }
                                      className={styles.accordionToggle}
                                      type="button"
                                      onClick={() => toggleExpanded(entry.key)}
                                    >
                                      {
                                        isOpen ?
                                          <FiChevronDown /> :
                                          <FiChevronRight />
                                      }
                                    </button>
                                  ) :
                                  <span className={styles.accordionSpacer} />
                              }
                              <span className={styles.levelBadge}>H{entry.level}</span>
                              <button
                                className={styles.link}
                                type="button"
                                onClick={() => scrollTo(entry.key)}
                              >
                                {entry.text}
                              </button>
                              <button
                                className={styles.visibilityBtn}
                                title={
                                  entry.displayHidden ?
                                    "Показать в содержании" :
                                    "Скрыть из содержания"
                                }
                                type="button"
                                onClick={() => toggleHidden(entry.key)}
                              >
                                {
                                  entry.displayHidden ?
                                    <FiEyeOff /> :
                                    <FiEye />
                                }
                              </button>
                            </li>
                          );
                        })
                      }
                    </ul>
                  )
              }
            </div>
          )
      }
      <div className={styles.footer}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Уровни в содержании</span>
          <LevelsMultiSelect
            available={availableLevels}
            value={visibleLevels}
            onChange={handleVisibleLevelsChange}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Сворачивать с уровня</span>
          <AccordionLevelSelect
            available={availableLevels}
            value={accordionLevel}
            onChange={handleAccordionLevelChange}
          />
        </label>
      </div>
    </div>
  );
};
