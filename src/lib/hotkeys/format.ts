import { IS_APPLE } from "@lexical/utils";

/**
 * Платформо-зависимый рендер хоткея.
 * Принимает строку вида "Mod+Shift+B", "Tab", "Mod+/" и возвращает массив токенов
 * для отрисовки в <kbd>-блоках.
 *
 * Соответствия:
 *  - Mod   → ⌘ (Mac) / Ctrl (другие)
 *  - Shift → ⇧ (Mac) / Shift
 *  - Alt   → ⌥ (Mac) / Alt
 *  - Ctrl  → ⌃ (Mac) / Ctrl
 *  - Enter → ⏎
 *  - буква → верхний регистр
 */
export function formatHotkey(keys: string, isApple: boolean = IS_APPLE): string[] {
  return keys
    .split("+")
    .map((part) => part.trim())
    .map((part) => {
      switch (part) {
        case "Mod":
          return isApple ?
            "⌘" :
            "Ctrl";
        case "Ctrl":
          return isApple ?
            "⌃" :
            "Ctrl";
        case "Shift":
          return isApple ?
            "⇧" :
            "Shift";
        case "Alt":
        case "Option":
          return isApple ?
            "⌥" :
            "Alt";
        case "Enter":
          return "⏎";
        case "Tab":
          return "Tab";
        case "Space":
          return "Space";
        case "Backspace":
          return isApple ?
            "⌫" :
            "Backspace";
        case "Escape":
        case "Esc":
          return "Esc";
        case "ArrowUp":
          return "↑";
        case "ArrowDown":
          return "↓";
        case "ArrowLeft":
          return "←";
        case "ArrowRight":
          return "→";
        default:
          return part.length === 1 ?
            part.toUpperCase() :
            part;
      }
    });
}

/**
 * Удобный helper: возвращает строку "⌘B" / "Ctrl+B" для нативного title=.
 * Соединяет без пробелов на Mac (как ⌘⇧S), с плюсами на остальных платформах.
 */
export function formatHotkeyString(keys: string, isApple: boolean = IS_APPLE): string {
  const tokens = formatHotkey(keys, isApple);
  return isApple ?
    tokens.join("") :
    tokens.join("+");
}
