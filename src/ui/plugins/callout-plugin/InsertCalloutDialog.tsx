import { LexicalEditor } from "lexical";

import { type CalloutType, CALLOUT_TYPES } from "./CalloutContainerNode";
import { INSERT_CALLOUT_COMMAND } from "./CalloutPlugin";

import styles from "./InsertCalloutDialog.module.scss";

const CALLOUT_LABELS: Record<CalloutType, string> = {
  info: "Инфо",
  success: "Успех",
  warning: "Внимание",
  error: "Ошибка",
  tip: "Совет",
};

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: "\u2139\uFE0F",
  success: "\u2705",
  warning: "\u26A0\uFE0F",
  error: "\u274C",
  tip: "\uD83D\uDCA1",
};

export function InsertCalloutDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}) {
  const onClick = (type: CalloutType) => {
    activeEditor.dispatchCommand(INSERT_CALLOUT_COMMAND, type);
    onClose();
  };

  return (
    <div className={styles.grid}>
      {
        CALLOUT_TYPES.map((type) => (
          <button
            key={type}
            className={`${styles.option} ${styles[ `option_${type}` ]}`}
            type="button"
            onClick={() => onClick(type)}
          >
            <span className={styles.icon}>{CALLOUT_ICONS[ type ]}</span>
            <span className={styles.label}>{CALLOUT_LABELS[ type ]}</span>
          </button>
        ))
      }
    </div>
  );
}
