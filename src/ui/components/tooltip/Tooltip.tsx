import {
  CSSProperties,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { formatHotkey, getHotkey } from "@/lib/hotkeys";
import { useScopedPortal } from "@/vendor/shared";

import styles from "./Tooltip.module.scss";

type Placement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  /** Текст подсказки. Если не задан и есть hotkeyId — берётся label из реестра. */
  label?: string,
  /** id хоткея из реестра — авто-подставит клавиши */
  hotkeyId?: string,
  /** Явное переопределение клавиш ("Mod+B") */
  hotkey?: string,
  /** Желаемая сторона. Если не помещается — авто-флип на противоположную. */
  placement?: Placement,
  /** Задержка перед показом, мс */
  delay?: number,
  /** Содержимое (одна кнопка/иконка) */
  children: ReactNode,
}

interface Position {
  top: number,
  left: number,
  placement: Placement,
  arrowOffset: number,
}

const MARGIN = 8;

function opposite(p: Placement): Placement {
  switch (p) {
    case "top": return "bottom";
    case "bottom": return "top";
    case "left": return "right";
    case "right": return "left";
  }
}

function fits(
  p: Placement,
  trig: DOMRect,
  tip: DOMRect,
): boolean {
  switch (p) {
    case "top": return trig.top - tip.height - MARGIN >= 0;
    case "bottom": return trig.bottom + tip.height + MARGIN <= window.innerHeight;
    case "left": return trig.left - tip.width - MARGIN >= 0;
    case "right": return trig.right + tip.width + MARGIN <= window.innerWidth;
  }
}

export function Tooltip({
  label,
  hotkeyId,
  hotkey,
  placement = "top",
  delay = 300,
  children,
}: TooltipProps) {
  const scopedPortal = useScopedPortal();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ visible, setVisible ] = useState(false);
  const [ position, setPosition ] = useState<Position | null>(null);

  const hk = hotkeyId ?
    getHotkey(hotkeyId) :
    undefined;
  const keys = hotkey ?? hk?.keys;
  const tokens = keys ?
    formatHotkey(keys) :
    null;
  const effectiveLabel = label ?? hk?.label ?? "";

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) setPosition(null);
  }, [ visible ]);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const trig = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();

    // Авто-флип: если не помещается, и противоположная сторона помещается — переворачиваем.
    let actual: Placement = placement;
    if (!fits(
      actual, trig, tip,
    ) && fits(
      opposite(actual), trig, tip,
    )) {
      actual = opposite(actual);
    }

    let top: number;
    let left: number;
    let arrowOffset: number;

    if (actual === "top" || actual === "bottom") {
      const centerX = trig.left + trig.width / 2;
      const halfW = tip.width / 2;
      const minLeft = MARGIN + halfW;
      const maxLeft = window.innerWidth - MARGIN - halfW;
      const clampedCenter = Math.max(minLeft, Math.min(maxLeft, centerX));
      arrowOffset = centerX - clampedCenter;
      left = clampedCenter + window.scrollX;
      top = (actual === "top" ?
        trig.top - MARGIN :
        trig.bottom + MARGIN) + window.scrollY;
    } else {
      const centerY = trig.top + trig.height / 2;
      const halfH = tip.height / 2;
      const minTop = MARGIN + halfH;
      const maxTop = window.innerHeight - MARGIN - halfH;
      const clampedCenter = Math.max(minTop, Math.min(maxTop, centerY));
      arrowOffset = centerY - clampedCenter;
      top = clampedCenter + window.scrollY;
      left = (actual === "left" ?
        trig.left - MARGIN :
        trig.right + MARGIN) + window.scrollX;
    }

    setPosition({
      top,
      left,
      placement: actual,
      arrowOffset,
    });
  }, [
    visible,
    placement,
    label,
  ]);

  const transform = position ?
    {
      top: "translate(-50%, -100%)",
      bottom: "translate(-50%, 0)",
      left: "translate(-100%, -50%)",
      right: "translate(0, -50%)",
    }[ position.placement ] :
    undefined;

  const style: CSSProperties = position ?
    {
      top: position.top,
      left: position.left,
      transform,
      visibility: "visible",
    } :
    { top: 0, left: 0, visibility: "hidden", pointerEvents: "none" };

  let arrowStyle: CSSProperties = {};
  if (position) {
    if (position.placement === "top" || position.placement === "bottom") {
      arrowStyle = { left: `calc(50% + ${position.arrowOffset}px)` };
    } else {
      arrowStyle = { top: `calc(50% + ${position.arrowOffset}px)` };
    }
  }

  const placementClass = position ?
    styles[ position.placement ] :
    styles[ placement ];

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.trigger}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </span>
      {
        visible && scopedPortal(<div
          ref={tooltipRef}
          className={`${styles.tooltip} ${placementClass}`}
          role="tooltip"
          style={style}
        >
          <span className={styles.label}>{effectiveLabel}</span>
          {
            tokens && tokens.length > 0 && (
              <span className={styles.keys}>
                {
                  tokens.map((t, i) => (
                    <kbd
                      key={i}
                      className={styles.kbd}
                    >
                      {t}
                    </kbd>
                  ))
                }
              </span>
            )
          }
          <span
            className={styles.arrow}
            style={arrowStyle}
          />
        </div>,
        document.body)
      }
    </>
  );
}
