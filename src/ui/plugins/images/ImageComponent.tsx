import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PiImageBroken } from "react-icons/pi";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGSTART_COMMAND,
  LexicalCommand,
  LexicalEditor,
  NodeKey,
  SELECTION_CHANGE_COMMAND,
} from "lexical";

import { $isImageNode } from "./ImageNode";
import { ImageResizer } from "./ImageResizer";

import "./ImageNode.scss";

type ImageStatus =
  | { error: true } |
  {
    error: false,
    width: number,
    height: number,
  };

const imageCache = new Map<string, Promise<ImageStatus> | ImageStatus>();

export const RIGHT_CLICK_IMAGE_COMMAND: LexicalCommand<MouseEvent> =
  createCommand("RIGHT_CLICK_IMAGE_COMMAND");

function useSuspenseImage(src: string): ImageStatus {
  let cached = imageCache.get(src);
  if (cached && "error" in cached && typeof cached.error === "boolean") {
    return cached;
  } else if (!cached) {
    cached = new Promise<ImageStatus>((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () =>
        resolve({
          error: false,
          height: img.naturalHeight,
          width: img.naturalWidth,
        });
      img.onerror = () => resolve({ error: true });
    }).then((rval) => {
      imageCache.set(src, rval);
      return rval;
    });
    imageCache.set(src, cached);
    throw cached;
  }
  throw cached;
}

function isSVG(src: string): boolean {
  return src.toLowerCase().endsWith(".svg");
}

function LazyImage({
  altText,
  className,
  imageRef,
  brokenRef,
  src,
  width,
  height,
  maxWidth,
  widthMode,
  isFocused,
  onError,
}: {
  altText: string,
  brokenRef: { current: null | HTMLDivElement },
  className: string | null,
  height: "inherit" | number,
  imageRef: { current: null | HTMLImageElement },
  isFocused: boolean,
  maxWidth: number,
  src: string,
  width: "inherit" | number,
  widthMode: "full" | "fixed",
  onError: () => void,
}) {
  const isSVGImage = isSVG(src);
  const status = useSuspenseImage(src);

  useEffect(() => {
    if (status.error) {
      onError();
    }
  }, [ status.error, onError ]);

  if (status.error) {
    return (
      <BrokenImage
        brokenRef={brokenRef}
        isFocused={isFocused}
      />
    );
  }

  // Calculate final dimensions with proper scaling
  const calculateDimensions = () => {
    // Full-width: тянем по ширине родителя, но не больше maxWidth и точно
    // не больше editor content area (это контролирует <img> max-width: 100%
    // у обёртки + clientWidth родителя).
    if (widthMode === "full") {
      return {
        height: "auto" as const,
        maxWidth: "100%" as const,
        width: "100%" as const,
      };
    }
    if (!isSVGImage) {
      return {
        height,
        maxWidth,
        width,
      };
    }

    // Use natural dimensions if available, otherwise fallback to defaults
    const naturalWidth = status.width;
    const naturalHeight = status.height;

    let finalWidth = naturalWidth;
    let finalHeight = naturalHeight;

    // Scale down if width exceeds maxWidth while maintaining aspect ratio
    if (finalWidth > maxWidth) {
      const scale = maxWidth / finalWidth;
      finalWidth = maxWidth;
      finalHeight = Math.round(finalHeight * scale);
    }

    // Scale down if height exceeds maxHeight while maintaining aspect ratio
    const maxHeight = 500;
    if (finalHeight > maxHeight) {
      const scale = maxHeight / finalHeight;
      finalHeight = maxHeight;
      finalWidth = Math.round(finalWidth * scale);
    }

    return {
      height: finalHeight,
      maxWidth,
      width: finalWidth,
    };
  };

  const imageStyle = calculateDimensions();

  return (
    <img
      ref={imageRef}
      alt={altText}
      className={className || undefined}
      draggable="false"
      src={src}
      style={imageStyle}
      onError={onError}
    />
  );
}

function BrokenImage({
  brokenRef,
  isFocused = false,
}: {
  brokenRef?: { current: null | HTMLDivElement },
  isFocused?: boolean,
} = {}) {
  // Оборачиваем в div со своим ref — тогда onClick в ImageComponent может
  // распознать клик «по картинке» наравне с настоящим <img>. Без этого
  // сломанная картинка остаётся неselectable и её невозможно удалить.
  return (
    <div
      ref={brokenRef}
      className={
        `image-broken${isFocused ?
          " image-broken--focused" :
          ""}`
      }
      data-image-broken="true"
    >
      <PiImageBroken
        style={
          {
            height: 200,
            opacity: 0.2,
            pointerEvents: "none",
            width: 200,
          }
        }
      />
    </div>
  );
}

