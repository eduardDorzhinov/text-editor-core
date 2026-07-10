import { ReactNode } from "react";

import { useScopedPortal } from "@/vendor/shared";

import styles from "./FlashMessage.module.scss";

export interface FlashMessageProps {
  children: ReactNode,
}

export default function FlashMessage({
  children,
}: FlashMessageProps) {
  const scopedPortal = useScopedPortal();

  return scopedPortal(<div
    className={styles.overlay}
    role="dialog"
  >
    <p
      className={styles.alert}
      role="alert"
    >
      {children}
    </p>
  </div>,
  document.body);
}
