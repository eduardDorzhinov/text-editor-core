# Архитектура

Runtime-модель Text Creator. В паре с `docs/OVERVIEW.md` (исчерпывающий обзор) и `docs/GOTCHAS.md` (подводные камни). Этот документ объясняет, **как части общаются между собой**, чтобы вы могли продумать изменение до его внесения.

---

## 1. Точки входа

| Файл | Роль |
|------|------|
| `src/main.tsx` | Точка входа dev-сервера. Рендерит `<TextCreator localUsed />` и импортирует CSS-токены. |
| `src/index.ts` | Экспорт библиотеки: `TextCreator` + стили vidstack. Именно это импортируют внешние приложения. |
| `src/webcom.tsx` | Точка входа Web Component. Регистрирует custom element через `createWebcom` (`vendor/shared`). Собирается через `vite.webcom.config.mts`. |

Все три сходятся на **`src/ui/TextCreator.tsx`** — корневом компоненте.

---

## 2. Дерево провайдеров

`TextCreator.tsx` оборачивает редактор во вложенные React-контексты. Порядок важен — внутренние провайдеры зависят от внешних:

```
LexicalCollaboration            (Yjs-документ + провайдер для комментариев)
└─ MainContext                  (верхнеуровневый конфиг: fieldUid, objUid, localUsed, колбэки)
   └─ SettingsContext           (флаги фич редактора / состояние панели настроек)
      └─ FlashMessageContext    (тосты: «Сохранено», ошибки)
         └─ LexicalExtensionComposer   (инстанс редактора Lexical + реестр нод)
            └─ CommentContext   (хранилище комментариев на Yjs)
               └─ SharedHistoryContext  (общий стек undo/redo)
                  └─ TableContext        (состояние выделения/ресайза ячеек таблицы)
                     └─ ToolbarContext   (активное состояние форматирования для тулбара)
                        └─ Editor + Settings
```

`Editor.tsx` (`src/ui/components/editor/`) — место, где **смонтированы все ~45 плагинов** как дети `LexicalComposer`. Чтобы добавить плагин: зарегистрируйте его ноду в `src/model/lexical-nodes.ts` (если нода есть) и смонтируйте компонент плагина в `Editor.tsx`.

---

## 3. Реестр нод

`src/model/lexical-nodes.ts` экспортирует `LEXICAL_NODES` — единственный источник правды о том, какие ноды понимает редактор. Всего ~30 нод. Полная таблица — в `docs/PLUGINS.md`.

**Подмена нод.** Три встроенные ноды Lexical заменены кастомными подклассами через конфиг `{ replace, with, withKlass }`:

| Встроенная | Заменена на | Зачем |
|------------|-------------|-------|
| `ParagraphNode` | `CustomParagraphNode` | добавляет `__firstLineIndent` для двухступенчатого Tab |
| `ListNode` | `CustomListNode` | сохраняет тип/старт списка, фиксит highlight-bleed |
| `TableNode` | `CustomTableNode` | добавляет `widthMode` («full»/«fixed») + `equalColumns` |

> Кастомные подклассы **обязаны** возвращать уникальный `getType()` (например `"custom-paragraph"`, не `"paragraph"`), иначе Lexical бросит *«Type X does not match registered node»*. Тогда парсеру превью нужен соответствующий `case` (часто fall-through на базовый тип). См. `docs/GOTCHAS.md`.

---

## 4. Поток load / save

Определён в `src/model/providers/DataAdapterContext.tsx` и `src/ui/components/editor/Editor.tsx`.

**Загрузка (при монтировании):**
1. `window.TextCreator.getDataCallback(fieldUid)` — если встроен в хост-приложение.
2. `localStorage` (ключ из `STORAGE_KEY` в `ActionsPlugin`) — фолбэк при `localUsed`.
3. Одноразовый импорт из URL-хэша `#doc=` (share-ссылки), затем очистка через `history.replaceState`.

**Формат документа:**
```ts
{
  json:     LexicalEditorState,   // дерево root → children
  comments: YjsCommentsData,      // сериализованные треды комментариев
}
```

