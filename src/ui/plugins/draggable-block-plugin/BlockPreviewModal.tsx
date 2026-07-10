import { FC, useLayoutEffect, useRef } from "react";

import { LexicalEditor } from "lexical";

import { type EdtechLongreadContent, buildTOC, parseLexicalJson } from "@/parser";
import { TableOfContents } from "@/parser/TableOfContents";
import { getStoredTocAccordionLevel, getStoredTocVisibleLevels } from "@/ui/plugins/toc-plugin";

interface BlockPreviewModalProps {
  editor: LexicalEditor,
  /** Индекс верхнеуровневой Lexical-ноды, к которой нужно проскроллить. */
  targetIndex: number,
}

/**
 * Превью документа, проскролленное к конкретному блоку. Рендерит полный
 * preview (включая TOC) и сразу после маунта скроллит контейнер так, чтобы
 * нужный top-level блок оказался у верхней границы вьюпорта модалки.
 *
 * Связь индекса с DOM: parseLexicalJson возвращает ReactElement на каждого
 * top-level ребёнка root'а в том же порядке. Эти элементы становятся
 * прямыми дочерями `.tc-preview` сразу после <TableOfContents>.
 */
export const BlockPreviewModal: FC<BlockPreviewModalProps> = ({ editor, targetIndex }) => {
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Слепок состояния редактора — снимаем один раз, чтобы превью не дергалось
  // при последующих обновлениях редактора в фоне.
  const content = editor.getEditorState().toJSON() as EdtechLongreadContent;
  const visibleLevels = getStoredTocVisibleLevels();
  const tocItems = buildTOC(content.root).filter((i) => visibleLevels.has(i.level));

  useLayoutEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    // Skip TOC, который рендерится первым внутри .tc-preview.
    // top-level блоки начинаются с :nth-child(2). Запас на отсутствие TOC
    // (когда заголовков нет) — fallback на :nth-child(1).
    const hasToc = tocItems.length > 0;
    const childIndex = (hasToc ?
      1 :
      0) + targetIndex;
    const target = container.children[ childIndex ] as HTMLElement | undefined;
    if (!target) return;
    // scrollIntoView внутри модалки — модалка должна быть scroll-родителем.
    target.scrollIntoView({ behavior: "auto", block: "start" });
  }, [ tocItems.length, targetIndex ]);

  return (
    <div
      ref={previewRef}
      className="tc-preview"
    >
      <TableOfContents
        accordionLevel={getStoredTocAccordionLevel()}
        items={tocItems}
        scrollMode="container"
      />
      {parseLexicalJson(content.root)}
    </div>
  );
};
