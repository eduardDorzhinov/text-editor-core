import { RefObject, useEffect } from "react";

export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  handleOnClickOutside: (event: PointerEvent) => void,
) => {
  useEffect(() => {
    const listener = (event: PointerEvent) => {
      if (
        !ref.current ||
        ref.current.contains(event.target as Node) ||
        (triggerRef.current &&
          triggerRef.current.contains(event.target as Node))
      ) {
        return;
      }
      handleOnClickOutside(event);
    };
    document.addEventListener(
      "pointerdown", listener, true,
    );
    return () => {
      document.removeEventListener(
        "pointerdown", listener, true,
      );
    };
  }, [
    ref,
    handleOnClickOutside,
    triggerRef,
  ]);
};
