/**
 * ImagesPlugin + публичный barrel для ImageNode.
 *
 * Помимо вставки картинок здесь перехватывается FORMAT_ELEMENT_COMMAND на
 * COMMAND_PRIORITY_HIGH: если в NodeSelection есть ImageNode — пишем
 * setFormat в саму ноду и возвращаем true (не даём формату уйти на root).
 * Если картинок нет — возвращаем false, отдаём команду дефолту Lexical.
 * Это единственный способ выровнять блочный DecoratorNode. См. docs/GOTCHAS.md.
 */
import {
  ReactElement,
  useEffect,
  useState,
} from "react";
import { PiGlobe, PiUploadSimple } from "react-icons/pi";

import {
  $isAutoLinkNode,
  $isLinkNode,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $findMatchingParent,
  mergeRegister,
} from "@lexical/utils";
import {
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isDecoratorNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  getDOMSelectionFromTarget,
  INSERT_PARAGRAPH_COMMAND,
  isHTMLElement,
  KEY_ENTER_COMMAND,
  LexicalCommand,
  LexicalEditor,
  RootNode,
} from "lexical";

import { useUploadFile } from "@/lib/hooks/use-upload-file";
import { Button } from "@/ui/components/button";
import { TextInput } from "@/ui/components/input";
import { LoadInput } from "@/ui/components/load-input";

import {
  $createImageNode,
  $isImageNode,
  ImageNode,
  ImagePayload,
} from "./ImageNode";

import styles from "./ImagesPlugin.module.scss";

// Реэкспорт уже импортированных выше биндингов (без повторного import-from,
// чтобы не ругался no-duplicate-imports).
export { $createImageNode, $isImageNode, ImageNode };

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand("INSERT_IMAGE_COMMAND");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".heif",
];

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/heif",
  "image/heic",
];

type ModeType = null | "url" | "file";

