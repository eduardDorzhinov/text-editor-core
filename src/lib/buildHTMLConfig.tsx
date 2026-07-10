/**
 * HTML ↔ Lexical: importMap (DOM → ноды) и exportMap (ноды → DOM).
 * Используется буфером обмена, вставкой из Word/Google Docs и сериализацией.
 *
 * Определение заголовков при вставке (detectHeadingTag) — ОТНОСИТЕЛЬНОЕ, не по
 * абсолютным pt: GDocs/Word вставляют <p> с inline font-size, и при крупном
 * основном шрифте абсолютные пороги ложно опознают обычный текст как h2.
 * Поэтому считаем моду размера тела фрагмента (getGDocsBodySize) и
 * классифицируем по отношению к ней (≥2.0→h1, ≥1.6→h2, ≥1.35→h3, ≥1.2→h4),
 * плюс role="heading" и Word MsoTitle/MsoHeading.
 * Выравнивание из GDocs (start/end) нормализуется к left/right. См. docs/GOTCHAS.md.
 */
import { HeadingTagType } from "@lexical/rich-text";
import {
  $isTextNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutputMap,
  ElementFormatType,
  HTMLConfig,
  isBlockDomNode,
  isHTMLElement,
  ParagraphNode,
  TextNode,
} from "lexical";

import { AnchorHeadingNode } from "@/ui/plugins/anchor-heading-plugin";

function isInsideLink(el: HTMLElement): boolean {
  return typeof el.closest === "function" && el.closest("a") !== null;
}

/** Парсим CSS font-size в pt; null если не распарсилось. */
function extractFontSizePt(el: HTMLElement): number | null {
  const m = el.style.fontSize?.match(/([\d.]+)(pt|px|em|rem)?/);
  if (!m) return null;
  const v = parseFloat(m[ 1 ]);
  const unit = m[ 2 ] || "px";
  // 1px ≈ 0.75pt
  if (unit === "px") return v * 0.75;
  if (unit === "em" || unit === "rem") return v * 12;
  // pt
  return v;
}

/**
 * Кэш «body-размера шрифта» на каждый GDocs guid-wrapper. Считается
 * один раз при первом запросе по обёртке — модой font-size'ов всех
 * `<p>` внутри. WeakMap, чтобы не держать ссылки после импорта.
 */
const gdocsBodySizeCache = new WeakMap<HTMLElement, number>();

function getGDocsBodySize(wrapper: HTMLElement): number {
  const cached = gdocsBodySizeCache.get(wrapper);
  if (cached !== undefined) return cached;

  const sizes: number[] = [];
  wrapper.querySelectorAll<HTMLElement>("p").forEach((p) => {
    const span = p.querySelector<HTMLElement>("[style*='font-size']");
    if (!span) return;
    const pt = extractFontSizePt(span);
    if (pt) sizes.push(pt);
  });

  // По умолчанию body GDocs = 11pt; если ничего не нашли — используем его.
  if (sizes.length === 0) {
    gdocsBodySizeCache.set(wrapper, 11);
    return 11;
  }

  // Мода: самый частый размер. При равенстве предпочитаем меньший —
  // обычно body встречается чаще headings, при равной частоте это
  // тоже скорее body.
  const counts = new Map<number, number>();
  sizes.forEach((s) => counts.set(s, (counts.get(s) || 0) + 1));
  let bestSize = sizes[ 0 ];
  let bestCount = 0;
  counts.forEach((count, size) => {
    if (count > bestCount || (count === bestCount && size < bestSize)) {
      bestCount = count;
      bestSize = size;
    }
  });
  gdocsBodySizeCache.set(wrapper, bestSize);
  return bestSize;
}

