# Индекс плагинов и нод

Карта всех Lexical-плагинов и кастомных нод. Плагины монтируются в `src/ui/components/editor/Editor.tsx`; ноды регистрируются в `src/model/lexical-nodes.ts`. Каталог: `src/ui/plugins/<имя>/`.

> «Плагин» — это React-компонент, регистрирующий команды/слушатели на редакторе. «Нода» — модельный класс Lexical (подкласс `DecoratorNode` / `ElementNode` / `TextNode`). Многие каталоги содержат и то, и другое — ноду плюс плагин, который её вставляет/управляет ею.

---

## Кастомные ноды (зарегистрированы в `LEXICAL_NODES`)

| Нода | База | Каталог | Рендерится как |
|------|------|---------|----------------|
| `CustomParagraphNode` | ParagraphNode | `paragraph-plugin/` | параграф + `__firstLineIndent` (двухступенчатый Tab) |
| `CustomListNode` | ListNode | `list-plugin/` | список, фиксит highlight-bleed |
| `CustomTableNode` | TableNode | `table-plugin/` | таблица + `widthMode` + `equalColumns` |
| `VideoNode` | DecoratorNode | `video-plugin/` | `@vidstack/react` MediaPlayer + DefaultVideoLayout |
| `AudioNode` | DecoratorNode | `audio-plugin/` | `@vidstack/react` MediaPlayer + DefaultAudioLayout |
| `PdfNode` | DecoratorNode | `pdf-plugin/` | `react-pdf` + кастомный `PdfViewer` |
| `ScormNode` | DecoratorNode | `scorm-plugin/` | `ScormViewer` (iframe) |
| `DownloadNode` | DecoratorNode | `download-plugin/` | `vendor/ui-kit/DownloadFile` |
| `SliderNode` | DecoratorNode | `slider-plugin/` | карусель изображений |
| `ImageNode` | DecoratorNode | `images/` | `<img>` с ресайзом, подписью, выравниванием `__format` |
| `HtmlNode` | DecoratorNode | `html-plugin/` | блок сырого HTML с вкладками HTML/Превью |
| `PollNode` | DecoratorNode | `poll-node/` | виджет опроса |
| `CalloutContainerNode` | ElementNode | `callout-plugin/` | callout-блок |
| `CollapsibleContainerNode` / `Title` / `Content` | ElementNode | `collapsible-plugin/` | `<details>/<summary>` |
| `LayoutContainerNode` / `LayoutItemNode` | ElementNode | `layout/` | колонки на CSS-grid (+ per-item `__backgroundColor`) |
| `AnchorHeadingNode` | HeadingNode | `anchor-heading-plugin/` | заголовок с anchor-id |
| `AnchorNode` | ElementNode | `anchor-plugin/` | внутристраничная якорная ссылка |
| `AuthorQuoteNode` / `ContentNode` / `AuthorNode` | ElementNode | `author-quote-plugin/` | цитата с атрибуцией |
| `TOCNode` | DecoratorNode | `toc-plugin/` | оглавление |
| `AutocompleteNode` | DecoratorNode | `autocomplete-plugin/` | inline-автодополнение (ghost text) |
| `EquationNode` | DecoratorNode | `markdown-transformers/` | формула KaTeX |
| `KeywordNode` | TextNode | `keywords/` | подсвеченное ключевое слово |
| `SpecialTextNode` | TextNode | `special-text-plugin/` | специальный inline-текст |

> Подсветка текста (highlight) — не нода, а inline-`style` (`background-color`) на обычном `TextNode`.

**Стандартные ноды Lexical**, также зарегистрированные: `ListItemNode`, `CodeNode`, `CodeHighlightNode`, `TableCellNode`, `TableRowNode`, `AutoLinkNode`, `LinkNode`, `OverflowNode`, `HorizontalRuleNode`, `MarkNode`.

---

## Плагины (смонтированы в `Editor.tsx`)

