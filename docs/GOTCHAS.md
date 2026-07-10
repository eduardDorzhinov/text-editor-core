# Подводные камни и инварианты

Неочевидные правила, на которые опирается эта кодовая база. Ни одно из них нельзя понять, прочитав один файл — каждое было выучено на собственном баге. **Читать перед правкой нод, таблиц, парсера, буфера обмена и сохранения.**

Каждый пункт: ловушка → правило → где лежит.

---

## Ноды и Lexical

### `textStyle` на блочных нодах — это «стиль следующего вводимого текста», а не заливка блока
Lexical хранит строку `textStyle` на блочных нодах (параграф, список, элемент списка, таблица, строка, ячейка). Она означает *стиль, который получит следующий введённый символ* — **включая highlight `background-color`** — а не заливку самого блока.

- **Ловушка:** прокинув `textStyle` в стиль блока в превью, вы зальёте весь параграф / список / ячейку цветом подсветки, хотя в редакторе подсвечено лишь несколько слов.
- **Правило:** в парсере превью вырезайте `color` и `backgroundColor` из `textStyle` блочных нод. Используйте `parseStyle(node.textStyle, [...allowed])` с явным allow-list без этих двух свойств. Настоящая заливка ячейки живёт в `cell.backgroundColor`, не в `cell.textStyle` — её оставляйте.
- **Где:** `src/parser/parse-json.tsx` (LIST / LIST_ITEM / PARAGRAPH), `src/parser/PreviewTable.tsx` (таблица / строка / ячейка).

### DecoratorNode по умолчанию не поддерживает выравнивание через `FORMAT_ELEMENT_COMMAND`
Дефолтный обработчик выравнивания Lexical идёт **вверх** по дереву (`$findMatchingParent` для неинлайнового `ElementNode`) и ставит `format` на этого предка. DecoratorNode (картинка, видео и т.п.) — не `ElementNode`, поэтому формат уходит на `root` и визуально ничего не двигается.

- **Правило:** чтобы сделать DecoratorNode выравниваемым: (1) добавьте поле `__format: ElementFormatType` с сериализацией + `getFormatType()`/`setFormat()`, (2) применяйте его к DOM в `createDOM`/`updateDOM`, (3) **перехватывайте `FORMAT_ELEMENT_COMMAND` на `COMMAND_PRIORITY_HIGH`** в плагине ноды: если в `NodeSelection` есть ваша нода — пишите `setFormat` и возвращайте `true`; иначе возвращайте `false`.
- **Где:** `src/ui/plugins/images/ImageNode.tsx` + `src/ui/plugins/images/index.tsx` (референсная реализация).

### Кастомные подклассы нод должны иметь уникальный `getType()`
Если `CustomParagraphNode.getType()` вернёт `"paragraph"` (как у базового), Lexical бросит *«Type paragraph in node CustomParagraphNode does not match registered node _ParagraphNode»*.

- **Правило:** возвращайте отдельный тип (`"custom-paragraph"`, `"custom-list"`, `"custom-table"`). Тогда парсеру превью нужен `case` для нового типа — обычно fall-through на рендеринг базовой ноды.
- **Где:** `src/ui/plugins/paragraph-plugin/CustomParagraphNode.ts`, `list-plugin`, `table-plugin`; кейсы парсера в `src/parser/parse-json.tsx`.

### Копирование теряет обёртку, если границы выделения стоят *на* ноде
Выделение детей контейнера через `node.select(0, size)` ставит границы RangeSelection **на сам контейнер**. При экспорте в буфер Lexical считает ноду-носитель границ *невыделенной* (она — родитель диапазона), поэтому её элемент-обёртка исключается и в буфер попадают только дети.

- **Ловушка:** «копировать колонки» вставлялось как обычный текст в столбик — пропадала обёртка `data-lexical-layout-container`.
- **Правило:** выделяйте ноду **как ребёнка её родителя**: `parent.select(index, index + 1)`, где `index = node.getIndexWithinParent()`. Теперь нода внутри диапазона и экспортируется со своей обёрткой.
- **Где:** `src/ui/plugins/layout/ColumnToolbar.tsx` → `copyElement`.

