import {
  FC,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type Hotkey,
  type HotkeyGroup,
  formatHotkey,
  getExtensionHotkeys,
  HOTKEY_GROUP_LABELS,
  HOTKEYS,
} from "@/lib/hotkeys";
import { getEditorExtensionHiddenHotkeys } from "@/model/editor-extensions";
import { useSettings } from "@/model/providers/SettingsContext";

import styles from "./HotkeysSidebar.module.scss";

/**
 * Собирает id хоткеев, чьи действия отключены в настройках — их не нужно
 * показывать в сайдбаре, т.к. соответствующие команды недоступны.
 * Маппинг повторяет гейтинг в Toolbar/ActionsPlugin.
 */
const getHiddenHotkeyIds = (settings: ReturnType<typeof useSettings>[ "settings" ]): Set<string> => {
  const hidden = new Set<string>();
  if (!settings.commentMode) hidden.add("action-comments");
  if (!(settings.videoUrl || settings.videoUpload || settings.videoRutube || settings.videoVk)) hidden.add("insert-video");
  if (!(settings.audioUrl || settings.audioUpload)) hidden.add("insert-audio");
  if (!(settings.downloadUrl || settings.downloadUpload)) hidden.add("insert-download");
  if (!(settings.pdfUrl || settings.pdfUpload)) hidden.add("insert-pdf");
  // Гейтинг вставок из расширений по флагам настроек.
  for (const id of getEditorExtensionHiddenHotkeys(settings)) hidden.add(id);
  return hidden;
};

const GROUP_ORDER: HotkeyGroup[] = [
  "format",
  "block",
  "list",
  "insert",
  "history",
  "navigation",
  "interface",
];

interface Props {
  onClose: () => void,
}

export const HotkeysSidebar: FC<Props> = ({ onClose }) => {
  const [ query, setQuery ] = useState("");
  const { settings } = useSettings();

  // Esc — закрытие
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ onClose ]);

  const filtered = useMemo(() => {
    // В сайдбаре показываем только реальные клавиатурные сокращения,
    // без markdown-триггеров, и скрываем хоткеи действий, отключённых
    // в настройках (видео/аудио/pdf/файл/комментарии).
    const hiddenIds = getHiddenHotkeyIds(settings);
    const withKeys = [ ...HOTKEYS, ...getExtensionHotkeys() ].filter((h) => Boolean(h.keys) && !hiddenIds.has(h.id));
    const q = query.trim().toLowerCase();
    if (!q) return withKeys;
    return withKeys.filter((h) =>
      h.label.toLowerCase().includes(q) ||
      h.description?.toLowerCase().includes(q) ||
      h.keys?.toLowerCase().includes(q));
  }, [ query, settings ]);

  const groups = useMemo(() => {
    const m = new Map<HotkeyGroup, Hotkey[]>();
    for (const h of filtered) {
      const arr = m.get(h.group) ?? [];
      arr.push(h);
      m.set(h.group, arr);
    }
    return GROUP_ORDER
      .filter((g) => m.has(g))
      .map((g) => ({ group: g, items: m.get(g)! }));
  }, [ filtered ]);

  return (
    <div className={`${styles.panel} HotkeysSidebar_Panel`}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Горячие клавиши</h2>
        <button
          aria-label="Закрыть"
          className={styles.closeButton}
          type="button"
          onClick={onClose}
        >
          &times;
        </button>
      </div>
      <div className={styles.searchWrap}>
        <input
          autoFocus
          className={styles.search}
          placeholder="Поиск по действию или клавише"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className={styles.body}>
        {
          groups.length === 0 ?
            <div className={styles.empty}>Ничего не найдено</div> :
            (
              <div className={styles.list}>
                {
                  groups.map(({ group, items }) => (
                    <section
                      key={group}
                      className={styles.section}
                    >
                      <h3 className={styles.sectionTitle}>{HOTKEY_GROUP_LABELS[ group ]}</h3>
                      <ul className={styles.items}>
                        {
                          items.map((h) => (
                            <HotkeyRow
                              key={h.id}
                              hotkey={h}
                            />
                          ))
                        }
                      </ul>
                    </section>
                  ))
                }
              </div>
            )
        }
      </div>
    </div>
  );
};

const HotkeyRow: FC<{ hotkey: Hotkey }> = ({ hotkey }) => {
  const tokens = hotkey.keys ?
    formatHotkey(hotkey.keys) :
    null;
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.label}>{hotkey.label}</span>
        {
          hotkey.description && (
            <span className={styles.description}>{hotkey.description}</span>
          )
        }
      </div>
      {
        tokens && (
          <span className={styles.keys}>
            {
              tokens.map((t, i) => (
                <kbd
                  key={i}
                  className={styles.kbd}
                >
                  {t}
                </kbd>
              ))
            }
          </span>
        )
      }
    </li>
  );
};
