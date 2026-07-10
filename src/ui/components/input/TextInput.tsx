import { HTMLInputTypeAttribute, ReactElement } from "react";

import styles from "./Input.module.scss";

type Props = Readonly<{
  "data-test-id"?: string,
  "label": string,
  "onChange": (val: string) => void,
  "placeholder"?: string,
  "value": string,
  "type"?: HTMLInputTypeAttribute,
}>;

export const TextInput = ({
  label,
  value,
  onChange,
  placeholder = "",
  "data-test-id": dataTestId,
  type = "text",
}: Props): ReactElement => {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        data-test-id={dataTestId}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={
          (e) => {
            onChange(e.target.value);
          }
        }
      />
    </div>
  );
};