### Формат TextNode — это битмаска, биты должны быть правильными
`format` — это битмаска, не enum: `IS_BOLD=1, IS_ITALIC=2, IS_STRIKETHROUGH=4, IS_UNDERLINE=8, IS_CODE=16, IS_SUBSCRIPT=32, IS_SUPERSCRIPT=64, IS_HIGHLIGHT=128`.

- **Ловушка:** в парсере были перепутаны underline и strikethrough (`4`/`8` наоборот), и превью показывало не ту декорацию.
- **Где:** `src/parser/utils.ts` (`parseFormat`).

---

## Таблицы

### `data-*` атрибуты должны быть на `<table>`, а не на скролл-обёртке
`CustomTableNode` рендерит скроллируемую обёртку `<div>` вокруг `<table>`. CSS-селекторы вида `[data-width-mode="full"]` бьют по таблице, поэтому атрибуты должны ставиться на элемент `<table>`.

- **Правило:** в `__applyAttributes` сначала найдите элемент таблицы (`dom.tagName === "TABLE" ? dom : dom.querySelector("table")`), затем ставьте `data-width-mode` / `data-equal-columns`.
- **Где:** `src/ui/plugins/table-plugin/CustomTableNode.ts`.

### `table-layout: fixed` только в full-режиме
`table-layout: fixed` заставляет таблицу учитывать заданные ширины колонок и игнорировать контент. Применённый глобально, он ломает авто-подбор ширины в fixed-таблицах.

- **Правило:** скоупьте его только под `[data-width-mode="full"]`.
- **Где:** `src/model/PlaygroundEditorTheme.scss` и `src/parser/preview.module.scss`.

### Full + равные колонки: ширина прыгает при вводе; +1px overflow при выключении «равных»
При `table-layout: fixed` ширина таблицы = `max(заданная, Σ ширин колонок)`. `border-collapse: collapse` + субпиксельное округление дают сумму прямоугольников ячеек больше ширины таблицы, выталкивая правую границу за вьюпорт.

- **Правило:** при чтении ширин колонок из DOM **нормализуйте сумму** к ширине контента редактора — масштабируйте все колонки, а остаток округления отдавайте последней колонке. При переключении full→fixed делите `clientWidth` контейнера поровну.
- **Где:** `src/ui/plugins/table-cell-resizer/index.tsx` (`readColWidthsFromDOM`), `src/ui/components/table-toolbar/TableToolbar.tsx` (`toggleWidthMode`).

---

## Сохранение

### Запись в localStorage может бросить `QuotaExceededError`
Полный документ (json + html + comments) может превысить квоту localStorage (~5MB), особенно из-за избыточного зеркала `html`.

- **Правило:** при сохранении в localStorage отбрасывайте поле `html`; оборачивайте в try/catch с json-only фолбэком; пробрасывайте ошибку при финальной неудаче, чтобы UI показал тост.
- **Где:** `src/model/providers/DataAdapterContext.tsx`.

### Импорт из share-хэша должен быть одноразовым
URL-хэш `#doc=` несёт расшаренный документ. Если переимпортировать его на каждый рендер, он перезапишет локальные правки («всё время один и тот же документ»).

- **Правило:** импортируйте один раз при монтировании, затем очищайте хэш через `history.replaceState`.
- **Где:** `src/ui/plugins/actions-plugin/ActionsPlugin.tsx`.

### View-настройки, которые должны дойти до отдельного окна превью, живут в localStorage
Превью открывается в отдельном окне/маршруте и не может читать React-стейт редактора. Нужные ему настройки (уровень аккордеона TOC, видимые уровни заголовков) сохраняются в localStorage, а **не** как ноды документа.

- **Правило:** UI пишет их через хелперы; превью читает. Это единственное принятое исключение из принципа «парсер не должен зависеть от внутренностей редактора».
- **Где:** `src/ui/plugins/toc-plugin/toc-settings.ts` (ключи `tc-toc-accordion-level`, `tc-toc-visible-levels`).

