import {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  COMMAND_PRIORITY_CRITICAL,
  NodeKey,
  SELECTION_CHANGE_COMMAND,
} from "lexical";

import { $isImageNode, ImageNode } from "./ImageNode";

import "./ImageToolbar.scss";

/**
 * Статичный тулбар для изображения — отображается в общем потоке документа
 * (sticky), сразу под основным тулбаром, аналогично TableToolbar. Появляется,
 * когда в редакторе выделена ImageNode (NodeSelection), иначе возвращает null.
 */
export function ImageToolbar(): ReactElement | null {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();

  const [ nodeKey, setNodeKey ] = useState<NodeKey | null>(null);
  const [ widthMode, setWidthMode ] = useState<"full" | "fixed">("full");
  const [ captionText, setCaptionText ] = useState("");
  const [ source, setSource ] = useState("");
  const [ altText, setAltText ] = useState("");

  const [ editing, setEditing ] = useState<null | "source" | "alt" | "caption">(null);
  const [ sourceValue, setSourceValue ] = useState("");
  const [ altValue, setAltValue ] = useState("");
  const [ captionValue, setCaptionValue ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Считываем выделенный image из NodeSelection.
  const sync = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isNodeSelection(selection)) {
        setNodeKey(null);
        return;
      }
      const nodes = selection.getNodes();
      const img = nodes.find($isImageNode);
      if (!img) {
        setNodeKey(null);
        return;
      }
      setNodeKey(img.getKey());
      setWidthMode(img.getWidthMode());
      setCaptionText(img.getCaptionText());
      setSource(img.__source || "");
      setAltText(img.getAltText());
    });
  }, [ editor ]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => sync()),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          sync();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerMutationListener(ImageNode, () => sync()),
    );
  }, [ editor, sync ]);

  // При смене выделенного image сбрасываем режим редактирования и значения.
  useEffect(() => {
    setEditing(null);
    setSourceValue(source);
    setAltValue(altText);
    setCaptionValue(captionText);
  }, [
    nodeKey,
    source,
    altText,
    captionText,
  ]);

  // Автофокус инпута в режиме редактирования.
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [ editing ]);

  const updateNode = useCallback((mutator: (img: ImageNode) => void) => {
    if (!nodeKey) return;
    editor.update(() => {
      const n = $getNodeByKey(nodeKey);
      if ($isImageNode(n)) mutator(n);
    });
  }, [ editor, nodeKey ]);

  // Получает текущую отрендеренную ширину <img>. Нужно при переключении
  // full → fixed: фиксируем видимый сейчас размер, а не natural.
  const getRenderedWidth = useCallback((): number | null => {
    if (!nodeKey) return null;
    const el = editor.getElementByKey(nodeKey);
    const img = el?.querySelector("img");
    if (!img) return null;
    const w = img.getBoundingClientRect().width;
    return w || null;
  }, [ editor, nodeKey ]);

  const onToggleFull = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    updateNode((n) => {
      if (next) {
        // Full — снимаем явные width/height, чтобы картинка натянулась
        // на editor content area.
        n.setWidthAndHeight("inherit", "inherit");
        n.setWidthMode("full");
      } else {
        const rendered = getRenderedWidth();
        if (rendered && rendered > 0) {
          n.setWidthAndHeight(Math.round(rendered), "inherit");
        }
        n.setWidthMode("fixed");
      }
    });
  }, [ updateNode, getRenderedWidth ]);

  const saveCaption = useCallback((value: string) => {
    updateNode((n) => n.setCaptionText(value));
    setEditing(null);
  }, [ updateNode ]);

  const saveSource = useCallback((value: string) => {
    updateNode((n) => n.setSource(value));
    setEditing(null);
  }, [ updateNode ]);

  const saveAlt = useCallback((value: string) => {
    updateNode((n) => n.setAltText(value));
    setEditing(null);
  }, [ updateNode ]);

  if (!isEditable || !nodeKey) return null;

  return (
    <div className="image-toolbar">
      <label className="image-toolbar__checkbox">
        <input
          checked={widthMode === "full"}
          type="checkbox"
          onChange={onToggleFull}
        />
        <span>На всю ширину</span>
      </label>

      <span className="image-toolbar__divider" />

      {
        editing === "caption" ?
          (
            <input
              ref={inputRef}
              className="image-toolbar__input"
              placeholder="Описание изображения"
              value={captionValue}
              onBlur={() => saveCaption(captionValue)}
              onChange={(e) => setCaptionValue(e.target.value)}
              onKeyDown={
                (e) => {
                  if (e.key === "Enter") saveCaption(captionValue);
                  else if (e.key === "Escape") {
                    setCaptionValue(captionText);
                    setEditing(null);
                  }
                }
              }
            />
          ) :
          (
            <button
              className={
                `image-toolbar__btn ${captionText ?
                  "image-toolbar__btn--active" :
                  ""}`
              }
              type="button"
              onClick={() => setEditing("caption")}
            >
              {
                captionText ?
                  `Описание: ${captionText}` :
                  "Добавить описание"
              }
            </button>
          )
      }

      {
        editing === "source" ?
          (
            <input
              ref={inputRef}
              className="image-toolbar__input"
              placeholder="Источник изображения"
              value={sourceValue}
              onBlur={() => saveSource(sourceValue)}
              onChange={(e) => setSourceValue(e.target.value)}
              onKeyDown={
                (e) => {
                  if (e.key === "Enter") saveSource(sourceValue);
                  else if (e.key === "Escape") {
                    setSourceValue(source);
                    setEditing(null);
                  }
                }
              }
            />
          ) :
          (
            <button
              className={
                `image-toolbar__btn ${source ?
                  "image-toolbar__btn--active" :
                  ""}`
              }
              type="button"
              onClick={() => setEditing("source")}
            >
              {
                source ?
                  `Источник: ${source}` :
                  "Добавить источник"
              }
            </button>
          )
      }

      {
        editing === "alt" ?
          (
            <input
              ref={inputRef}
              className="image-toolbar__input"
              placeholder="Альтернативный текст"
              value={altValue}
              onBlur={() => saveAlt(altValue)}
              onChange={(e) => setAltValue(e.target.value)}
              onKeyDown={
                (e) => {
                  if (e.key === "Enter") saveAlt(altValue);
                  else if (e.key === "Escape") {
                    setAltValue(altText);
                    setEditing(null);
                  }
                }
              }
            />
          ) :
          (
            <button
              className={
                `image-toolbar__btn ${altText ?
                  "image-toolbar__btn--active" :
                  ""}`
              }
              type="button"
              onClick={() => setEditing("alt")}
            >
              {
                altText ?
                  `Alt: ${altText}` :
                  "Добавить alt текст"
              }
            </button>
          )
      }
    </div>
  );
}
