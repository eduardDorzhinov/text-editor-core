import {
  ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";

import { Modal } from "./Modal";

export const useModal = (): [
  ReactElement | null,
  (
    title: string,
    showModal: (onClose: () => void) => ReactElement,
    closeOnClickOutside?: boolean,
    renderBody?: boolean,
  ) => void,
] => {
  const [ modalContent, setModalContent ] = useState<null | {
    closeOnClickOutside: boolean,
    content: ReactElement,
    title: string,
    renderBody: boolean,
  }>(null);

  const onClose = useCallback(() => {
    if (document?.body?.style) {
      document.body.style.overflow = "";
    }
    setModalContent(null);
  }, []);

  const modal = useMemo(() => {
    if (modalContent === null) {
      return null;
    }
    const {
      title,
      content,
      closeOnClickOutside,
      renderBody,
    } = modalContent;
    return (
      <Modal
        closeOnClickOutside={closeOnClickOutside}
        renderBody={renderBody}
        title={title}
        onClose={onClose}
      >
        {content}
      </Modal>
    );
  }, [ modalContent, onClose ]);

  const showModal = useCallback((
    title: string,
    getContent: (onClose: () => void) => ReactElement,
    closeOnClickOutside = false,
    renderBody: boolean = false,
  ) => {
    if (document?.body?.style) {
      document.body.style.overflow = "hidden";
    }
    setModalContent({
      closeOnClickOutside,
      content: getContent(onClose),
      title,
      renderBody,
    });
  },
  [ onClose ]);

  return [ modal, showModal ];
};
