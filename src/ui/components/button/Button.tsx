import { ReactNode } from "react";

import joinClasses from "@/lib/utils/joinClasses";

import styles from "./Button.module.scss";

export const Button = ({
  children,
  className,
  onClick,
  disabled,
  small,
  title,
}: {
  children: ReactNode,
  className?: string,
  disabled?: boolean,
  onClick: () => void,
  small?: boolean,
  title?: string,
}) => {
  return (
    <button
      aria-label={title}
      className={
        joinClasses(
          styles.root,
          disabled && styles.disabled,
          small && styles.small,
          className,
        )
      }
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
