/**
 * Уровень аккордеона содержания — это view-настройка (как именно сворачивать
 * TOC), а не часть контента документа. Поэтому храним её в localStorage,
 * а не в нодах: так значение читается единым образом и в in-app превью
 * (модалки ActionsPlugin / BlockPreviewModal), и в отдельном окне /preview
 * (preview-page.tsx), независимо от того, вставлен ли в документ TOC-блок.
 *
 * `null` — плоский список (аккордеон выключен).
 */
const TOC_ACCORDION_LEVEL_KEY = "tc-toc-accordion-level";

export function getStoredTocAccordionLevel(): number | null {
  try {
    const raw = localStorage.getItem(TOC_ACCORDION_LEVEL_KEY);
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ?
      n :
      null;
  } catch {
    return null;
  }
}

export function setStoredTocAccordionLevel(level: number | null): void {
  try {
    if (level === null) {
      localStorage.removeItem(TOC_ACCORDION_LEVEL_KEY);
    } else {
      localStorage.setItem(TOC_ACCORDION_LEVEL_KEY, String(level));
    }
  } catch {
    // localStorage недоступен (private mode / SSR) — настройка просто
    // не переживёт перезагрузку, но превью в текущей сессии не упадёт.
  }
}

/**
 * Уровни заголовков, попадающих в содержание ("Уровни в содержании").
 * Тоже view-настройка, живёт в localStorage. Превью исключает из TOC
 * заголовки, чей уровень не входит в набор. По умолчанию H1–H4 (как
 * дефолт в сайдбаре) — так пользователь, ничего не настраивавший,
 * видит в содержании только верхние уровни.
 */
const TOC_VISIBLE_LEVELS_KEY = "tc-toc-visible-levels";

export const DEFAULT_TOC_VISIBLE_LEVELS = [
  1,
  2,
  3,
  4,
];

export function getStoredTocVisibleLevels(): Set<number> {
  try {
    const raw = localStorage.getItem(TOC_VISIBLE_LEVELS_KEY);
    if (raw === null) return new Set(DEFAULT_TOC_VISIBLE_LEVELS);
    // Пустая строка — пользователь снял все уровни; это валидный «пустой»
    // набор (содержание скрыто), не путать с «не настраивал».
    if (raw === "") return new Set();
    const levels = raw.split(",")
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
    return new Set(levels);
  } catch {
    return new Set(DEFAULT_TOC_VISIBLE_LEVELS);
  }
}

export function setStoredTocVisibleLevels(levels: Set<number>): void {
  try {
    localStorage.setItem(TOC_VISIBLE_LEVELS_KEY,
      Array.from(levels).sort()
        .join(","));
  } catch {
    // см. комментарий выше — деградируем тихо.
  }
}