**Сохранение (только по кнопке — автосейв убран):**
- `window.TextCreator.saveCallback` если есть, иначе `localStorage`.
- Запись в localStorage **отбрасывает поле `html`** и обёрнута в try/catch с json-only фолбэком, чтобы обойти `QuotaExceededError` (лимит 5MB). При финальной неудаче ошибка пробрасывается, чтобы пользователь увидел тост об ошибке.

---

## 5. Три пути рендера

Один и тот же документ Lexical можно отрендерить тремя разными способами. **Это независимые пути кода — фикс в одном не распространяется на остальные.** Это источник №1 багов «работает в редакторе, сломано в превью».

| Путь | Код | Для чего |
|------|-----|----------|
| **Редактор** | `createDOM`/`updateDOM`/`decorate` на каждой ноде + компоненты плагинов | живой редактируемый вид |
| **Парсер превью** | `src/parser/` (`parseLexicalJson`) | read-only окно превью, встраивание в другие React-приложения |
| **HTML экспорт/импорт** | `src/lib/buildHTMLConfig.tsx` (`buildImportMap` / `buildExportMap`) | буфер обмена, вставка из Word/GDocs, HTML-сериализация |

Добавляя фичу в ноду (например выравнивание картинки, фон колонки), проверьте, нужно ли отразить её во **всех трёх** путях.

---

## 6. Конвенции приоритетов команд

Lexical диспатчит команды по уровням приоритета: `EDITOR(0) < LOW < NORMAL < HIGH < CRITICAL`. Обработчики с более высоким приоритетом срабатывают раньше и могут «съесть» команду, вернув `true`.

Используемые здесь конвенции:
- **`COMMAND_PRIORITY_HIGH`** — чтобы перехватить встроенную команду до дефолта Lexical. Например, `ImagesPlugin` ловит `FORMAT_ELEMENT_COMMAND` на HIGH, чтобы выравнивание картинки писало `__format` в ноду, а не уходило на root; `ParagraphIndentPlugin` ловит `INDENT/OUTDENT_CONTENT_COMMAND` на HIGH для двухступенчатого отступа. Возвращайте `false`, когда неприменимо, чтобы отработал дефолт.
- **`COMMAND_PRIORITY_CRITICAL`** — для слушателей `SELECTION_CHANGE_COMMAND`, которым нужно видеть каждое изменение выделения (тулбары, синхронизирующие активное состояние).
- **`COMMAND_PRIORITY_NORMAL`** — для шорткатов `KEY_MODIFIER_COMMAND` (например Mod+K для ссылки).

---

## 7. Структура копирования в буфер

`COPY_COMMAND` в Lexical (из плагина RichText) пишет в буфер **три** формата: `text/plain`, `text/html` и `application/x-lexical-editor` (полный JSON нод). Чтобы скопировать структурированный контент (например целые колонки), выделяют диапазон и синхронно вызывают `document.execCommand("copy")` — обработчик Lexical затем сериализует выделение.

**Важно:** границы выделения должны лежать на **родителе** нужной ноды, охватывая её как ребёнка (`parent.select(index, index+1)`). Если поставить границы *на саму* ноду (`node.select(0, size)`), при экспорте нода считается невыделенной (она — родитель диапазона), поэтому её обёртка отбрасывается и в буфер попадают только дети. См. `docs/GOTCHAS.md` → «Копирование теряет обёртку».

---

## 8. Build-инфраструктура

| Файл | Назначение |
|------|------------|
| `vite.config.mts` | Dev/prod: react-swc, svgr, tsconfigPaths, define-глобалы, SCSS `additionalData`, прокси. |
| `vite.webcom.config.mts` | Сборка Web Component: PostCSS (rem→px, scoped specificity), CSS-модули с hash-именами, ES library output. |
| `build/postcss-rem-to-px.ts` | PostCSS-плагин: rem → px (чтобы custom element не наследовал font-size хоста). |
| `build/postcss-specificity.ts` | PostCSS-плагин: скоупит специфичность CSS под webcom-класс. |
| `eslint.config.mjs` | Standalone flat config (typescript-eslint, react, stylistic, simple-import-sort, unused-imports). |
| `tsconfig.json` | Standalone: ESNext, react-jsx, `@/*` → `src/*`. |
