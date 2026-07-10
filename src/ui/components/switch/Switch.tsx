import {
  FC,
  useId,
} from "react";

import styles from "./Switch.module.scss";

export const Switch: FC<{
  checked: boolean,
  id?: string,
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void,
  text: string,
}> = ({
  checked,
  onClick,
  text,
  id,
}) =>{
  const buttonId = useId();
  return (
    <div
      className={styles.switch}
      id={id}
    >
      <label htmlFor={buttonId}>{text}</label>
      <button
        aria-checked={checked}
        id={buttonId}
        role="switch"
        onClick={onClick}
      >
        <span />
      </button>
    </div>
  );
};
