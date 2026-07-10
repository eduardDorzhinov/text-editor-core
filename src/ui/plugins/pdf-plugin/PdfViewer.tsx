import {
  FC,
  useCallback,
  useState,
} from "react";
import {
  Document,
  Page,
  pdfjs,
} from "react-pdf";

import { NodeKey } from "lexical";

import { useDecoratorSelection } from "@/lib/hooks/use-decorator-selection";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import styles from "./PdfViewer.module.scss";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string,
  title?: string,
  className?: string,
  nodeKey: NodeKey,
}

export const PdfViewer: FC<PdfViewerProps> = ({
  fileUrl,
  title,
  className,
  nodeKey,
}) => {
  const { rootRef, isFocused } = useDecoratorSelection(nodeKey);
  const [ numPages, setNumPages ] = useState(0);
  const [ pageNumber, setPageNumber ] = useState(1);
  const [ scale, setScale ] = useState(1);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const goToPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNext = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(2, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));

  return (
    <div
      ref={rootRef}
      className={
        `${styles.container} ${className ?? ""} ${isFocused ?
          "tc-decorator-focused" :
          ""}`
      }
    >
      {title && <div className={styles.title}>{title}</div>}

      <div className={styles.viewport}>
        <Document
          error={<div className={styles.error}>Не удалось загрузить PDF</div>}
          file={fileUrl}
          loading={<div className={styles.loading}>Загрузка PDF...</div>}
          onLoadSuccess={onDocumentLoadSuccess}
        >
          <Page
            renderAnnotationLayer
            renderTextLayer
            pageNumber={pageNumber}
            scale={scale}
          />
        </Document>
      </div>

      {
        numPages > 0 && (
          <div className={styles.toolbar}>
            <div className={styles.nav}>
              <button
                className={styles.btn}
                disabled={pageNumber <= 1}
                type="button"
                onClick={goToPrev}
              >
                ‹
              </button>
              <span className={styles.pageInfo}>
                {pageNumber}
                {" / "}
                {numPages}
              </span>
              <button
                className={styles.btn}
                disabled={pageNumber >= numPages}
                type="button"
                onClick={goToNext}
              >
                ›
              </button>
            </div>

            <div className={styles.zoom}>
              <button
                className={styles.btn}
                disabled={scale <= 0.5}
                type="button"
                onClick={zoomOut}
              >
                −
              </button>
              <span className={styles.scaleInfo}>
                {Math.round(scale * 100)}
                %
              </span>
              <button
                className={styles.btn}
                disabled={scale >= 2}
                type="button"
                onClick={zoomIn}
              >
                +
              </button>
            </div>

            <a
              download
              className={styles.downloadLink}
              href={fileUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              ↓
            </a>
          </div>
        )
      }
    </div>
  );
};
