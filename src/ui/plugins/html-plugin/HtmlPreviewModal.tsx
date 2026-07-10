import { FC } from "react";

/**
 * Превью HTML-блока в изолированном iframe (sandbox без allow-scripts —
 * скрипты внутри не выполняются, нельзя обратиться к window родителя).
 * srcdoc позволяет передать HTML без сетевого запроса.
 *
 * Использовать через useModal — без своих оборачивающих рамок: модалка
 * сама даёт фон и заголовок, нам остаётся только iframe.
 */
export const HtmlPreviewModal: FC<{ html: string }> = ({ html }) => {
  // Базовый шаблон, чтобы пользовательский CSS внутри `<style>` имел
  // нормальный document.documentElement / body. Если пользователь сам
  // передал `<html>`, его разметка победит.
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1a1d24;}</style></head><body>${html}</body></html>`;

  return (
    <iframe
      // allow-scripts разрешает выполнение JS внутри превью. Без него
      // браузер ругается «Blocked script execution in 'about:srcdoc'».
      // НЕ добавляем allow-same-origin — iframe остаётся в opaque-origin,
      // поэтому скрипты не могут читать cookies родителя, обращаться к
      // его DOM/localStorage и т.п. Этого достаточно для интерактивных
      // мини-демо, но не открывает дыру в host-приложение.
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      style={
        {
          background: "#fff",
          border: "1px solid #d8dadd",
          borderRadius: 8,
          height: "min(70vh, 600px)",
          width: "100%",
        }
      }
      title="HTML Preview"
    />
  );
};
