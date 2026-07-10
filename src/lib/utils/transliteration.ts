const RU_MAP: Record<string, string> = {
  "а": "a",
  "б": "b",
  "в": "v",
  "г": "g",
  "д": "d",
  "е": "e",
  "ё": "e",
  "ж": "zh",
  "з": "z",
  "и": "i",
  "й": "y",
  "к": "k",
  "л": "l",
  "м": "m",
  "н": "n",
  "о": "o",
  "п": "p",
  "р": "r",
  "с": "s",
  "т": "t",
  "у": "u",
  "ф": "f",
  "х": "h",
  "ц": "c",
  "ч": "ch",
  "ш": "sh",
  "щ": "shch",
  "ы": "y",
  "э": "e",
  "ю": "yu",
  "я": "ya",
};

function transliterate(text: string) {
  return text
    .toLowerCase()
    .split("")
    .map((char) => RU_MAP[ char ] ?? char)
    .join("");
}

export function slugify(text: string) {
  return transliterate(text)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
