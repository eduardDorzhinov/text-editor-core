import {
  ReactNode,
  useEffect,
  useRef,
} from "react";

import { isDOMNode } from "lexical";

import { useMainContext } from "@/model/providers/MainContext";
import { useScopedPortal } from "@/vendor/shared";

import styles from "./Modal.module.scss";

function PortalImpl({
  onClose,
  children,
  title,
  closeOnClickOutside,
}: {
  children: ReactNode,
  closeOnClickOutside: boolean,
  onClose: () => void,
  title: string,
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current !== null) {
      modalRef.current.focus();
    }
  }, []);

  useEffect(() => {
    let modalOverlayElement: HTMLElement | null = null;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const clickOutsideHandler = (event: MouseEvent) => {
      const target = event.target;
      if (
        modalRef.current !== null &&
        isDOMNode(target) &&
        !modalRef.current.contains(target) &&
        closeOnClickOutside
      ) {
        onClose();
      }
    };
    const modelElement = modalRef.current;
    if (modelElement !== null) {
      modalOverlayElement = modelElement.parentElement;
      if (modalOverlayElement !== null) {
        modalOverlayElement.addEventListener("click", clickOutsideHandler);
      }
    }

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
      if (modalOverlayElement !== null) {
        modalOverlayElement?.removeEventListener("click", clickOutsideHandler);
      }
    };
  }, [ closeOnClickOutside, onClose ]);

  return (
    <div
      className="edt_text_editor_Modal__overlay"
      role="dialog"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        tabIndex={-1}
      >
        <h2 className={styles.title}>{title}</h2>
        <button
          aria-label="Close modal"
          className={styles.closeButton}
          type="button"
          onClick={onClose}
        >
          X
        </button>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

export const Modal = ({
  onClose,
  children,
  title,
  closeOnClickOutside = false,
  renderBody,
}: {
  children: ReactNode,
  closeOnClickOutside?: boolean,
  onClose: () => void,
  title: string,
  renderBody: boolean,
}) => {
  const scopedPortal = useScopedPortal();
  const { wrapRef } = useMainContext();
  return scopedPortal(<PortalImpl
    closeOnClickOutside={closeOnClickOutside}
    title={title}
    onClose={onClose}
  >
    {children}
  </PortalImpl>,
  (renderBody || !wrapRef?.current) ?
    document.body :
    wrapRef.current);
};
