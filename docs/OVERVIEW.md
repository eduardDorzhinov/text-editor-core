# Text Creator — обзор проекта

Rich-text редактор на базе **Lexical 0.38.2**.

## Команды

```sh
pnpm run dev              # Dev-сервер (Vite)
pnpm run build            # Продакшн-сборка
pnpm run build:webcom     # Сборка как web component
pnpm run lint             # ESLint (standalone flat config)
pnpm run check-types      # TypeScript
```

## Архитектура

### Entry Points

| Файл | Назначение |
|------|-----------|
| `src/main.tsx` | Dev-сервер: рендерит `<TextCreator localUsed />` |
| `src/index.ts` | Экспорт: `TextCreator` + стили vidstack |
| `src/webcom.tsx` | Web component entry: регистрирует через `createWebcom` из `vendor/shared` |

### Компонент TextCreator (`src/ui/TextCreator.tsx`)

Пропсы:
- `fieldUid?: string` — идентификатор поля (загрузка/сохранение через `window.TextCreator.getDataCallback`)
- `objUid?: string` — идентификатор объекта
- `localUsed?: boolean` — localStorage вместо внешнего callback

Дерево провайдеров:
```
LexicalCollaboration → MainContext → SettingsContext → FlashMessageContext
  → LexicalExtensionComposer → CommentContext → SharedHistoryContext
    → TableContext → ToolbarContext → Editor + Settings
```

### Загрузка/сохранение данных (`src/ui/components/editor/Editor.tsx`)

1. `window.TextCreator.getDataCallback(fieldUid)` — если встроен в внешнее приложение
2. `localStorage` (ключ `STORAGE_KEY` из ActionsPlugin) — fallback
3. Формат: `{ json: LexicalEditorState, comments: YjsCommentsData }`
4. Сохранение: `window.TextCreator.saveCallback` или `localStorage`

### Кастомные Lexical-ноды (22 шт.)

Реестр: `src/model/lexical-nodes.ts`

Стандартные Lexical: List, Quote, Code, Table, Hashtag, Link, HorizontalRule, Mark, Overflow

| Нода | Файл | Рендер |
|------|------|--------|
| `VideoNode` | `ui/plugins/video-plugin/VideoNode.tsx` | `@vidstack/react` MediaPlayer + DefaultVideoLayout |
| `AudioNode` | `ui/plugins/audio-plugin/AudioNode.tsx` | `@vidstack/react` MediaPlayer + DefaultAudioLayout |
| `PdfNode` | `ui/plugins/pdf-plugin/PdfNode.tsx` | `react-pdf` + кастомный `PdfViewer` |
| `ScormNode` | `ui/plugins/scorm-plugin/ScormNode.tsx` | `ScormViewer` (iframe) |
| `DownloadNode` | `ui/plugins/download-plugin/DownloadNode.tsx` | `vendor/ui-kit/DownloadFile` |
| `SliderNode` | `ui/plugins/slider-plugin/SliderNode.tsx` | Кастомный слайдер |
| `ImageNode` | `ui/plugins/images/ImageNode.tsx` | `<img>` с ресайзом и caption |
| `CollapsibleContainer/Title/Content` | `ui/plugins/collapsible-plugin/` | `<details>/<summary>` |
| `LayoutContainer/Item` | `ui/plugins/layout/` | CSS grid |
| `AnchorHeadingNode` | `ui/plugins/anchor-heading-plugin/` | Заголовок с якорем |
| `AnchorNode` | `ui/plugins/anchor-plugin/` | Якорная ссылка |
| `EquationNode` | `ui/plugins/markdown-transformers/EquationNode.tsx` | KaTeX |
| `PollNode` | `ui/plugins/poll-node/PollNode.tsx` | Опрос |
| `SpecialTextNode` | `ui/plugins/special-text-plugin/SpecialTextNode.tsx` | Спецтекст |
| `KeywordNode` | `ui/plugins/keywords/KeywordNode.ts` | Ключевое слово |
| `AutocompleteNode` | `ui/plugins/autocomplete-plugin/AutocompleteNode.tsx` | Автодополнение |

> Подсветка текста (highlight) — это **не нода**, а inline-`style`
> (`background-color`) на обычном `TextNode`; сериализуется штатно.

### HTML-конфиг (`src/lib/buildHTMLConfig.tsx`)

Lexical ↔ HTML преобразование:
- `buildImportMap()`: DOM → Lexical (fontSize, backgroundColor, color)
- `buildExportMap()`: Lexical → DOM (PdfNode, ScormNode, VideoNode → div с data-атрибутами, CSS `tc-*-node`)

### Плагины (~30 шт.)

Все подключаются в `src/ui/components/editor/Editor.tsx`:
Toolbar, FloatingLinkEditor, FloatingTextFormatToolbar, DraggableBlock, CodeActionMenu, TableActionMenu, TableHoverActions, TableCellResizer, Collapsible, Comment, Actions, DnD/Paste, AnchorHeading, MarkdownTransformers, Layout, MaxLength, SpeechToText + по плагину на каждый медиатип.

