/**
 * Подсветка HTML для оверлей-редактора. Идея: разбиваем исходник на
 * безопасный для встраивания HTML-результат, где каждый токен обёрнут
 * в <span class="th-*">. Возвращаемая строка вставляется через
 * dangerouslySetInnerHTML в <pre><code> позади textarea.
 *
 * Покрываем самое заметное: теги, имена/значения атрибутов, строки в
 * кавычках, HTML-комментарии, DOCTYPE/CDATA. Текстовое содержимое
 * остаётся как есть (просто экранированное). Без обработки JS внутри
 * <script> или CSS внутри <style> — это нарочно: упрощает код и
 * визуально содержимое тех тегов всё равно выглядит как «текст»,
 * что уместно в режиме «вставка готовой разметки».
 */

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[ c ]);
}

// Главный регексп: ловим разные «специальные» конструкции отдельными
// группами, чтобы потом раскрашивать только их, а всё остальное —
// просто escape'ить как текст.
//
// 1. Комментарии:  <!-- ... -->
// 2. DOCTYPE / CDATA: <!... >
// 3. Теги:        <tag ...> или </tag>
const TOKEN_RE = /(<!--[\s\S]*?-->)|(<![\s\S]*?>)|(<\/?[a-zA-Z][^>]*>)/g;

// Внутри тега выделяем имя, атрибуты и значения атрибутов в кавычках.
const TAG_NAME_RE = /^(<\/?)([a-zA-Z][a-zA-Z0-9-]*)/;
const ATTR_RE = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(=)((?:"[^"]*"|'[^']*'|[^\s>]+))/g;

function highlightTag(tag: string): string {
  // Открывающие/закрывающие угловые скобки и имя.
  const nameMatch = tag.match(TAG_NAME_RE);
  if (!nameMatch) return escapeHtml(tag);
  // "<" или "</"
  const prefix = nameMatch[ 1 ];
  const name = nameMatch[ 2 ];
  // атрибуты до ">"
  const rest = tag.slice(prefix.length + name.length, -1);
  const suffix = tag.endsWith("/>") ?
    "/>" :
    ">";
  const restTrimmed = suffix === "/>" ?
    rest.slice(0, -1) :
    rest;

  // В rest выделяем пары атрибут=значение.
  let attrsHtml = "";
  let lastIndex = 0;
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(restTrimmed)) !== null) {
    // Пробелы / "между" атрибутами — оставляем как есть (escaped).
    attrsHtml += escapeHtml(restTrimmed.slice(lastIndex, m.index));
    attrsHtml += `<span class="th-attr">${escapeHtml(m[ 1 ])}</span>${escapeHtml(m[ 2 ])}<span class="th-str">${escapeHtml(m[ 3 ])}</span>`;
    lastIndex = m.index + m[ 0 ].length;
  }
  attrsHtml += escapeHtml(restTrimmed.slice(lastIndex));

  return `<span class="th-punct">${escapeHtml(prefix)}</span><span class="th-tag">${escapeHtml(name)}</span>${attrsHtml}<span class="th-punct">${escapeHtml(suffix)}</span>`;
}

export function highlightHtml(source: string): string {
  if (!source) return "";
  let out = "";
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(source)) !== null) {
    // Всё «между» — текст. Экранируем и кладём как есть.
    out += escapeHtml(source.slice(lastIndex, m.index));
    if (m[ 1 ]) {
      // Комментарий.
      out += `<span class="th-comment">${escapeHtml(m[ 1 ])}</span>`;
    } else if (m[ 2 ]) {
      // DOCTYPE / CDATA.
      out += `<span class="th-doctype">${escapeHtml(m[ 2 ])}</span>`;
    } else if (m[ 3 ]) {
      // Тег.
      out += highlightTag(m[ 3 ]);
    }
    lastIndex = m.index + m[ 0 ].length;
  }
  out += escapeHtml(source.slice(lastIndex));
  return out;
}