---

## Парсер (превью)

### Парсер автономен — держите его таким
`src/parser/` — лёгкий рендерер Lexical-JSON → React, рассчитанный на портирование на другие сайты. Он **не должен** импортировать плагины редактора (которые тянут весь редактор Lexical, vidstack и т.д.).

- **Правило:** медиа-ноды (видео, аудио, pdf, scorm, slider) рендерятся как **плейсхолдеры** или самодостаточные embed'ы (см. `detect-video.ts`). Единственное допустимое внешнее касание — чтение TOC-настроек из localStorage, записанных со стороны UI. Полноценная плагинная система рендереров медиа — запланированное (ещё не сделанное) расширение, см. `docs/OVERVIEW.md` «Открытые задачи».

### Выравнивание картинки в превью — через авто-margin, только в fixed-режиме
Центрированная/правая картинка имеет смысл только при фиксированной ширине (`widthMode === "fixed"`); картинка на всю ширину заполняет колонку независимо от выравнивания. Выравнивание применяется как `margin-left/right: auto` на `<figure>` по `node.format`.

- **Где:** `src/parser/parse-json.tsx` (кейс IMAGE).

### Видео-embed'ы (YouTube / Rutube / VK) требуют преобразования URL → embed
Сырой URL YouTube/VK не воспроизведётся в `<iframe>`. `detectVideoEmbed(url)` маппит известные хостинги в их embed-URL (VK использует `vkvideo.ru/video_ext.php`).

- **Где:** `src/parser/detect-video.ts`, используется кейсом VIDEO в `parse-json.tsx`.

---

## Вставка из Word / Google Docs

### Определение заголовков должно быть относительным, не абсолютным
GDocs/Word вставляют `<p>` с inline font-size. Абсолютные пороги в pt промахиваются: документ с крупным основным шрифтом ложно опознаёт обычный текст 20px как `h2`.

- **Правило:** считайте **моду** размера шрифта тела для вставляемого фрагмента, затем классифицируйте по *отношению* к телу (≥2.0→h1, ≥1.6→h2, ≥1.35→h3, ≥1.2→h4). Также учитывайте `role="heading"` и классы Word `MsoTitle`/`MsoHeading`.
- **Где:** `src/lib/buildHTMLConfig.tsx` (`detectHeadingTag`, `getGDocsBodySize`).

### Нормализуйте значения выравнивания из вставленного HTML
GDocs выдаёт `text-align: start` / `end`, которых **нет** в `ELEMENT_FORMAT_OPTIONS`. Передача их в дропдаун тулбара падает с `Cannot read properties of undefined (reading 'Icon')`.

- **Правило:** нормализуйте `start`→`left`, `end`→`right`, неизвестное→`left` перед использованием значения формата для поиска в UI.
- **Где:** `src/ui/components/toolbar/Toolbar.tsx` (`ElementFormatDropdown`), `applyElementAlignment` в `buildHTMLConfig.tsx`.

---

## HTML-блок и iframe

### `sandbox="allow-scripts"` без `allow-same-origin`
Превью HTML-блока выполняет пользовательский HTML в sandbox-iframe. Выдача `allow-scripts` разрешает скрипты; намеренное **исключение** `allow-same-origin` даёт фрейму opaque origin, чтобы он не мог трогать хост. Выдача обоих вместе свела бы sandbox на нет.

- **Где:** `src/ui/plugins/html-plugin/HtmlPreviewModal.tsx`.

---

## Инструментарий

- **Линт:** npm-скрипт `pnpm run lint` использует устаревший glob монорепы (`eslint text-creator`) и не матчит файлы здесь. Запускайте `npx eslint src` или `npx eslint <файл>` напрямую.
- **Type-check:** `pnpm run check-types` (`tsc --noEmit`).
- **Авто-фикс линта:** `npx eslint --fix <файл>` чинит большинство стилистических правил (multiline-ternary, function-paren-newline, simple-import-sort). `no-duplicate-imports` иногда требует ручной переписки — реэкспортируйте локальные биндинги вместо `export ... from`.
