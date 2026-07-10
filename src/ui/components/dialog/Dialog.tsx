import { ReactNode } from "react";

import styles from "./Dialog.module.scss";

type Props = Readonly<{
  children: ReactNode,
}>;

export const DialogButtonsList = ({ children }: Props) => {
  return <div className={styles.buttonsList}>{children}</div>;
};

export const DialogActions = ({
  children,
}: Props) => {
  return (
    <div className={styles.actions}>
      {children}
    </div>
  );
};
