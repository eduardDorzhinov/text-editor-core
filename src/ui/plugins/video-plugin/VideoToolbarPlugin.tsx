import {
  ReactElement,
  useEffect,
  useState,
} from "react";
import {
  FiLink,
  FiUploadCloud,
} from "react-icons/fi";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalEditor } from "lexical";

import { useSettings } from "@/model/providers/SettingsContext";
import { Button } from "@/ui/components/button";
import { TextInput } from "@/ui/components/input";

import { insertVideo } from "./insertVideo";
import {
  VIDEO_ORIENTATION,
  VideoNode,
  VideoOrientation,
} from "./VideoNode";
import {
  detectVideoSourceFull,
  getVideoSourceLabel,
} from "./videoUtils";

import styles from "./VideoToolbarPlugin.module.scss";

type SourceType = null | "url" | "file";

type SourceOption = {
  id: SourceType,
  settingKey: string,
  label: string,
  Icon: React.FC,
  disabled?: boolean,
};

const ALL_SOURCE_OPTIONS: SourceOption[] = [{
  id: "url",
  settingKey: "videoUrl",
  label: "По ссылке",
  Icon: FiLink,
}, {
  id: "file",
  settingKey: "videoUpload",
  label: "Загрузить",
  Icon: FiUploadCloud,
  // TODO: реализовать загрузку файла
  disabled: true,
}];

const OrientationPicker = ({
  value,
  onChange,
}: {
  value: VideoOrientation,
  onChange: (v: VideoOrientation) => void,
}) => (
  <div className={styles.orientationRow}>
    <span className={styles.orientationLabel}>Ориентация</span>
    <div className={styles.orientationButtons}>
      <button
        className={
          `${styles.orientationBtn} ${value === VIDEO_ORIENTATION.Horizontal ?
            styles.orientationBtnActive :
            ""}`
        }
        type="button"
        onClick={() => onChange(VIDEO_ORIENTATION.Horizontal)}
      >
        <span className={styles.orientationIconH} />
        {"Гориз."}
      </button>
      <button
        className={
          `${styles.orientationBtn} ${value === VIDEO_ORIENTATION.Vertical ?
            styles.orientationBtnActive :
            ""}`
        }
        type="button"
        onClick={() => onChange(VIDEO_ORIENTATION.Vertical)}
      >
        <span className={styles.orientationIconV} />
        {"Верт."}
      </button>
    </div>
  </div>
);

export const InsertVideoDialog = ({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}) => {
  const { settings } = useSettings();
  const sourceOptions = ALL_SOURCE_OPTIONS.filter((opt) => settings[ opt.settingKey as keyof typeof settings ]);
  // Если доступен только один источник — открываем сразу его форму,
  // без промежуточного экрана выбора.
  const enabledOptions = sourceOptions.filter((opt) => !opt.disabled);
  const initialMode: SourceType = enabledOptions.length === 1 ?
    enabledOptions[ 0 ].id :
    null;
  const [ mode, setMode ] = useState<SourceType>(initialMode);
  const [ src, setSrc ] = useState("");
  const [ preview, setPreview ] = useState("");
  const [ orientation, setOrientation ] = useState<VideoOrientation>(VIDEO_ORIENTATION.Horizontal);

  const detected = detectVideoSourceFull(src);

  const onSave = (videoSrc: string) => {
    activeEditor.update(() => {
      insertVideo(
        videoSrc, preview || "default", orientation,
      );
    });
    onClose();
  };

  const handleUrlSubmit = () => {
    if (!src.trim()) return;
    // Если ресурс распознан и пользователь оставил галочку «инструменты <X>» —
    // вставляем embed-URL соответствующей платформы; иначе — сырую ссылку.
    const finalSrc = detected ?
      detected.embedUrl :
      src.trim();
    onSave(finalSrc);
  };

  if (!mode) {
    return (
      <div
        className={
          sourceOptions.length === 1 ?
            styles.gridSingle :
            styles.grid
        }
      >
        {
          sourceOptions.map(({ id, label, Icon, disabled }) => (
            <button
              key={id}
              className={
                `${styles.card} ${disabled ?
                  styles.cardDisabled :
                  ""}`
              }
              disabled={disabled}
              type="button"
              onClick={() => !disabled && setMode(id)}
            >
              <div className={styles.cardIcon}>
                <Icon />
              </div>
              <span className={styles.cardLabel}>{label}</span>
              {disabled && <span className={styles.cardBadge}>скоро</span>}
            </button>
          ))
        }
      </div>
    );
  }

  return (
    <div className={styles.form}>
      {
        // Кнопка «Назад» нужна только если есть выбор между несколькими источниками.
        enabledOptions.length > 1 && (
          <button
            className={styles.back}
            type="button"
            onClick={() => setMode(null)}
          >
            &larr; Назад
          </button>
        )
      }

      {
        mode === "url" && (
          <>
            <TextInput
              label="Ссылка *"
              placeholder="https://..."
              type="text"
              value={src}
              onChange={setSrc}
            />
            {
              detected && (
                <div className={styles.detectionNotice}>
                  <span className={styles.detectionLabel}>
                    {"Ресурс идентифицирован как "}
                    <strong>{getVideoSourceLabel(detected.source)}</strong>
                  </span>
                  {
                    // VK для многих видео требует токен `hash` в embed-URL.
                    // Если пользователь вставил обычный watch-URL, hash
                    // отсутствует, и плеер может вернуть «Видео недоступно».
                    detected.source === "vk" && !/[?&]hash=/.test(src) && (
                      <div className={styles.detectionHint}>
                        {"Если видео не воспроизводится — на странице VK откройте «Поделиться → Сайт» и вставьте URL из атрибута src в iframe (он содержит "}
                        <code>hash</code>
                        {", который VK требует для большинства видео)."}
                      </div>
                    )
                  }
                </div>
              )
            }
            <OrientationPicker
              value={orientation}
              onChange={setOrientation}
            />
            <TextInput
              label="Превью"
              placeholder="Ссылка на превью"
              type="text"
              value={preview}
              onChange={setPreview}
            />
            <Button
              disabled={!src.trim()}
              onClick={handleUrlSubmit}
            >
              Добавить
            </Button>
          </>
        )
      }
    </div>
  );
};

export const VideoPlugin = (): ReactElement | null => {
  const [ editor ] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([ VideoNode ])) {
      throw new Error("VideoPlugin: VideoNode is not registered on editor");
    }
  }, [ editor ]);

  return null;
};