## Vendor-зависимости (`src/vendor/`)

Инлайненные части из бывших `@repo/*` пакетов. Только реально используемый код.

### `src/vendor/shared/` (13 файлов)

- `use-scoped-portal.tsx` — портал для floating-элементов (7 мест в коде)
- `scoped-portal.tsx` — ScopedPortal компонент
- `portal-scope-context.tsx` — React context для порталов
- `use-click-outside.ts` — хук клика вне элемента
- `use-theme-switcher.ts` + `theme.ts` — темизация
- `use-is-scrollable.ts` — хук для определения скроллируемости
- `global-constants.ts` — BASE_URL, IS_DEV_MODE, API_URL, IS_WEBCOM, SCOPE_WEBCOM_CLASS
- `get-vite-const.ts` — чтение Vite define-констант
- `normalize-url.ts` — нормализация URL
- `camelize.ts` — camelCase конвертер
- `create-webcom.tsx` — регистрация web component (Custom Element)
- `index.ts` — barrel export

### `src/vendor/error-logger/` (6 файлов)

- `api-error-handler.ts` — getErrorHandler, safeStringify
- `error-boundary.tsx` — React ErrorBoundary класс
- `default-fallback.tsx` — fallback UI при ошибке
- `webcom-error-boundary.tsx` — ErrorBoundary + Sentry
- `webcom-sentry.ts` — initWebcomSentry, captureWebcomError
- `index.ts` — barrel

Внешняя зависимость: `@sentry/browser`

### `src/vendor/api/` (3 файла)

- `utils.ts` — fetcher (fetch-обёртка), getApiUrl, getUploadUrl
- `constants.ts` — API URL шаблоны
- `index.ts` — barrel

### `src/vendor/ui-kit/` (11 файлов)

- `loader/` — Loader (спиннер)
- `modal/` — Modal (модальное окно, использует ScopedPortal)
- `button/` — Button + ButtonSize enum
- `download-file/` — DownloadFile
- `index.ts` — barrel

SVG-иконки (CrossSmallIcon и др.) инлайнены в компоненты. SCSS mixins заменены на CSS media queries.

### `src/vendor/styles/` (6 файлов)
Из `@repo/edtech-styles`:
- `mixins.scss` — has-hover, br-mobile, ellipsis, etc.
- `breakpoints.scss` — $br-mobile, $br-tablet, $br-laptop
- `old-typography.scss` — ALS Hauss шрифты
- `tokens/index.css` — CSS custom properties entry
- `tokens/base-colors.css` — семантические токены light/dark
- `tokens/old-colors.css` — legacy цвета

SCSS подключается через `vite.config.mts` additionalData. CSS токены — через `import` в `main.tsx`.

## Парсер (`src/parser/`)

Лёгкий Lexical JSON → React парсер для preview-режима. Заменяет `@repo/edtech-longread`.

| Файл | Назначение |
|------|-----------|
| `types.ts` | Типы всех Lexical-нод (EDT_NODES, интерфейсы, union type) |
| `utils.ts` | parseFormat, parseStyle, getTextAlign, mergeFontSize |
| `parse-json.tsx` | `parseLexicalJson(rootNode)` — рекурсивный рендер |
| `preview.module.scss` | Стили для preview (текст, таблицы, код, медиа-плейсхолдеры) |
| `index.ts` | Barrel: parseLexicalJson, типы |

Медиа-ноды (video, audio, pdf, scorm, slider) рендерятся как **плейсхолдеры** — для полного рендера нужна плагинная система (этап 4).

### Формат данных (Lexical JSON)

```ts
{
  root: {
    type: "root",
    children: [
      { type: "paragraph", children: [{ type: "text", text: "...", format: 1 }] },
      { type: "heading", tag: "h2", children: [...] },
      { type: "image", src: "/uploads/...", width: 800 },
      { type: "video", src: "/uploads/...", orientation: "horizontal" },
      ...
    ]
  }
}
```

Форматирование текста — битовая маска в `format`:
- 1=bold, 2=italic, 4=strikethrough, 8=underline, 16=code, 32=subscript, 64=superscript, 128=highlight

### Типы нод

`paragraph`, `heading`, `text`, `highlight-text`, `link`, `anchor`, `horizontalrule`, `video`, `scorm`, `pdf`, `image`, `table`, `tablerow`, `tablecell`, `collapsible-container`, `collapsible-title`, `collapsible-content`, `quote`, `linebreak`, `code`, `code-highlight`, `layout-container`, `layout-item`, `download`, `list`, `listitem`, `edt-slider`, `edt-audio`

## Build-инфраструктура

Полностью standalone:

