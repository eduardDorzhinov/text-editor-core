import { LexicalEditor } from "lexical";

import { INSERT_LAYOUT_COMMAND } from "./LayoutPlugin";

import styles from "./InsertLayoutDialog.module.scss";

const LAYOUTS = [
  { label: "2 равных", value: "1fr 1fr", columns: [ 1, 1 ]},
  { label: "25% — 75%", value: "1fr 3fr", columns: [ 1, 3 ]},
  { label: "75% — 25%", value: "3fr 1fr", columns: [ 3, 1 ]},
  { label: "3 равных", value: "1fr 1fr 1fr", columns: [
    1,
    1,
    1,
  ]},
  { label: "25% — 50% — 25%", value: "1fr 2fr 1fr", columns: [
    1,
    2,
    1,
  ]},
  { label: "50% — 25% — 25%", value: "2fr 1fr 1fr", columns: [
    2,
    1,
    1,
  ]},
  { label: "25% — 25% — 50%", value: "1fr 1fr 2fr", columns: [
    1,
    1,
    2,
  ]},
  { label: "4 равных", value: "1fr 1fr 1fr 1fr", columns: [
    1,
    1,
    1,
    1,
  ]},
];

export function InsertLayoutDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}) {
  const onClick = (value: string) => {
    activeEditor.dispatchCommand(INSERT_LAYOUT_COMMAND, value);
    onClose();
  };

  return (
    <div className={styles.grid}>
      {
        LAYOUTS.map(({ label, value, columns }) => (
          <button
            key={value}
            className={styles.card}
            type="button"
            onClick={() => onClick(value)}
          >
            <div
              className={styles.preview}
              style={{ gridTemplateColumns: columns.map((c) => `${c}fr`).join(" ") }}
            >
              {
                columns.map((_, i) => (
                  <div
                    key={i}
                    className={styles.column}
                  />
                ))
              }
            </div>
            <span className={styles.label}>{label}</span>
          </button>
        ))
      }
    </div>
  );
}