### Базовое редактирование
| Каталог | Зона ответственности |
|---------|----------------------|
| `actions-plugin/` | Save / Share / Preview / Clear / Lock. Владеет `STORAGE_KEY`, импортом share-хэша, тостами сохранения. |
| `paragraph-plugin/` | Двухступенчатый Tab: первый Tab → отступ первой строки, последующие → отступ блока (`ParagraphIndentPlugin`). |
| `list-plugin/` | Обвязка кастомной ноды списка. |
| `markdown-transformers/` | Markdown-шорткаты + `EquationNode` (KaTeX). |
| `max-length/` | Ограничение макс. длины текста. |
| `tab-focus/` | Поведение фокуса по Tab. |
| `dnd-paste/` | Drag-and-drop + вставка файлов/картинок. |
| `keyboard-shortcuts-plugin/` | Глобальные хоткеи (например Mod+Shift+H открывает меню highlight). |
| `speech-to-text/` | Голосовой ввод. |

### Тулбары и плавающий UI
| Каталог | Зона ответственности |
|---------|----------------------|
| `floating-link-editor-plugin/` | Поповер ссылки по выделению / Mod+K. |
| `floating-text-format-toolbar-plugin/` | Inline-тулбар форматирования по выделению текста. |
| `draggable-block-plugin/` | Ручка перетаскивания для переупорядочивания блоков. |
| `block-anchor-plugin/` | Якорная ручка на каждом блоке. |
| `code-action-menu-plugin/` | Hover-меню на блоках кода (copy, prettier). |
| `table-hover-actions-plugin/` | Вставка строки/колонки по ховеру на таблице. |
| `font-size-plugin/` | Контролы размера шрифта +/-. |
| `hotkeys-sidebar/` | Сайдбар со списком всех клавиатурных сокращений. |

### Таблицы
| Каталог | Зона ответственности |
|---------|----------------------|
| `table-plugin/` | `CustomTableNode` (`widthMode`/`equalColumns`). |
| `table-cell-resizer/` | Ресайз колонок + нормализация ширин по DOM. |
| `table/` | Контекстное меню таблицы / действия с ячейками. |

### Медиа и embed'ы
| Каталог | Зона ответственности |
|---------|----------------------|
| `images/` | `ImageNode`, ресайзер, подпись, выравнивание, обработка сломанных картинок. |
| `video-plugin/` `audio-plugin/` `pdf-plugin/` `scorm-plugin/` | По ноде + диалог вставки + тулбар на каждый. |
| `slider-plugin/` | Нода-карусель изображений + модалка редактора слайда. |
| `download-plugin/` | Нода скачиваемого файла. |
| `html-plugin/` | Блок сырого HTML: вкладки HTML/Превью, валидация, sandbox-iframe превью, code-editor ввод. |

### Блоки и структура
| Каталог | Зона ответственности |
|---------|----------------------|
| `layout/` | Колонки (grid). `ColumnToolbar` = фон + копирование колонок. |
| `collapsible-plugin/` | Сворачиваемые блоки `<details>`. |
| `callout-plugin/` | Callout-блоки. |
| `author-quote-plugin/` | Цитаты с атрибуцией. |
| `anchor-plugin/` `anchor-heading-plugin/` | Внутристраничные якоря + заголовки с якорями. |
| `toc-plugin/` | Нода оглавления + `toc-settings.ts` (view-настройки в localStorage). |

### Inline-текст
| Каталог | Зона ответственности |
|---------|----------------------|
| `keywords/` | Подсветка ключевых слов. |
| `special-text-plugin/` | Нода специального inline-текста. |
| `autocomplete-plugin/` | Inline-автодополнение. |
| `code-highlight-prism/` | Подсветка синтаксиса Prism в блоках кода. |

### Коллаборация и dev
| Каталог | Зона ответственности |
|---------|----------------------|
| `comment-plugin/` | Комментарии на Yjs (inline через MarkNode; комментарии к блочным нодам — запланированное расширение, см. `docs/OVERVIEW.md`). |
| `tree-view-plugin/` | Дебаггер дерева состояния Lexical (dev). |

---

## Добавление новой ноды-плагина (чек-лист)

1. Создайте класс ноды с **уникальным `getType()`** + `exportJSON`/`importJSON`.
2. Зарегистрируйте его в `src/model/lexical-nodes.ts`.
3. Смонтируйте компонент плагина в `src/ui/components/editor/Editor.tsx`.
4. Добавьте HTML import/export в `src/lib/buildHTMLConfig.tsx`, если нужна поддержка буфера/HTML.
5. Добавьте `case` в `src/parser/parse-json.tsx`, чтобы нода рендерилась в превью.
6. Если это DecoratorNode, который должен быть выравниваемым/комментируемым — см. `docs/GOTCHAS.md`.
