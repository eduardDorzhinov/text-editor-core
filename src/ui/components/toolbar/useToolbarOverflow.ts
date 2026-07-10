import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

/**
 * Считает, сколько «сворачиваемых» кнопок тулбара (помеченных `data-tb-cid`)
 * не помещаются по ширине и должны уйти в меню «⋯».
 *
 * Работает в две фазы, чтобы не зависеть от кэша и не осциллировать:
 *  1. measure — компонент рендерит ВСЕ сворачиваемые кнопки видимыми; хук
 *     сравнивает scrollWidth с clientWidth и, если не влезает, «прячет»
 *     хвостовые кнопки (в DOM они идут в порядке приоритета: отступы —
 *     последние, поэтому скрываются первыми), пока не поместится.
 *  2. ready — рендер с посчитанным hiddenCount и кнопкой «⋯».
 *
 * Повторный замер запускается при смене сигнатуры (изменился состав/лейблы
 * тулбара) и при ресайзе (ResizeObserver на тулбаре и его контейнере +
 * window.resize — сайдбар меняет ширину через padding-right у корня).
 */
const ELLIPSIS_WIDTH = 40;

const outerWidth = (el: HTMLElement): number => {
  const cs = getComputedStyle(el);
  return el.offsetWidth +
    parseFloat(cs.marginLeft || "0") +
    parseFloat(cs.marginRight || "0");
};

export function useToolbarOverflow(toolbarRef: RefObject<HTMLDivElement | null> | undefined,
  signature: string): { hiddenCount: number, measuring: boolean } {
  const [ measuring, setMeasuring ] = useState(true);
  const [ hiddenCount, setHiddenCount ] = useState(0);

  // Смена сигнатуры — заново замерить.
  useLayoutEffect(() => {
    setMeasuring(true);
  }, [ signature ]);

  // Ресайз — заново замерить (фаза measure покажет все кнопки и пересчитает).
  useEffect(() => {
    const el = toolbarRef?.current;
    if (!el) return;

    const trigger = () => setMeasuring(true);
    window.addEventListener("resize", trigger);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(trigger);
      ro.observe(el);
      const container = el.closest("#text-creator-root");
      if (container) ro.observe(container);
    }

    return () => {
      window.removeEventListener("resize", trigger);
      ro?.disconnect();
    };
  }, [ toolbarRef ]);

  // Фаза measure: все кнопки видимы → считаем, сколько хвостовых спрятать.
  useLayoutEffect(() => {
    if (!measuring) return;
    const el = toolbarRef?.current;
    if (!el) {
      setMeasuring(false);
      return;
    }

    const client = el.clientWidth;
    const scroll = el.scrollWidth;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-tb-cid]"));

    let hidden = 0;
    if (scroll > client && nodes.length > 0) {
      // Нужно освободить столько, плюс место под кнопку «⋯».
      let need = scroll - client + ELLIPSIS_WIDTH;
      for (let i = nodes.length - 1; i >= 0 && need > 0; i--) {
        need -= outerWidth(nodes[ i ]);
        hidden++;
      }
    }

    setHiddenCount(Math.min(hidden, nodes.length));
    setMeasuring(false);
  }, [
    measuring,
    signature,
    toolbarRef,
  ]);

  return { hiddenCount, measuring };
}