function noop() {
  // noop
}

export default function ImageComponent({
  src,
  altText,
  nodeKey,
  width,
  height,
  maxWidth,
  resizable,
  captionText,
  source,
  widthMode,
}: {
  altText: string,
  captionText: string,
  height: "inherit" | number,
  maxWidth: number,
  nodeKey: NodeKey,
  resizable: boolean,
  source: string,
  src: string,
  width: "inherit" | number,
  widthMode: "full" | "fixed",
}) {
  const imageRef = useRef<null | HTMLImageElement>(null);
  // Отдельный ref на DOM-обёртку «сломанной» иконки. Используется для того,
  // чтобы клик по плейсхолдеру тоже выделял ноду — иначе картинку с битым
  // URL нельзя удалить через Backspace/Delete (selection не ставится).
  const brokenRef = useRef<null | HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [
    isSelected,
    setSelected,
    clearSelection,
  ] = useLexicalNodeSelection(nodeKey);
  const [ isResizing, setIsResizing ] = useState<boolean>(false);
  const [ editor ] = useLexicalComposerContext();
  const activeEditorRef = useRef<LexicalEditor | null>(null);
  const [ isLoadError, setIsLoadError ] = useState<boolean>(false);
  const isEditable = useLexicalEditable();
  const isInNodeSelection = useMemo(() =>
    isSelected &&
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      return $isNodeSelection(selection) && selection.has(nodeKey);
    }),
  [
    editor,
    isSelected,
    nodeKey,
  ]);

  // $onEnter / $onEscape удалены — они остались от старого nested-editor
  // caption'а (фокусировали кнопку «Добавить описание»), сейчас caption
  // редактируется в общем тулбаре, а кнопки внутри картинки больше нет.
  // Пустые обработчики с registerCommand'ами на KEY_ENTER_COMMAND ломали
  // default-поведение Lexical: при Enter после image появлялся лишний
  // параграф. Теперь Enter обрабатывает только default Lexical.

  const onClick = useCallback((payload: MouseEvent) => {
    const event = payload;

    if (isResizing) {
      return true;
    }
    // Клик считается «по картинке», если он попал в реальный <img>, либо
    // в DOM-обёртку BrokenImage (когда src не прогрузился). В обоих случаях
    // ставим NodeSelection — без этого сломанную картинку нельзя удалить.
    const targetEl = event.target as Node | null;
    const isImageHit = event.target === imageRef.current;
    const isBrokenHit =
      !!brokenRef.current && !!targetEl && brokenRef.current.contains(targetEl);
    if (isImageHit || isBrokenHit) {
      if (event.shiftKey) {
        setSelected(!isSelected);
      } else {
        clearSelection();
        setSelected(true);
      }
      return true;
    }

    // Клик внутри ImageResizer (резизеры — внутри editable) — перехватываем,
    // чтобы Lexical не создал RangeSelection и не сбросил NodeSelection.
    const target = event.target as HTMLElement | null;
    return !!(target && target.closest("[data-image-toolbar]"));
  },
  [
    isResizing,
    isSelected,
    setSelected,
    clearSelection,
  ]);

  const onRightClick = useCallback((event: MouseEvent): void => {
    editor.getEditorState().read(() => {
      const latestSelection = $getSelection();
      const domElement = event.target as HTMLElement;
      if (
        domElement.tagName === "IMG" &&
        $isRangeSelection(latestSelection) &&
        latestSelection.getNodes().length === 1
      ) {
        editor.dispatchCommand(RIGHT_CLICK_IMAGE_COMMAND, event);
      }
    });
  },
  [ editor ]);

  useEffect(() => {
    return mergeRegister(editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_, activeEditor) => {
        activeEditorRef.current = activeEditor;
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      DRAGSTART_COMMAND,
      (event) => {
        if (event.target === imageRef.current) {
          // TODO This is just a temporary workaround for FF to behave like other browsers.
          // Ideally, this handles drag & drop too (and all browsers).
          event.preventDefault();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ));
  }, [ editor ]);
  useEffect(() => {
    let rootCleanup = noop;
    return mergeRegister(
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        onClick,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<MouseEvent>(
        RIGHT_CLICK_IMAGE_COMMAND,
        onClick,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerRootListener((rootElement) => {
        rootCleanup();
        rootCleanup = noop;
        if (rootElement) {
          rootElement.addEventListener("contextmenu", onRightClick);
          rootCleanup = () =>
            rootElement.removeEventListener("contextmenu", onRightClick);
        }
      }),
      () => rootCleanup(),
    );
  }, [
    editor,
    onClick,
    onRightClick,
  ]);

  const onResizeEnd = (nextWidth: "inherit" | number,
    nextHeight: "inherit" | number) => {
    // Delay hiding the resize bars for click case
    setTimeout(() => {
      setIsResizing(false);
    }, 200);

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setWidthAndHeight(nextWidth, nextHeight);
        // Ручной ресайз сбрасывает «на всю ширину» — иначе сохранённый
        // пиксельный размер игнорировался бы в пользу 100%.
        node.setWidthMode("fixed");
      }
    });
  };

  const onResizeStart = () => {
    setIsResizing(true);
  };

  const draggable = isInNodeSelection && !isResizing;
  const isFocused = (isSelected || isResizing) && isEditable;
  // Есть ли «мета»-блок (подпись или источник). Когда есть — оборачиваем
  // картинку в карточку с серым фоном и паддингами (визуально схоже
  // с превью карусели). Без меты картинка остаётся «голой».
  const hasMeta = !!captionText || !!source;

  // .image-wrapper должна быть размером с картинку, иначе резизеры/тулбар/
  // описание уйдут за её пределы. В full-width — растягиваем на 100% (как
  // у внутреннего <img>). В fixed — ужимаемся в inline-block, чтобы родитель
  // (span.editor-image) с display:block обернул нас тёмной шириной картинки.
  const wrapperStyle = widthMode === "full" ?
    {
      display: "block",
      width: "100%",
    } as const :
    { display: "inline-block" } as const;

  return (
    <Suspense fallback={null}>
      {/*
        contentEditable={false} — критично для блочного декоратора. Иначе
        браузер видит «editable» DOM внутри картинки, ставит туда caret
        при кликах, и Enter в этой области ведёт себя как Enter в обычном
        тексте (создаёт лишние пустые параграфы). Slider использует тот же
        приём — без него курсор «налипает» к декоратору.
      */}
      <div
        className={
          `image-wrapper ${hasMeta ?
            "image-wrapper--with-meta" :
            ""}`
        }
        contentEditable={false}
        style={wrapperStyle}
      >
        {/*
          image-resize-box — positioned context для резизеров. Sized
          той же логикой, что и image-wrapper (full → 100%, fixed →
          shrink to img). Так резизеры рисуются только по границе <img>,
          а caption (как sibling) остаётся снаружи resize-области.
        */}
        <div
          className="image-resize-box"
          style={wrapperStyle}
        >
          <div draggable={draggable}>
            {
              isLoadError ?
                (
                  <BrokenImage
                    brokenRef={brokenRef}
                    isFocused={isFocused}
                  />
                ) :
                (
                  <LazyImage
                    altText={altText}
                    brokenRef={brokenRef}
                    className={
                      isFocused ?
                        `focused ${isInNodeSelection ?
                          "draggable" :
                          ""}` :
                        null
                    }
                    height={height}
                    imageRef={imageRef}
                    isFocused={isFocused}
                    maxWidth={maxWidth}
                    src={src}
                    width={width}
                    widthMode={widthMode}
                    onError={() => setIsLoadError(true)}
                  />
                )
            }
          </div>
          {
            // Сломанную картинку не ресайзим — резизерам нечего тянуть
            // (нет настоящего <img>), а ручки только мешают сфокусироваться
            // на плейсхолдере для удаления.
            resizable && isInNodeSelection && isFocused && !isLoadError && (
              <ImageResizer
                buttonRef={buttonRef}
                editor={editor}
                imageRef={imageRef}
                maxWidth={maxWidth}
                onResizeEnd={onResizeEnd}
                onResizeStart={onResizeStart}
              />
            )
          }
        </div>
        {
          hasMeta && (
            <div className="image-meta">
              {
                captionText && (
                  <p className="image-caption">{captionText}</p>
                )
              }
              {
                source && (
                  <cite className="image-source">{source}</cite>
                )
              }
            </div>
          )
        }
      </div>
    </Suspense>
  );
}