export function InsertImageDialog({
  activeEditor,
  onClose,
  onSave,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
  onSave?: (p: InsertImagePayload) => void,
}) {
  const [ mode, setMode ] = useState<ModeType>(null);

  // Common fields
  const [ src, setSrc ] = useState("");
  const [ altText, setAltText ] = useState("");
  const [ captionText, setCaptionText ] = useState("");
  const [ source, setSource ] = useState("");

  // Upload
  const {
    isLoading,
    error,
    uploadRequest,
    localFile,
    setLocalFile,
    setError,
    loader,
  } = useUploadFile();

  const onSubmit = (payload: InsertImagePayload) => {
    if (onSave) {
      onSave(payload);
    } else {
      activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    }
    onClose();
  };

  const handleUrlSubmit = () => {
    if (!src) return;
    onSubmit({
      altText,
      captionText: captionText || undefined,
      showCaption: captionText.length > 0,
      source: source || undefined,
      src,
    });
  };

  const handleFileSubmit = async () => {
    try {
      if (!localFile) return;
      const uploadSrc = await uploadRequest();
      if (!uploadSrc) throw Error("Проблема загрузки файла. Попробуйте еще раз");
      onSubmit({
        altText,
        captionText: captionText || undefined,
        showCaption: captionText.length > 0,
        source: source || undefined,
        src: uploadSrc,
      });
    } catch (e) {
      console.error("Add image error. ", e);
    }
  };

  if (!mode) {
    return (
      <div className={styles.grid}>
        <button
          className={styles.card}
          type="button"
          onClick={() => setMode("url")}
        >
          <div className={styles.cardIcon}>
            <PiGlobe />
          </div>
          <span className={styles.cardLabel}>По ссылке</span>
        </button>
        <button
          className={styles.card}
          type="button"
          onClick={() => setMode("file")}
        >
          <div className={styles.cardIcon}>
            <PiUploadSimple />
          </div>
          <span className={styles.cardLabel}>Загрузить</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <button
        className={styles.back}
        type="button"
        onClick={() => setMode(null)}
      >
        &larr; Назад
      </button>

      {
        mode === "url" && (
          <>
            <TextInput
              label="Ссылка *"
              placeholder="https://..."
              value={src}
              onChange={setSrc}
            />
            <TextInput
              label="Alt Text"
              placeholder="Альтернативный текст"
              value={altText}
              onChange={setAltText}
            />
            <TextInput
              label="Описание картинки"
              placeholder="Подпись под картинкой"
              value={captionText}
              onChange={setCaptionText}
            />
            <TextInput
              label="Источник картинки"
              placeholder="Источник изображения"
              value={source}
              onChange={setSource}
            />
            <Button
              disabled={!src}
              onClick={handleUrlSubmit}
            >
              Добавить
            </Button>
          </>
        )
      }

      {
        mode === "file" && (
          <>
            {loader}
            <LoadInput
              allowedExtensions={ALLOWED_EXTENSIONS}
              allowedTypes={ALLOWED_TYPES}
              label="Файл *"
              maxSize={MAX_FILE_SIZE}
              setError={setError}
              value={localFile}
              onChange={setLocalFile}
            />
            <TextInput
              label="Alt Text"
              placeholder="Альтернативный текст"
              value={altText}
              onChange={setAltText}
            />
            <TextInput
              label="Описание картинки"
              placeholder="Подпись под картинкой"
              value={captionText}
              onChange={setCaptionText}
            />
            <TextInput
              label="Источник картинки"
              placeholder="Источник изображения"
              value={source}
              onChange={setSource}
            />
            {error}
            <Button
              disabled={!localFile || isLoading}
              onClick={handleFileSubmit}
            >
              Добавить
            </Button>
          </>
        )
      }
    </div>
  );
}

export default function ImagesPlugin({
  captionsEnabled,
}: {
  captionsEnabled?: boolean,
}): ReactElement | null {
  const [ editor ] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ ImageNode ])) {
      throw new Error("ImagesPlugin: ImageNode not registered on editor");
    }

    return mergeRegister(
      // Гарантируем хвостовой абзац после блочного декоратора (картинка,
      // слайдер, видео…), если он оказался последним ребёнком root. Иначе
      // после него некуда поставить каретку: клик ниже картинки «теряет»
      // курсор. Транзформ идемпотентен — добавляет абзац только когда его нет.
      editor.registerNodeTransform(RootNode, (root) => {
        const last = root.getLastChild();
        if ($isDecoratorNode(last) && !last.isInline()) {
          root.append($createParagraphNode());
        }
      }),
      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createImageNode(payload);
          $insertNodes([ imageNode ]);
          // Никакого ручного вставления хвостового параграфа после image.
          // $insertNodes для block-decorator'а сам расщепляет окружающий
          // параграф (если был) и оставляет нужный «хвост». Любая наша
          // дополнительная вставка приводила к дублированию пустых
          // параграфов, отчего первый Enter в этом «хвосте» создавал
          // визуально два новых блока (один уже был там после вставки).

          if (payload.captionText && payload.showCaption) {
            const captionEditor = imageNode.__caption;
            const state = captionEditor.parseEditorState(JSON.stringify({
              root: {

                children: [{
                  children: [{
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: payload.captionText,
                    type: "text",
                    version: 1,
                  }],
                  direction: "ltr",
                  format: "",
                  indent: 0,
                  type: "paragraph",
                  version: 1,
                }],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1,
              },
            }));
            captionEditor.setEditorState(state);
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return $onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return $onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return $onDrop(event, editor);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      // Safari/WebKit-фикс. В rich-text дефолтном обработчике
      // KEY_ENTER_COMMAND для Safari preventDefault НЕ вызывается
      // (Lexical полагается на beforeinput). Это приводит к двойной
      // вставке параграфа, когда курсор стоит у block-decorator'а
      // (image, slider): Lexical вставляет 1 параграф своим
      // INSERT_PARAGRAPH_COMMAND'ом, и поверх native contenteditable
      // вставляет ещё один. Перехватываем Enter на высоком приоритете
      // ТОЛЬКО для случая курсор-рядом-с-картинкой и вставляем
      // ровно один параграф вручную, погасив default browser handling.
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event) return false;
          // Используется read для проверки, действие потом — в update.
          let nearImage = false;
          editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
            const anchor = selection.anchor;
            // (1) Курсор стоит между блоками root: anchor.key === 'root',
            //     offset указывает индекс ребёнка перед которым каретка.
            if (anchor.key === "root") {
              const children = $getRoot().getChildren();
              const before = children[ anchor.offset - 1 ];
              const after = children[ anchor.offset ];
              if ($isImageNode(before) || $isImageNode(after)) nearImage = true;
              return;
            }
            // (2) Курсор в пустом параграфе, соседом которого является image.
            const node = anchor.getNode();
            if ($isParagraphNode(node) && node.getChildrenSize() === 0) {
              if (
                $isImageNode(node.getPreviousSibling()) ||
                $isImageNode(node.getNextSibling())
              ) {
                nearImage = true;
              }
            }
          });

          if (!nearImage) return false;

          // Гасим native contenteditable Enter и вставляем 1 параграф
          // через стандартный Lexical-путь.
          event.preventDefault();
          editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      // Выравнивание картинки. Дефолтный rich-text обработчик
      // FORMAT_ELEMENT_COMMAND ищет вверх ElementNode-родителя и ставит
      // format на него — для картинки это root (картинка — DecoratorNode,
      // не Element), из-за чего выравнивание «не работало». Перехватываем
      // на HIGH (выше EDITOR) для NodeSelection с картинками и пишем format
      // в саму ноду. Возвращаем true только если в выделении есть картинки.
      editor.registerCommand(
        FORMAT_ELEMENT_COMMAND,
        (format) => {
          const selection = $getSelection();
          if (!$isNodeSelection(selection)) return false;
          const images = selection.getNodes().filter($isImageNode);
          if (images.length === 0) return false;
          editor.update(() => {
            for (const img of images) img.setFormat(format);
          });
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [ captionsEnabled, editor ]);

  return null;
}

