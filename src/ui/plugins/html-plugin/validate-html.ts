/**
 * Лёгкая HTML-валидация. Не претендуем на полный парсер — задача:
 *  - отлавливать незакрытые/непарные теги (наиболее частый источник
 *    кривого вывода);
 *  - сигналить, если DOMParser нашёл ошибки разбора.
 *
 * DOMParser в режиме "text/html" сам по себе ошибок не кидает — браузер
 * максимально терпим к мусору. Поэтому считаем баланс тегов руками
 * + проверяем наличие `<parsererror>` (на случай если кто-то прокинет
 * XHTML-валидный фрагмент через application/xhtml+xml).
 */

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Три исхода валидации:
 *  - "valid"   — разметка валидна;
 *  - "invalid" — точно не валидна (непарные/незакрытые теги);
 *  - "maybe"   — может быть не валидна (XHTML-парсер нашёл претензии, но он
 *                часто ложно срабатывает на валидном HTML5).
 */
export type HtmlValidationStatus = "valid" | "invalid" | "maybe";

export interface HtmlValidationResult {
  status: HtmlValidationStatus,
  /** Потенциальное место/деталь проблемы (для invalid и maybe). */
  detail?: string,
}

/**
 * Перевод типовых формулировок XML-парсера (Blink/Gecko) на русский.
 * Ключ — фрагмент англоязычного сообщения, значение — перевод (может
 * содержать $1 из capture-группы).
 */
const PARSER_ERROR_PHRASES: Array<[ RegExp, string ]> = [
  [ /error parsing attribute name/i, "ошибка в имени атрибута" ],
  [ /attributes construct error/i, "ошибка в атрибутах тега" ],
  [ /specification mandates value for attribute ([\w:-]+)/i, "атрибуту «$1» требуется значение" ],
  [ /specification mandates value for attribute/i, "атрибуту требуется значение" ],
  [ /opening and ending tag mismatch:?\s*([\w:-]+)/i, "несовпадение открывающего и закрывающего тегов («$1»)" ],
  [ /opening and ending tag mismatch/i, "несовпадение открывающего и закрывающего тегов" ],
  [ /premature end of data in tag ([\w:-]+)/i, "тег «$1» не закрыт" ],
  [ /premature end of data in tag/i, "тег не закрыт" ],
  [ /couldn'?t find end of start tag ([\w:-]+)/i, "не найден конец открывающего тега «$1»" ],
  [ /couldn'?t find end of start tag/i, "не найден конец открывающего тега" ],
  [ /expected '?>'?/i, "ожидался символ «>»" ],
  [ /entityref: expecting ';'/i, "в HTML-сущности (&…) пропущена «;»" ],
  [ /xmlparseentityref: no name/i, "одиночный «&» нужно писать как &amp;" ],
  [ /entity '([^']+)' not defined/i, "неизвестная HTML-сущность «&$1;»" ],
  [ /extra content at the end of the document/i, "лишнее содержимое после корневого элемента" ],
  [ /unescaped '<' not allowed/i, "символ «<» нужно экранировать как &lt;" ],
  [ /duplicate attribute/i, "повторяющийся атрибут" ],
  [ /not well-?formed/i, "разметка синтаксически некорректна" ],
];

/**
 * Превращает многострочное англоязычное сообщение `<parsererror>` в короткую
 * русскую строку вида «Ошибка разбора (строка 4, столбец 5): …».
 */
export function translateParserError(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();

  // Позиция: Blink — «error on line N at column M», Gecko — «Line Number N, Column M».
  let line: string | undefined;
  let col: string | undefined;
  const locBlink = text.match(/line (\d+) at column (\d+)/i);
  const locGecko = text.match(/Line Number (\d+),? Column (\d+)/i);
  if (locBlink) {
    [
      , line,
      col,
    ] = locBlink;
  } else if (locGecko) {
    [
      , line,
      col,
    ] = locGecko;
  }

  // Описание ошибки (после двоеточия у Blink или после «XML Parsing Error:»).
  const descMatch =
    text.match(/error on line \d+ at column \d+:\s*([^.]+)/i) ||
    text.match(/XML Parsing Error:\s*([^.]+)/i);
  const desc = (descMatch ?
    descMatch[ 1 ] :
    text).trim();

  let translated = "";
  for (const [ re, ru ] of PARSER_ERROR_PHRASES) {
    const m = desc.match(re) || text.match(re);
    if (m) {
      translated = m[ 0 ].replace(re, ru);
      break;
    }
  }

  const body = translated || "синтаксическая ошибка в разметке";
  return line && col ?
    `строка ${line}, столбец ${col} — ${body}` :
    body;
}

/** Регексп тегов: `<tag>` или `</tag>` с атрибутами и опциональным "/>". */
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^<>]*?(\/?)>/g;
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const CDATA_RE = /<!\[CDATA\[[\s\S]*?\]\]>/g;

export function validateHtml(html: string): HtmlValidationResult {
  if (!html.trim()) {
    return { status: "valid" };
  }

  // Чистим то, что не должно попадать в баланс: комментарии, CDATA.
  const stripped = html.replace(COMMENT_RE, "").replace(CDATA_RE, "");
  const lineAt = (index: number) => stripped.slice(0, index).split("\n").length;

  // 1) Баланс тегов — это ТОЧНАЯ невалидность. Храним позицию открытия,
  //    чтобы указать место незакрытого тега.
  const stack: Array<{ tag: string, index: number }> = [];
  let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(stripped)) !== null) {
    const tag = match[ 1 ].toLowerCase();
    const isClosing = match[ 0 ].startsWith("</");
    const isSelfClosing = match[ 2 ] === "/" || VOID_TAGS.has(tag);
    if (isClosing) {
      const idx = stack.map((s) => s.tag).lastIndexOf(tag);
      if (idx === -1) {
        return {
          status: "invalid",
          detail: `лишний закрывающий тег </${tag}> (строка ${lineAt(match.index)})`,
        };
      }
      // Между открытием idx и текущим закрытием остались незакрытые потомки.
      if (idx < stack.length - 1) {
        const child = stack[ stack.length - 1 ];
        return {
          status: "invalid",
          detail: `не закрыт тег <${child.tag}> (строка ${lineAt(child.index)})`,
        };
      }
      stack.length = idx;
    } else if (!isSelfClosing) {
      stack.push({ tag, index: match.index });
    }
  }
  if (stack.length > 0) {
    const first = stack[ 0 ];
    return {
      status: "invalid",
      detail: `не закрыт тег <${first.tag}> (строка ${lineAt(first.index)})`,
    };
  }

  // 2) XHTML-парсер — это «может быть не валидно»: строгий XHTML часто ловит
  //    валидный HTML5 (например, `<br>` без `/`, &nbsp; и т.п.).
  try {
    const doc = new DOMParser().parseFromString(`<root xmlns="http://www.w3.org/1999/xhtml">${html}</root>`,
      "application/xhtml+xml");
    const errs = doc.getElementsByTagName("parsererror");
    if (errs.length > 0) {
      const raw = (errs[ 0 ].textContent || "").trim();
      return {
        status: "maybe",
        detail: raw ?
          translateParserError(raw) :
          undefined,
      };
    }
  } catch {
    // Игнорируем — вторичный сигнал.
  }

  return { status: "valid" };
}
