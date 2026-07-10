# text-editor-core

Ядро автономного rich-text редактора **Text Creator** на базе **Lexical 0.38.2**.
Расширяемо доменными нодами (API расширений); рендерер превью вынесен во внешний
пакет `text-parser-core` и подключается как `@/parser`.

Поставляется в двух видах:
- React-компонент (`<TextCreator />`) — см. `src/index.ts`;
- Web Component (custom element) — см. `src/webcom.tsx` / `pnpm run build:webcom`.

---

## Быстрый старт

```sh
pnpm install
pnpm run dev            # Vite dev-сервер → рендерит <TextCreator localUsed />
pnpm run build          # продакшн-сборка (React-компонент)
pnpm run build:webcom   # сборка как Web Component
pnpm run check-types    # tsc --noEmit
npx eslint src          # линт (см. примечание ниже)
```
---

## Что читать дальше

Репозиторий задокументирован послойно. Читайте в этом порядке, чтобы быстро войти в контекст:

| Документ | Что даёт |
|----------|----------|
| **`docs/OVERVIEW.md`** | Канонический исчерпывающий обзор проекта (RU). Реестр нод, инвентарь vendor, дерево файлов, открытые задачи. Начинайте отсюда, когда нужно «где находится X». |
| **`docs/ARCHITECTURE.md`** | Runtime-модель: точки входа, дерево провайдеров, поток load/save, три пути рендера (редактор / парсер-превью / HTML-экспорт), конвенции приоритетов команд, webcom-сборка. |
| **`docs/GOTCHAS.md`** | Выстраданные инварианты и подводные камни, которые **не** видны из кода. Читать перед правкой нод, таблиц, парсера, буфера обмена и сохранения. |
| **`docs/PLUGINS.md`** | Индекс всех Lexical-плагинов и кастомных нод → файл → зона ответственности. |
| **`text-parser-core`** (внешний репо) | Автономный рендерер Lexical-JSON → React для read-only превью. Подключается как `@/parser`. |
| **`src/vendor/README.md`** | Инлайненный код из бывших `@repo/*` (shared / api / ui-kit / error-logger / styles). |

Для быстрого входа в контекст: `docs/OVERVIEW.md` + `docs/GOTCHAS.md` + `docs/ARCHITECTURE.md` вместе покрывают ~95% неочевидного знания в этой кодовой базе.

---

## Общая форма

```
src/
├── index.ts / main.tsx / webcom.tsx   — точки входа (экспорт библиотеки / dev / web component)
├── model/                             — конфиг Lexical: реестр нод, тема, React-провайдеры
├── ui/
│   ├── TextCreator.tsx                — корневой компонент + дерево провайдеров
│   ├── components/                    — тулбар, настройки, оболочка редактора, диалоги, color picker…
│   └── plugins/                       — ~45 Lexical-плагинов + 30 кастомных нод (по каталогу на каждую)
├── lib/                               — buildHTMLConfig, загрузка файлов, хуки, хоткеи, modal-хелперы
└── vendor/                            — инлайненные бывшие @repo/* пакеты (только используемый код)
```

---

## Зависимость от парсера

Рендерер read-only превью — внешний пакет **`text-parser-core`**, импортируется
как `@/parser` (и подпуть `@/parser/TableOfContents`). Алиас настроен в
`tsconfig.json` и обоих vite-конфигах, указывает на соседний репозиторий
`../text-parser-core/src`. В интеграционном репозитории (превью-композиция через
git submodules) этот алиас перенастраивается на путь сабмодуля.

Для локальной разработки держите репозитории рядом:

```
WebstormProjects/
├── text-editor-core/    ← вы здесь
└── text-parser-core/
```

> Документы в `docs/` написаны до выделения парсера в отдельный репозиторий и
> местами описывают его как `src/parser/`. Логика не менялась — изменилось только
> место (внешний пакет `@/parser`).

## Технологический стек

- **Ядро редактора:** `lexical` 0.38.2 + `@lexical/*`
- **Медиа:** `@vidstack/react` (видео/аудио), `react-pdf` (PDF), inline iframe (SCORM)
- **Коллаборация:** `yjs` / `y-protocols` (комментарии)
- **Формулы:** `katex`
- **React:** 19, **Vite:** 7, **TypeScript:** 6, **ESLint:** 9 (flat config)
- **Мониторинг ошибок:** `@sentry/browser` (webcom error boundary)
