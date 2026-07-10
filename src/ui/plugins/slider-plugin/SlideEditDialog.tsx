import { FC, useState } from "react";

import { Button } from "@/ui/components/button";
import { TextInput } from "@/ui/components/input";

import { ImageSlide } from "./LexicalImageSlider";

import s from "./SlideEditDialog.module.scss";

interface SlideEditDialogProps {
  slide: ImageSlide,
  onClose: () => void,
  onSave: (next: ImageSlide) => void,
}

/**
 * Модалка для редактирования слайда: ссылка на изображение (src),
 * описание (caption), источник, alt-текст. Сверху рендерится превью
 * картинки — реактивно обновляется при изменении ссылки.
 */
export const SlideEditDialog: FC<SlideEditDialogProps> = ({
  slide,
  onClose,
  onSave,
}) => {
  const [ src, setSrc ] = useState(slide.src);
  const [ caption, setCaption ] = useState(slide.caption || "");
  const [ source, setSource ] = useState(slide.source || "");
  const [ alt, setAlt ] = useState(slide.alt || "");
  // Локальное состояние ошибки загрузки превью — реагирует на onError у <img>.
  const [ previewError, setPreviewError ] = useState(false);

  const submit = () => {
    onSave({
      ...slide,
      src: src || slide.src,
      alt: alt || undefined,
      caption: caption || undefined,
      source: source || undefined,
      // Поле больше не используется в форме, но сохраняем уже имеющееся
      // значение из ноды, чтобы старые ссылки не терялись.
      sourceUrl: slide.sourceUrl,
    });
    onClose();
  };

  return (
    <div className={s.root}>
      <div className={s.previewBox}>
        {
          src && !previewError ?
            (
              <img
                alt={alt || caption || ""}
                className={s.previewImg}
                src={src}
                onError={() => setPreviewError(true)}
                onLoad={() => setPreviewError(false)}
              />
            ) :
            (
              <div className={s.previewEmpty}>
                {
                  src ?
                    "Не удалось загрузить изображение" :
                    "Превью появится после ввода ссылки"
                }
              </div>
            )
        }
      </div>

      <TextInput
        label="Ссылка на изображение"
        placeholder="https://..."
        value={src}
        onChange={
          (value) => {
            setSrc(value);
            setPreviewError(false);
          }
        }
      />
      <TextInput
        label="Описание"
        placeholder="Подпись под изображением"
        value={caption}
        onChange={setCaption}
      />
      <TextInput
        label="Источник"
        placeholder="Фото: Unsplash / А. Иванов"
        value={source}
        onChange={setSource}
      />
      <TextInput
        label="Alt текст"
        placeholder="Альтернативный текст"
        value={alt}
        onChange={setAlt}
      />
      <Button onClick={submit}>Сохранить</Button>
    </div>
  );
};
