import { useEffect, useState } from "react";

import { type EdtechLexicalRootNode, buildTOC, parseLexicalJson } from "@/parser";
import { TableOfContents } from "@/parser/TableOfContents";
import { STORAGE_KEY } from "@/ui/plugins/actions-plugin";
import { getStoredTocAccordionLevel, getStoredTocVisibleLevels } from "@/ui/plugins/toc-plugin";

import "@/vendor/styles/tokens/index.css";
import "./preview-page.scss";

export function PreviewPage() {
  const [ root, setRoot ] = useState<EdtechLexicalRootNode | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      if (data?.json?.root) {
        setRoot(data.json.root as EdtechLexicalRootNode);
      }
    } catch {
      // ignore
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const data = JSON.parse(e.newValue);
        if (data?.json?.root) {
          setRoot(data.json.root as EdtechLexicalRootNode);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!root) {
    return (
      <div className="preview-page">
        <div className="preview-page__empty">Нет данных для предпросмотра</div>
      </div>
    );
  }

  // buildTOC уже исключает заголовки, скрытые «глазом» (tocHidden).
  // Дополнительно отсекаем уровни, не выбранные в «Уровни в содержании».
  const visibleLevels = getStoredTocVisibleLevels();
  const tocItems = buildTOC(root).filter((i) => visibleLevels.has(i.level));
  const accordionLevel = getStoredTocAccordionLevel();

  return (
    <div className="preview-page">
      <article className="preview-page__content">
        <TableOfContents
          accordionLevel={accordionLevel}
          items={tocItems}
        />
        {parseLexicalJson(root)}
      </article>
    </div>
  );
}
