import { getEditorExtensionSettingsPanels } from "@/model/editor-extensions";
import { useSettings } from "@/model/providers/SettingsContext";
import { Switch } from "@/ui/components/switch";

import styles from "./Settings.module.scss";

export const Settings = () => {
  const {
    setOption,
    settings,
    showSettings,
  } = useSettings();

  const {
    commentMode,
    googleTranslatorPlugin,
    videoUrl,
    videoUpload,
    videoRutube,
    videoVk,
    audioUrl,
    audioUpload,
    downloadUrl,
    downloadUpload,
    pdfUrl,
    pdfUpload,
    scormInsert,
  } = settings;

  return (
    <>
      {
        showSettings && (
          <div className={styles.switches}>
            <Switch
              checked={commentMode}
              text="Режим комментариев"
              onClick={() => setOption("commentMode", !commentMode)}
            />
            <Switch
              checked={googleTranslatorPlugin}
              text="Google translator плагин"
              onClick={() => setOption("googleTranslatorPlugin", !googleTranslatorPlugin)}
            />

            <div className={styles.group}>
              <span className={styles.groupTitle}>Источники видео</span>
              <Switch
                checked={videoUrl}
                text="По ссылке"
                onClick={() => setOption("videoUrl", !videoUrl)}
              />
              <Switch
                checked={videoUpload}
                text="Загрузка файла"
                onClick={() => setOption("videoUpload", !videoUpload)}
              />
              <Switch
                checked={videoRutube}
                text="Rutube"
                onClick={() => setOption("videoRutube", !videoRutube)}
              />
              <Switch
                checked={videoVk}
                text="VK Видео"
                onClick={() => setOption("videoVk", !videoVk)}
              />
            </div>

            <div className={styles.group}>
              <span className={styles.groupTitle}>Источники аудио</span>
              <Switch
                checked={audioUrl}
                text="По ссылке"
                onClick={() => setOption("audioUrl", !audioUrl)}
              />
              <Switch
                checked={audioUpload}
                text="Загрузка файла"
                onClick={() => setOption("audioUpload", !audioUpload)}
              />
            </div>

            <div className={styles.group}>
              <span className={styles.groupTitle}>Файлы для скачивания</span>
              <Switch
                checked={downloadUrl}
                text="По ссылке"
                onClick={() => setOption("downloadUrl", !downloadUrl)}
              />
              <Switch
                checked={downloadUpload}
                text="Загрузка файла"
                onClick={() => setOption("downloadUpload", !downloadUpload)}
              />
            </div>

            <div className={styles.group}>
              <span className={styles.groupTitle}>PDF</span>
              <Switch
                checked={pdfUrl}
                text="По ссылке"
                onClick={() => setOption("pdfUrl", !pdfUrl)}
              />
              <Switch
                checked={pdfUpload}
                text="Загрузка файла"
                onClick={() => setOption("pdfUpload", !pdfUpload)}
              />
            </div>

            <div className={styles.group}>
              <span className={styles.groupTitle}>SCORM</span>
              <Switch
                checked={scormInsert}
                text="Вставка SCORM"
                onClick={() => setOption("scormInsert", !scormInsert)}
              />
            </div>

            {
              // Группы настроек из расширений.
              getEditorExtensionSettingsPanels().map((panel) => (
                <div
                  key={panel.title}
                  className={styles.group}
                >
                  <span className={styles.groupTitle}>{panel.title}</span>
                  {
                    panel.rows.map((row) => (
                      <Switch
                        key={row.key}
                        checked={Boolean(settings[ row.key ])}
                        text={row.text}
                        onClick={() => setOption(row.key, !settings[ row.key ])}
                      />
                    ))
                  }
                </div>
              ))
            }
          </div>
        )
      }
    </>
  );
};