/**
 * Распознаём heading-уровень `<p>` или `<hN>` при вставке из внешних
 * источников. Возвращаем тег `h1`..`h6` или null, если элемент не похож
 * на заголовок.
 *
 * Источники сигнала (по убыванию надёжности):
 *  1. role="heading" + aria-level — современный Google Docs ставит это
 *     на абзацах с применённым heading-стилем.
 *  2. Word: className содержит `MsoTitle` (→ h1) или `MsoHeading{N}`
 *     (где N от 1 до 9, клампим к 6). MsoNormal/MsoListParagraph
 *     игнорируем — это обычный текст / список.
 *  3. Google Docs guid-обёртка: `<p>` внутри `[id^="docs-internal-guid"]`
 *     с внутренним span'ом крупного `font-size`. Сравниваем РАЗМЕР
 *     ТЕКУЩЕГО абзаца с «body-размером» (модой font-size'ов всех
 *     абзацев внутри той же обёртки). Абсолютные пороги (типа «≥13pt
 *     = h4») давали ложные срабатывания, если пользователь выставил
 *     базовый шрифт документа крупнее обычных 11pt — тогда весь текст
 *     детектился как heading. Относительное сравнение нейтрально к
 *     базовому размеру: heading'ом считается только то, что заметно
 *     крупнее тела.
 */
function detectHeadingTag(element: HTMLElement): HeadingTagType | null {
  // 1. role="heading"
  if (element.getAttribute("role") === "heading") {
    const level = parseInt(element.getAttribute("aria-level") || "", 10);
    if (level >= 1 && level <= 6) return `h${level}` as HeadingTagType;
  }

  // 2. Word
  const cls = element.className || "";
  if (/(?:^|\s)MsoTitle(?:\s|$)/i.test(cls)) return "h1";
  const msoMatch = cls.match(/(?:^|\s)MsoHeading(\d)(?:\s|$)/i);
  if (msoMatch) {
    const n = Math.min(6,
      Math.max(1, parseInt(msoMatch[ 1 ], 10)));
    return `h${n}` as HeadingTagType;
  }

  // 3. Google Docs (guid-обёртка + относительное сравнение font-size)
  const wrapper = element.closest<HTMLElement>("[id^='docs-internal-guid']");
  if (wrapper) {
    const span = element.querySelector<HTMLElement>("[style*='font-size']");
    if (span) {
      const pt = extractFontSizePt(span);
      if (pt !== null) {
        const body = getGDocsBodySize(wrapper);
        // Соотношение текущего размера к body. Пороги выбраны под
        // дефолтные стили GDocs (Heading1 26pt vs body 11pt = 2.36,
        // Heading2 20pt = 1.82, Heading3 14pt = 1.27, Heading4 12pt = 1.09).
        // Heading4 (12pt) от 11pt отличается всего на 9% — слишком слабо,
        // чтобы надёжно отделить от body, поэтому минимальный порог 1.2.
        const ratio = pt / body;
        if (ratio >= 2.0) return "h1";
        if (ratio >= 1.6) return "h2";
        if (ratio >= 1.35) return "h3";
        if (ratio >= 1.2) return "h4";
      }
    }
  }

  return null;
}

/**
 * Переносим CSS-выравнивание в Lexical __format. Применяется к
 * AnchorHeadingNode при импорте из GDocs/Word — иначе центрированные
 * и правовыровненные заголовки приходили как left-aligned.
 *
 * Для обычных параграфов работает дефолтный `$convertParagraphElement`
 * из Lexical, нашего вмешательства не требуется.
 */
function applyElementAlignment(node: AnchorHeadingNode, element: HTMLElement) {
  const align = element.style?.textAlign;
  if (!align) return;
  // ElementFormatType допускает center/left/right/justify/start/end/"".
  // Любое другое значение Lexical проигнорирует, так что cast безопасен.
  node.setFormat(align as ElementFormatType);
}