- **`vite.config.mts`** — инлайн: react-swc, svgr, tsconfigPaths, define globals, SCSS additionalData, proxy. Без `createBaseViteConfig`.
- **`vite.webcom.config.mts`** — standalone: PostCSS (rem→px, scoped specificity), CSS modules с hash-based именами, ES library output
- **`eslint.config.mjs`** — standalone flat config: typescript-eslint, react, react-hooks, stylistic, simple-import-sort, unused-imports
- **`tsconfig.json`** — standalone: ESNext, react-jsx, `@/*` → `src/*`

## Ключевые npm-зависимости

### Runtime
- `lexical` 0.38.2 + `@lexical/*` — ядро редактора
- `@vidstack/react` 1.12.13 — видео/аудио плееры
- `react-pdf` 10.4.1 — PDF-просмотрщик
- `react` 19.2.3 / `react-dom` 19.2.3
- `yjs` / `y-protocols` — коллаборативное редактирование
- `katex` — формулы
- `clsx`, `lodash-es`, `prettier`, `react-icons`, `react-error-boundary`
- `@sentry/browser` — мониторинг ошибок (для webcom error boundary)

### Dev
- `vite` 7.1.4 + `@vitejs/plugin-react-swc`
- `typescript` 4.9.5
- `eslint` 9 + `typescript-eslint`, `@stylistic`, `react`, `simple-import-sort`, `unused-imports`

## Структура проекта

```
apps/text-creator/
├── src/
│   ├── index.ts                    — экспорт TextCreator + стили
│   ├── main.tsx                    — dev entry point
│   ├── webcom.tsx                  — web component registration
│   ├── webcom-constants.ts         — WEBCOM_NAME
│   ├── declaration.d.ts            — window.TextCreator types
│   ├── model/                      — Lexical config
│   │   ├── lexical-nodes.ts        — реестр 22 нод
│   │   ├── lexical-theme.ts        — тема редактора
│   │   ├── constants.ts            — YDS_COMMENT_KEY
│   │   └── providers/              — React contexts (Main, Settings, Toolbar, Table, Comment, SharedHistory, FlashMessage)
│   ├── ui/
│   │   ├── TextCreator.tsx         — главный компонент
│   │   ├── components/
│   │   │   ├── editor/Editor.tsx   — редактор со всеми плагинами
│   │   │   ├── toolbar/            — тулбар
│   │   │   ├── settings/           — настройки
│   │   │   └── ...                 — ContentEditable, Dialog, ColorPicker, etc.
│   │   ├── plugins/                — ~30 Lexical плагинов
│   │   │   ├── video-plugin/       — VideoNode + VideoToolbarPlugin (vidstack)
│   │   │   ├── audio-plugin/       — AudioNode + AudioToolbarPlugin (vidstack)
│   │   │   ├── pdf-plugin/         — PdfNode + PdfViewer (react-pdf) + PdfToolbarPlugin
│   │   │   ├── scorm-plugin/       — ScormNode + ScormViewer (iframe)
│   │   │   ├── download-plugin/    — DownloadNode + DownloadPlugin
│   │   │   ├── slider-plugin/      — SliderNode + SliderPlugin
│   │   │   ├── images/             — ImageNode + ImageResizer
│   │   │   ├── collapsible-plugin/ — Collapsible container/title/content
│   │   │   ├── layout/             — Layout container/item
│   │   │   ├── actions-plugin/     — Save, Share, Preview, Clear, Lock
│   │   │   ├── comment-plugin/     — Комментарии (Yjs)
│   │   │   └── ...                 — FloatingLink, DraggableBlock, Table, Code, etc.
│   │   └── themes/                 — CommentEditorTheme
│   ├── parser/                     — Lexical JSON → React (для preview)
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── parse-json.tsx
│   │   ├── preview.module.scss
│   │   └── index.ts
│   ├── vendor/                     — инлайненные зависимости
│   │   ├── shared/                 — из @repo/edtech-shared
│   │   ├── error-logger/           — из @repo/edtech-error-logger
│   │   ├── api/                    — из @repo/edtech-api
│   │   ├── ui-kit/                 — из @repo/edtech-ui-kit
│   │   └── styles/                 — из @repo/edtech-styles
│   └── lib/                        — утилиты
│       ├── buildHTMLConfig.tsx
│       ├── utils/upload-file.ts
│       ├── modal/
│       └── ...
├── build/                           — build plugins
│   ├── postcss-rem-to-px.ts        — PostCSS rem→px
│   └── postcss-specificity.ts      — PostCSS scoped CSS specificity
├── vite.config.mts                 — standalone Vite config
├── vite.webcom.config.mts          — standalone webcom build config
├── eslint.config.mjs               — standalone ESLint flat config
├── tsconfig.json                   — standalone TS config
├── index.html                      — dev HTML
├── package.json                    — ноль @repo/* deps
├── README.md                       — точка входа в документацию
└── docs/
    ├── OVERVIEW.md                 — этот файл (исчерпывающий обзор проекта)
    ├── ARCHITECTURE.md             — runtime-модель
    ├── GOTCHAS.md                  — подводные камни и инварианты
    └── PLUGINS.md                  — индекс плагинов и нод
```
