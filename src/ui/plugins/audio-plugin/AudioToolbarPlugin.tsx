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

import { AudioNode } from "./AudioNode";
import { insertAudio } from "./insertAudio";

import styles from "./AudioToolbarPlugin.module.scss";

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
  settingKey: "audioUrl",
  label: "По ссылке",
  Icon: FiLink,
}, {
  id: "file",
  settingKey: "audioUpload",
  label: "Загрузить",
  Icon: FiUploadCloud,
  // TODO: реализовать загрузку файла
  disabled: true,
}];

export const InsertAudioDialog = ({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}) => {
  const { settings } = useSettings();
  const sourceOptions = ALL_SOURCE_OPTIONS.filter((opt) => settings[ opt.settingKey as keyof typeof settings ]);
  const [ mode, setMode ] = useState<SourceType>(null);
  const [ src, setSrc ] = useState("");

  const onSave = (audioSrc: string) => {
    activeEditor.update(() => {
      insertAudio(
        audioSrc, "", "",
      );
    });
    onClose();
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
              type="text"
              value={src}
              onChange={setSrc}
            />
            <Button
              disabled={!src}
              onClick={() => onSave(src)}
            >
              Добавить
            </Button>
          </>
        )
      }
    </div>
  );
};

export const AudioPlugin = (): ReactElement | null => {
  const [ editor ] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([ AudioNode ])) {
      throw new Error("AudioPlugin: AudioNode is not registered on editor");
    }
  }, [ editor ]);

  return null;
};