const TRANSPARENT_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const img = document.createElement("img");
img.src = TRANSPARENT_IMAGE;

function $onDragStart(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData("text/plain", "_");
  dataTransfer.setDragImage(
    img, 0, 0,
  );
  dataTransfer.setData("application/x-lexical-drag",
    JSON.stringify({
      data: {
        altText: node.__altText,
        caption: node.__caption,
        captionText: node.__captionText,
        height: node.__height,
        key: node.getKey(),
        maxWidth: node.__maxWidth,
        showCaption: node.__showCaption,
        source: node.__source,
        src: node.__src,
        width: node.__width,
        widthMode: node.__widthMode,
      },
      type: "image",
    }));

  return true;
}

function $onDragover(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }
  return true;
}

function $onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const data = getDragImageData(event);
  if (!data) {
    return false;
  }
  const existingLink = $findMatchingParent(node,
    (parent): parent is LinkNode =>
      !$isAutoLinkNode(parent) && $isLinkNode(parent));
  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
    if (existingLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, existingLink.getURL());
    }
  }
  return true;
}

function $getImageNodeInSelection(): ImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[ 0 ];
  return $isImageNode(node) ?
    node :
    null;
}

function getDragImageData(event: DragEvent): null | InsertImagePayload {
  const dragData = event.dataTransfer?.getData("application/x-lexical-drag");
  if (!dragData) {
    return null;
  }
  const { type, data } = JSON.parse(dragData);
  if (type !== "image") {
    return null;
  }

  return data;
}

declare global {
  interface DragEvent {
    rangeOffset?: number,
    rangeParent?: Node,
  }
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    isHTMLElement(target) &&
    !target.closest("code, span.editor-image") &&
    isHTMLElement(target.parentElement) &&
    target.parentElement.closest("div.ContentEditable__root")
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const domSelection = getDOMSelectionFromTarget(event.target);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error("Cannot get the selection when dragging");
  }

  return range;
}
