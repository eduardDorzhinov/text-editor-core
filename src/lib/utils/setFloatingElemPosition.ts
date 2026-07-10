const VERTICAL_GAP = 10;
const HORIZONTAL_OFFSET = 5;

export function setFloatingElemPosition(
  targetRect: DOMRect | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
  isLink: boolean = false,
  verticalGap: number = VERTICAL_GAP,
  horizontalOffset: number = HORIZONTAL_OFFSET,
): void {
  const scrollerElem = anchorElem.parentElement;

  if (!targetRect || !scrollerElem) {
    floatingElem.style.opacity = "0";
    floatingElem.style.transform = "translate(-10000px, -10000px)";
    return;
  }

  const floatingElemRect = floatingElem.getBoundingClientRect();
  const anchorElemRect = anchorElem.getBoundingClientRect();
  const scrollerRect = scrollerElem.getBoundingClientRect();

  // -----------------------------
  // Vertical positioning
  // -----------------------------
  let top = targetRect.top - floatingElemRect.height - verticalGap;

  if (top < scrollerRect.top) {
    top +=
      floatingElemRect.height +
      targetRect.height +
      verticalGap * (isLink ?
        9 :
        2);
  }

  // -----------------------------
  // Horizontal positioning
  // -----------------------------
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const scrollerCenterX = scrollerRect.left + scrollerRect.width / 2;

  const isRightSide = targetCenterX > scrollerCenterX;

  let left = isRightSide ?
    // правый край текста = правый край тулбара
    targetRect.right - floatingElemRect.width + horizontalOffset :
    // левый край текста = левый край тулбара
    targetRect.left - horizontalOffset;

  // -----------------------------
  // Clamp inside scroller
  // -----------------------------
  if (left + floatingElemRect.width > scrollerRect.right) {
    left = scrollerRect.right - floatingElemRect.width - horizontalOffset;
  }

  if (left < scrollerRect.left) {
    left = scrollerRect.left + horizontalOffset;
  }

  // -----------------------------
  // Convert to anchor-relative coords
  // -----------------------------
  top -= anchorElemRect.top;
  left -= anchorElemRect.left;

  // -----------------------------
  // Apply styles
  // -----------------------------
  floatingElem.style.opacity = "1";
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}