function buildImportMap(): DOMConversionMap {
  const importMap: DOMConversionMap = {};

  // Оборачиваем стандартные TextNode-импортеры. На внешнем paste/HTML-импорте
  // мы НЕ таскаем inline-стили (цвет, размер, фон, шрифт): после вставки текст
  // подхватывает дефолтный стиль редактора.
  // Что сохраняется и так — формат-флаги Lexical (bold/italic/underline/
  // strikethrough/code/highlight/sub/super) — они хранятся в __format ноды,
  // не в style, и обрабатываются дефолтным TextNode.importDOM из коробки.
  // <p> → AnchorHeadingNode при наличии heading-сигнала (Word MsoHeading/
  // MsoTitle, GDocs role=heading или большой font-size в guid-обёртке).
  // priority: 2, чтобы выиграть и у дефолтного ParagraphNode (0),
  // и у собственного AnchorHeadingNode.importDOM (1, ловит tc-heading-*).
  importMap.p = (element) => {
    const tag = detectHeadingTag(element);
    if (!tag) return null;
    return {
      conversion: (el): DOMConversionOutput => {
        const node = new AnchorHeadingNode(tag);
        applyElementAlignment(node, el);
        return { node };
      },
      priority: 2,
    };
  };

  // Нативные <h1>..<h6> — AnchorHeadingNode переопределил статический
  // importDOM родителя (HeadingNode) и обрабатывает только <p class="tc-...">,
  // из-за чего настоящие h1-h6 при вставке проваливались в paragraph.
  // Возвращаем их обработку явно.
  ([
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
  ] as const).forEach((tag) => {
    importMap[ tag ] = () => ({
      conversion: (el): DOMConversionOutput => {
        const node = new AnchorHeadingNode(tag as HeadingTagType);
        applyElementAlignment(node, el);
        return { node };
      },
      priority: 2,
    });
  });

  for (const [ tag, fn ] of Object.entries(TextNode.importDOM() || {})) {
    importMap[ tag ] = (importNode) => {
      const importer = fn(importNode);
      if (!importer) {
        return null;
      }
      return {
        ...importer,
        conversion: (element) => {
          const output = importer.conversion(element);
          if (
            output === null ||
            output.forChild === undefined ||
            output.after !== undefined ||
            output.node !== null
          ) {
            return output;
          }
          const insideLink = isInsideLink(element);
          const { forChild } = output;
          return {
            ...output,
            forChild: (child, parent) => {
              const textNode = forChild(child, parent);
              if ($isTextNode(textNode)) {
                // Чистим inline-стили: цвет, размер, фон, шрифт — всё,
                // что прилетает из внешнего HTML и портит вид редактора.
                textNode.setStyle("");
                if (insideLink && textNode.hasFormat("underline")) {
                  // У ссылок подчёркивание задаётся CSS, отдельный underline
                  // на тексте внутри ссылки — лишний.
                  textNode.toggleFormat("underline");
                }
              }
              return textNode;
            },
          };
        },
      };
    };
  }

  return importMap;
}

function buildExportMap(): DOMExportOutputMap {
  // PdfNode / ScormNode / VideoNode НЕ переопределяются здесь: их HTML-экспорт
  // живёт в собственных node.exportDOM (вместе с importDOM — симметричный
  // round-trip). Раньше централизованный экспорт через @ts-ignore лез в
  // приватные поля и из-за опечатки (__filePath вместо __src) терял путь к PDF.
  // @ts-ignore
  return new Map([[ ParagraphNode, (editor, target) => {
    const output = target.exportDOM(editor);
    if (isHTMLElement(output.element) && output.element.tagName === "P") {
      const after = output.after;
      return {
        ...output,
        after: (generatedElement) => {
          if (after) {
            generatedElement = after(generatedElement);
          }
          if (
            isHTMLElement(generatedElement) &&
            generatedElement.tagName === "P"
          ) {
            for (const childNode of generatedElement.childNodes) {
              if (isBlockDomNode(childNode)) {
                const div = document.createElement("div");
                div.setAttribute("role", "paragraph");
                for (const attr of generatedElement.attributes) {
                  div.setAttribute(attr.name, attr.value);
                }
                while (generatedElement.firstChild) {
                  div.appendChild(generatedElement.firstChild);
                }
                return div;
              }
            }
          }
        },
      };
    }
    return output;
  } ]]);
}

export function buildHTMLConfig(): HTMLConfig {
  return { export: buildExportMap(), import: buildImportMap() };
}
