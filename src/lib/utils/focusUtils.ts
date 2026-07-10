export const findFirstFocusableDescendant = (startElement: HTMLElement): HTMLElement | null => {
  const focusableSelector =
    "button, a[href], input, select, textarea, details, summary [tabindex], [contenteditable]";

  return startElement.querySelector(focusableSelector) as HTMLElement;
};

export const focusNearestDescendant = (startElement: HTMLElement): HTMLElement | null => {
  const el = findFirstFocusableDescendant(startElement);
  el?.focus();
  return el;
};

export const isKeyboardInput = (event: MouseEvent | PointerEvent | React.MouseEvent): boolean => {
  if ("pointerId" in event && "pointerType" in event) {
    return event.pointerId === -1 && event.pointerType === "";
  }

  return event?.detail === 0;
};
