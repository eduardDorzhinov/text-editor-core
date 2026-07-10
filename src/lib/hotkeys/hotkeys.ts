export type HotkeyGroup =
  | "history" |
  "format" |
  "block" |
  "list" |
  "insert" |
  "navigation" |
  "interface";

export interface Hotkey {
  id: string,
  /** Короткое название действия (как лейбл в кнопке) */
  label: string,
  /** Подробное описание (для сайдбара) */
  description?: string,
  /** Группа (для группировки в сайдбаре) */
  group: HotkeyGroup,
  /**
   * Кросс-платформенная запись клавиш через "+", где "Mod" = ⌘/Ctrl.
   * Если отсутствует — нет клавиатурного шортката (только markdown или UI).
   */
  keys?: string,
  /**
   * Markdown-триггер (через MarkdownShortcutPlugin). Например "# " или "**…**".
   */
  mdShortcut?: string,
}

export const HOTKEY_GROUP_LABELS: Record<HotkeyGroup, string> = {
  history: "История",
  format: "Форматирование текста",
  block: "Блоки и заголовки",
  list: "Списки",
  insert: "Вставка",
  navigation: "Навигация",
  interface: "Интерфейс",
};

/**
 * Реестр всех известных хоткеев и markdown-шорткатов в редакторе.
 *
 * Покрывает:
 *  - стандартные Lexical-хоткеи (bold/italic/underline/link/undo/redo и т.д.)
 *  - кастомные команды, которые регистрируются в проекте
 *  - markdown-шорткаты из @/ui/plugins/markdown-transformers
 *  - навигационные клавиши (Tab/Shift+Tab для indent)
 */
