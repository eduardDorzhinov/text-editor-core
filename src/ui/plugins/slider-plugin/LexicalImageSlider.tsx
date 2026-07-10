import { DragEvent, FC, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { MdEdit, MdOutlineRemoveRedEye } from "react-icons/md";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, LexicalEditor } from "lexical";

import { useDecoratorSelection } from "@/lib/hooks/use-decorator-selection";
import { useModal } from "@/ui/components/modal";
import { InsertImageDialog } from "@/ui/plugins/images";

import { SlideEditDialog } from "./SlideEditDialog";
import { SliderNode } from "./SliderNode";

import s from "./LexicalImageSlider.module.scss";

export interface ImageSlide {
  id: string,
  src: string,
  alt?: string,
  /** Подпись под слайдом. */
  caption?: string,
  /** Источник (например «Фото: Unsplash / А. Иванов»). */
  source?: string,
  /** Опциональная ссылка для кликабельного источника. */
  sourceUrl?: string,
}

interface LexicalImageSliderProps {
  images: ImageSlide[],
  editor: LexicalEditor,
  onChange: (images: ImageSlide[]) => void,
}

export const LexicalImageSlider: FC<LexicalImageSliderProps> = ({
  images,
  onChange,
  editor,
}) => {
  const [ modal, showModal ] = useModal();
  // Индекс перетаскиваемого слайда (для подсветки) и индекс цели (для линии-индикатора).
  const [ dragIndex, setDragIndex ] = useState<number | null>(null);
  const [ overIndex, setOverIndex ] = useState<number | null>(null);

  const remove = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to > images.length) return;
    const copy = [ ...images ];
    const [ item ] = copy.splice(from, 1);
    // После выреза индексы справа от from сдвигаются влево.
    const adjustedTo = to > from ?
      to - 1 :
      to;
    copy.splice(
      adjustedTo, 0, item,
    );
    onChange(copy);
  };

  const preview = (src: string, index: number) => {
    showModal(
      `Изображение №${index + 1}`,
      () => (
        <div className={s.modal}>
          <img
            alt="preview"
            src={src}
          />
        </div>
      ),
      false,
      true,
    );
  };

  // InsertImageDialog отдаёт payload вида ImagePayload: помимо src/altText
  // там есть captionText и source — раньше мы их теряли, и в слайде оставались
  // только src + alt. Прокидываем все три поля в слайд.
  const onAdd = (payload: {
    altText: string,
    src: string,
    captionText?: string,
    source?: string,
  }) => {
    onChange([ ...images, {
      src: payload.src,
      alt: payload.altText,
      caption: payload.captionText || undefined,
      source: payload.source || undefined,
      id: crypto.randomUUID(),
    }]);
  };

  const openEdit = (slide: ImageSlide) => {
    showModal(
      "Редактировать слайд",
      (onClose) => (
        <SlideEditDialog
          slide={slide}
          onClose={onClose}
          onSave={
            (next) => onChange(images.map((img) => (img.id === next.id ?
              next :
              img)))
          }
        />
      ),
      false,
      true,
    );
  };

  // --- Drag-and-drop handlers (HTML5 native) ---

  const onDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index);
    // Без setData Firefox блокирует drag.
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Определяем, в какую половину карточки попал курсор —
    // ставим линию слева/справа от карточки.
    const rect = e.currentTarget.getBoundingClientRect();
    const insertAfter = e.clientX > rect.left + rect.width / 2;
    setOverIndex(insertAfter ?
      index + 1 :
      index);
  };

  const onDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIndex !== null && overIndex !== null) {
      reorder(dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div
      className={s.root}
      contentEditable={false}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className={s.row}>
        <button
          className={s.addButton}
          type="button"
          onClick={
            () => {
              showModal(
                "Вставить изображение",
                (onClose) => (
                  <InsertImageDialog
                    activeEditor={editor}
                    onClose={onClose}
                    onSave={onAdd}
                  />
                ),
                false,
                true,
              );
            }
          }
        >
          +
        </button>

        {
          images.map((img, index) => (
            <div
              key={img.id}
              draggable
              className={
                [
                  s.imageWrapper,
                  dragIndex === index ?
                    s.dragging :
                    "",
                  overIndex === index ?
                    s.dropBefore :
                    "",
                  overIndex === index + 1 ?
                    s.dropAfter :
                    "",
                ].filter(Boolean).join(" ")
              }
              onDragEnd={onDragEnd}
              onDragOver={(e) => onDragOver(e, index)}
              onDragStart={(e) => onDragStart(e, index)}
            >
              <img
                alt={img.alt ?? ""}
                src={img.src}
              />

              <div className={s.overlayControls}>
                <button
                  title="Просмотр"
                  onClick={() => preview(img.src, index)}
                >
                  <MdOutlineRemoveRedEye />
                </button>
                <button
                  title="Редактировать описание, источник, alt"
                  type="button"
                  onClick={() => openEdit(img)}
                >
                  <MdEdit />
                </button>
                <button
                  title="Удалить"
                  type="button"
                  onClick={() => remove(img.id)}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        }
      </div>
      {modal}
    </div>
  );
};


export function SliderComponent({
  nodeKey,
  images,
}: {
  nodeKey: string,
  images: ImageSlide[],
}) {
  const [ editor ] = useLexicalComposerContext();
  const { rootRef, isFocused } = useDecoratorSelection(nodeKey);

  return (
    <div
      ref={rootRef}
      className={
        isFocused ?
          "tc-decorator-focused" :
          undefined
      }
    >
      <LexicalImageSlider
        editor={editor}
        images={images}
        onChange={
          (nextImages) => {
            editor.update(() => {
              // $getNodeByKey достаёт ноду из активного (pending) editor
              // state. Старый код брал её через editor.getEditorState()
              // ._nodeMap — это коммиченный (stale) state, и getWritable
              // на нём не патчил тот state, который Lexical в конце update
              // делает текущим. Изменения терялись (или приходили частично),
              // в т.ч. при добавлении нового слайда из InsertImageDialog.
              const node = $getNodeByKey(nodeKey);
              if (node instanceof SliderNode) {
                const writable = node.getWritable();
                writable.__images = nextImages;
              }
            });
          }
        }
      />
    </div>
  );
}