export const HOTKEYS: Hotkey[] = [
  // ---------- История ----------
  {
    id: "undo",
    label: "Отменить",
    description: "Отменить последнее действие.",
    group: "history",
    keys: "Mod+Z",
  },
  {
    id: "redo",
    label: "Вернуть",
    description: "Повторить отменённое действие.",
    group: "history",
    keys: "Mod+Shift+Z",
  },

  // ---------- Форматирование текста ----------
  {
    id: "bold",
    label: "Жирный",
    description: "Сделать выделенный текст жирным.",
    group: "format",
    keys: "Mod+B",
    mdShortcut: "**текст**",
  },
  {
    id: "italic",
    label: "Курсив",
    description: "Сделать выделенный текст курсивом.",
    group: "format",
    keys: "Mod+I",
    mdShortcut: "*текст* или _текст_",
  },
  {
    id: "underline",
    label: "Подчёркнутый",
    description: "Подчеркнуть выделенный текст.",
    group: "format",
    keys: "Mod+U",
  },
  {
    id: "strikethrough",
    label: "Зачёркнутый",
    description: "Зачеркнуть выделенный текст.",
    group: "format",
    keys: "Mod+Shift+S",
    mdShortcut: "~~текст~~",
  },
  {
    id: "code-inline",
    label: "Блок кода (инлайн)",
    description: "Оформить выделенное как код в строке.",
    group: "format",
    keys: "Mod+E",
    mdShortcut: "`текст`",
  },
  {
    id: "highlight",
    label: "Выделение цветом",
    description: "Подсветить выделенный текст.",
    group: "format",
    keys: "Mod+Shift+H",
    mdShortcut: "==текст==",
  },
  {
    id: "link",
    label: "Ссылка",
    description: "Преобразовать выделение в ссылку.",
    group: "format",
    keys: "Mod+K",
    mdShortcut: "[текст](url)",
  },
  {
    id: "clear-format",
    label: "Очистить форматирование",
    description: "Снять всё форматирование с выделения.",
    group: "format",
    keys: "Mod+\\",
  },

  // ---------- Блоки и заголовки ----------
  {
    id: "paragraph",
    label: "Обычный текст",
    description: "Преобразовать строку в обычный абзац.",
    group: "block",
    keys: "Mod+Alt+0",
  },
  {
    id: "h1",
    label: "Заголовок 1",
    description: "Преобразовать строку в заголовок первого уровня.",
    group: "block",
    keys: "Mod+Alt+1",
    mdShortcut: "# ",
  },
  {
    id: "h2",
    label: "Заголовок 2",
    description: "Преобразовать строку в заголовок второго уровня.",
    group: "block",
    keys: "Mod+Alt+2",
    mdShortcut: "## ",
  },
  {
    id: "h3",
    label: "Заголовок 3",
    description: "Преобразовать строку в заголовок третьего уровня.",
    group: "block",
    keys: "Mod+Alt+3",
    mdShortcut: "### ",
  },
  {
    id: "h4",
    label: "Заголовок 4",
    description: "Преобразовать строку в заголовок четвёртого уровня.",
    group: "block",
    keys: "Mod+Alt+4",
  },
  {
    id: "h5",
    label: "Заголовок 5",
    description: "Преобразовать строку в заголовок пятого уровня.",
    group: "block",
    keys: "Mod+Alt+5",
  },
  {
    id: "h6",
    label: "Заголовок 6",
    description: "Преобразовать строку в заголовок шестого уровня.",
    group: "block",
    keys: "Mod+Alt+6",
  },
  {
    id: "quote",
    label: "Цитата",
    description: "Оформить строку как блок цитаты.",
    group: "block",
    mdShortcut: "> ",
  },
  {
    id: "code-block",
    label: "Блок кода",
    description: "Оформить строку как блок кода (можно выбрать язык).",
    group: "block",
    keys: "Mod+Shift+C",
    mdShortcut: "``` ",
  },
  {
    id: "hr",
    label: "Разделитель",
    description: "Горизонтальная линия-разделитель.",
    group: "block",
    mdShortcut: "---",
  },

  // ---------- Списки ----------
  {
    id: "ul",
    label: "Маркированный список",
    description: "Начать список с буллетами.",
    group: "list",
    keys: "Mod+Shift+8",
    mdShortcut: "- или *",
  },
  {
    id: "ol",
    label: "Нумерованный список",
    description: "Начать нумерованный список. Tab вкладывает: 1 → 1.1 → 1.1.1.",
    group: "list",
    keys: "Mod+Shift+7",
    mdShortcut: "1. ",
  },
  {
    id: "checklist",
    label: "Чек-лист",
    description: "Начать список с чекбоксами.",
    group: "list",
    mdShortcut: "[ ] ",
  },
  {
    id: "list-indent",
    label: "Вложить пункт",
    description: "Сделать текущий пункт списка вложенным.",
    group: "list",
    keys: "Tab",
  },
  {
    id: "list-outdent",
    label: "Поднять пункт",
    description: "Поднять текущий пункт на уровень выше.",
    group: "list",
    keys: "Shift+Tab",
  },

  // ---------- Выравнивание ----------
  {
    id: "align-left",
    label: "По левому краю",
    description: "Выровнять абзац по левому краю.",
    group: "block",
    keys: "Mod+Shift+L",
  },
  {
    id: "align-center",
    label: "По центру",
    description: "Выровнять абзац по центру.",
    group: "block",
    keys: "Mod+Shift+E",
  },
  {
    id: "align-right",
    label: "По правому краю",
    description: "Выровнять абзац по правому краю.",
    group: "block",
    keys: "Mod+Shift+R",
  },
  {
    id: "align-justify",
    label: "По ширине",
    description: "Выровнять абзац по ширине.",
    group: "block",
    keys: "Mod+Shift+J",
  },

  // ---------- Вставка / редактирование ----------
  {
    id: "linebreak",
    label: "Перенос строки",
    description: "Перенос без создания нового абзаца.",
    group: "insert",
    keys: "Shift+Enter",
  },
  {
    id: "insert-hr",
    label: "Разделитель",
    description: "Вставить горизонтальную линию.",
    group: "insert",
    keys: "Mod+Alt+H",
  },
  {
    id: "insert-image",
    label: "Изображение",
    description: "Открыть окно вставки изображения.",
    group: "insert",
    keys: "Mod+Alt+I",
  },
  {
    id: "insert-table",
    label: "Таблица",
    description: "Открыть окно создания таблицы.",
    group: "insert",
    keys: "Mod+Alt+T",
  },
  {
    id: "insert-video",
    label: "Видео",
    description: "Открыть окно вставки видео.",
    group: "insert",
    keys: "Mod+Alt+Y",
  },
  {
    id: "insert-audio",
    label: "Аудио",
    description: "Открыть окно вставки аудио.",
    group: "insert",
    keys: "Mod+Alt+U",
  },
  {
    id: "insert-pdf",
    label: "PDF",
    description: "Открыть окно вставки PDF.",
    group: "insert",
    keys: "Mod+Alt+P",
  },
  {
    id: "insert-download",
    label: "Файл для скачивания",
    description: "Открыть окно вставки файла для скачивания.",
    group: "insert",
    // Mod+Alt+D занят macOS (показать/скрыть Dock) — используем Mod+Alt+F («Файл»).
    keys: "Mod+Alt+F",
  },
  {
    id: "insert-columns",
    label: "Колонки",
    description: "Открыть окно разделения на колонки.",
    group: "insert",
    keys: "Mod+Alt+C",
  },
  {
    id: "insert-collapsible",
    label: "Аккордеон",
    description: "Вставить раскрывающийся блок.",
    group: "insert",
    keys: "Mod+Alt+K",
  },
  {
    id: "insert-callout",
    label: "Коллаут",
    description: "Открыть окно вставки коллаута.",
    group: "insert",
    // Mod+Alt+N перехватывался браузером — используем свободный Mod+Alt+E.
    keys: "Mod+Alt+E",
  },
  {
    id: "insert-quote",
    label: "Цитата",
    description: "Вставить блок цитаты автора.",
    group: "insert",
    keys: "Mod+Alt+Q",
  },
  {
    id: "insert-anchor",
    label: "Якорь",
    description: "Вставить якорь.",
    group: "insert",
    keys: "Mod+Alt+J",
  },
  {
    id: "insert-slider",
    label: "Карусель изображений",
    description: "Вставить карусель изображений.",
    group: "insert",
    keys: "Mod+Alt+G",
  },
  {
    id: "insert-banner",
    label: "Баннер",
    description: "Вставить баннер с картинкой, фоном и ссылкой.",
    group: "insert",
    keys: "Mod+Alt+B",
  },
  {
    id: "select-all",
    label: "Выделить всё",
    description: "Выделить весь текст.",
    group: "navigation",
    keys: "Mod+A",
  },
  {
    id: "copy",
    label: "Копировать",
    description: "Скопировать выделение.",
    group: "navigation",
    keys: "Mod+C",
  },
  {
    id: "cut",
    label: "Вырезать",
    description: "Вырезать выделение.",
    group: "navigation",
    keys: "Mod+X",
  },
  {
    id: "paste",
    label: "Вставить",
    description: "Вставить из буфера обмена.",
    group: "navigation",
    keys: "Mod+V",
  },

  // ---------- Интерфейс ----------
  {
    id: "open-hotkeys",
    label: "Горячие клавиши",
    description: "Открыть список горячих клавиш и шорткатов.",
    group: "interface",
    keys: "Mod+/",
  },
  {
    id: "action-save",
    label: "Сохранить",
    description: "Сохранить документ.",
    group: "interface",
    keys: "Mod+S",
  },
  {
    id: "action-settings",
    label: "Настройки",
    description: "Открыть/закрыть панель настроек.",
    group: "interface",
    keys: "Mod+,",
  },
  {
    id: "action-toc",
    label: "Содержание",
    description: "Открыть/закрыть сайдбар оглавления.",
    group: "interface",
    // Mod+Shift+T перехватывается браузером («вернуть закрытую вкладку») —
    // используем свободный Mod+Alt+S.
    keys: "Mod+Alt+S",
  },
  {
    id: "action-anchors",
    label: "Якоря",
    description: "Открыть/закрыть сайдбар якорей.",
    group: "interface",
    keys: "Mod+Shift+A",
  },
  {
    id: "action-comments",
    label: "Комментарии",
    description: "Открыть/закрыть сайдбар комментариев.",
    group: "interface",
    keys: "Mod+Alt+M",
  },
  {
    id: "action-share",
    label: "Поделиться",
    description: "Скопировать ссылку на документ.",
    group: "interface",
    keys: "Mod+Shift+U",
  },
  {
    id: "action-clear",
    label: "Очистить редактор",
    description: "Открыть окно очистки содержимого редактора.",
    group: "interface",
    keys: "Mod+Shift+Backspace",
  },
  {
    id: "action-readonly",
    label: "Режим чтения",
    description: "Переключить режим только чтения.",
    group: "interface",
    keys: "Mod+Alt+R",
  },
  {
    id: "action-mic",
    label: "Режим диктовки",
    description: "Включить/выключить распознавание речи.",
    group: "interface",
    keys: "Mod+Shift+M",
  },
  {
    id: "action-preview",
    label: "Предпросмотр",
    description: "Открыть превью документа в модальном окне.",
    group: "interface",
    keys: "Mod+Alt+V",
  },
  {
    id: "action-preview-window",
    label: "Предпросмотр в новом окне",
    description: "Открыть превью документа в отдельной вкладке.",
    group: "interface",
    keys: "Mod+Alt+O",
  },
];

export const HOTKEYS_BY_ID: Record<string, Hotkey> = Object.fromEntries(HOTKEYS.map((h) => [ h.id, h ]));

// Хоткеи расширений редактора (заполняются registerEditorExtensions при
// старте). Реестр держим здесь, чтобы getHotkey()/тултипы/сайдбар находили их
// по id, а ядро не знало про конкретные расширения.
let extensionHotkeys: Hotkey[] = [];
let extensionHotkeysById: Record<string, Hotkey> = {};

export const setExtensionHotkeys = (hks: Hotkey[]): void => {
  extensionHotkeys = hks;
  extensionHotkeysById = Object.fromEntries(hks.map((h) => [ h.id, h ]));
};

export const getExtensionHotkeys = (): Hotkey[] => extensionHotkeys;

export function getHotkey(id: string): Hotkey | undefined {
  return HOTKEYS_BY_ID[ id ] ?? extensionHotkeysById[ id ];
}
