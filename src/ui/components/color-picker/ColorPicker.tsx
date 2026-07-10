import {
  ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import { MdOutlineClear } from "react-icons/md";

import { calculateZoomLevel } from "@lexical/utils";

import { isKeyboardInput } from "@/lib/utils/focusUtils";

import styles from "./ColorPicker.module.scss";

interface ColorPickerProps {
  color: string,
  onChange?: (
    value: string,
    skipHistoryStack: boolean,
    skipRefocus: boolean,
  ) => void,
  defaultColor?: string,
  useColorPicker?: boolean,
}

const basicColors = [
  "#d0021b",
  "#f5a623",
  "#f8e71c",
  "#8b572a",
  "#7ed321",
  "#417505",
  "#bd10e0",
  "#9e30ff",
  "#4a90e2",
  "#50e3c2",
  "#b8e986",
  "#000000",
  "#4a4a4a",
  "#9b9b9b",
  "#ffffff",
];

const WIDTH = 214;
const HEIGHT = 150;

let skipAddingToHistoryStack = false;

export function ColorPicker({
  color,
  onChange,
  defaultColor,
  useColorPicker = false,
}: Readonly<ColorPickerProps>) {
  const [ selfColor, setSelfColor ] = useState(transformColor("hex", color));
  const [ inputColor, setInputColor ] = useState(transformColor("hex", color).hex);
  const innerDivRef = useRef(null);

  const saturationPosition = useMemo(() => ({
    x: (selfColor.hsv.s / 100) * WIDTH,
    y: ((100 - selfColor.hsv.v) / 100) * HEIGHT,
  }),
  [ selfColor.hsv.s, selfColor.hsv.v ]);

  const huePosition = useMemo(() => ({
    x: (selfColor.hsv.h / 360) * WIDTH,
  }),
  [ selfColor.hsv ]);

  const emitOnChange = (newColor: string, skipRefocus: boolean = false) => {
    if (innerDivRef.current !== null && onChange) {
      onChange(
        newColor,
        skipAddingToHistoryStack,
        skipRefocus,
      );
    }
  };

  /**
   * Принимаем любой CSS-валидный цвет: hex (#fff, #fff8, #ffffff, #ffffff80),
   * rgb()/rgba(), hsl()/hsla(), а также именованные (red, transparent).
   * Если значение валидное — обновляем выбор и эмитим как есть (сохраняем
   * исходную форму, чтобы не терять alpha у rgba(...) при конвертации в hex).
   * Для визуального hsv/saturation-кросса используем hex-проекцию (alpha
   * пикером не представить — это известное ограничение).
   */
  const onSetHex = (value: string) => {
    setInputColor(value);
    const trimmed = value.trim();
    if (!isValidCssColor(trimmed)) return;
    const normalizedHex = toHex(trimmed);
    const newColor = transformColor("hex", normalizedHex);
    setSelfColor(newColor);
    // Если ввели rgba/hsla — эмитим исходную строку (с alpha),
    // иначе — нормализованный hex.
    const looksLikeAlpha = /^(rgba|hsla)\s*\(/i.test(trimmed) ||
      (trimmed.startsWith("#") && (trimmed.length === 5 || trimmed.length === 9));
    emitOnChange(looksLikeAlpha ?
      trimmed :
      newColor.hex);
  };

  const onMoveSaturation = ({ x, y }: Position) => {
    const newHsv = {
      ...selfColor.hsv,
      s: (x / WIDTH) * 100,
      v: 100 - (y / HEIGHT) * 100,
    };
    const newColor = transformColor("hsv", newHsv);
    setSelfColor(newColor);
    setInputColor(newColor.hex);
    emitOnChange(newColor.hex);
  };

  const onMoveHue = ({ x }: Position) => {
    const newHsv = { ...selfColor.hsv, h: (x / WIDTH) * 360 };
    const newColor = transformColor("hsv", newHsv);

    setSelfColor(newColor);
    setInputColor(newColor.hex);
    emitOnChange(newColor.hex);
  };

  const onBasicColorClick = (e: React.MouseEvent, basicColor: string) => {
    const newColor = transformColor("hex", basicColor);

    setSelfColor(newColor);
    setInputColor(newColor.hex);
    emitOnChange(newColor.hex, isKeyboardInput(e));
  };

  return (
    <div
      ref={innerDivRef}
      className={styles.wrapper}
      style={{ width: WIDTH }}
    >
      {
        useColorPicker && (
          <>
            <MoveWrapper
              className={styles.saturation}
              style={{ backgroundColor: `hsl(${selfColor.hsv.h}, 100%, 50%)` }}
              onChange={onMoveSaturation}
            >
              <div
                className={styles.saturationCursor}
                style={
                  {
                    backgroundColor: selfColor.hex,
                    left: saturationPosition.x,
                    top: saturationPosition.y,
                  }
                }
              />
            </MoveWrapper>
            <MoveWrapper
              className={styles.hue}
              onChange={onMoveHue}
            >
              <div
                className={styles.hueCursor}
                style={{ left: huePosition.x }}
              />
            </MoveWrapper>
            <div className={styles.hexRow}>
              <div
                className={styles.colorPreview}
                style={{ backgroundColor: selfColor.hex }}
              />
              <input
                className={styles.hexInput}
                spellCheck={false}
                value={inputColor}
                onChange={(e) => onSetHex(e.target.value)}
              />
            </div>
          </>
        )
      }
      <div className={styles.basicColor}>
        {
          basicColors.map((basicColor) => (
            <button
              key={basicColor}
              className={
                basicColor === selfColor.hex ?
                  "active" :
                  ""
              }
              style={{ backgroundColor: basicColor }}
              onClick={(e) => onBasicColorClick(e, basicColor)}
            />
          ))
        }
        {
          defaultColor && defaultColor !== color && (
            <button
              className={styles.resetButton}
              onClick={(e) => onBasicColorClick(e, defaultColor)}
            >
              <MdOutlineClear />
            </button>
          )
        }
      </div>
    </div>
  );
}

export interface Position {
  x: number,
  y: number,
}

interface MoveWrapperProps {
  className?: string,
  style?: React.CSSProperties,
  onChange: (position: Position) => void,
  children: ReactNode,
}

function MoveWrapper({
  className,
  style,
  onChange,
  children,
}: MoveWrapperProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);

  const move = (e: React.MouseEvent | MouseEvent): void => {
    if (divRef.current) {
      const { current: div } = divRef;
      const {
        width,
        height,
        left,
        top,
      } = div.getBoundingClientRect();
      const zoom = calculateZoomLevel(div);
      const x = clamp(
        e.clientX / zoom - left, width, 0,
      );
      const y = clamp(
        e.clientY / zoom - top, height, 0,
      );

      onChange({ x, y });
    }
  };

  const onMouseDown = (e: React.MouseEvent): void => {
    if (e.button !== 0) {
      return;
    }

    move(e);

    const onMouseMove = (_e: MouseEvent): void => {
      draggedRef.current = true;
      skipAddingToHistoryStack = true;
      move(_e);
    };

    const onMouseUp = (_e: MouseEvent): void => {
      if (draggedRef.current) {
        skipAddingToHistoryStack = false;
      }

      document.removeEventListener(
        "mousemove", onMouseMove, false,
      );
      document.removeEventListener(
        "mouseup", onMouseUp, false,
      );

      move(_e);
      draggedRef.current = false;
    };

    document.addEventListener(
      "mousemove", onMouseMove, false,
    );
    document.addEventListener(
      "mouseup", onMouseUp, false,
    );
  };

  return (
    <div
      ref={divRef}
      className={className}
      style={style}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}

function clamp(
  value: number, max: number, min: number,
) {
  if (value > max) return max;
  if (value < min) return min;
  return value;
}

interface RGB {
  b: number,
  g: number,
  r: number,
}
interface HSV {
  h: number,
  s: number,
  v: number,
}
interface Color {
  hex: string,
  hsv: HSV,
  rgb: RGB,
}

/**
 * Проверяет, что строка — валидный CSS-цвет (hex/rgb/rgba/hsl/hsla/named).
 * Используем CSS.supports (надёжно во всех браузерах ≥ 2020) с фолбэком
 * на canvas-трюк: невалидный цвет canvas игнорирует и оставляет предыдущий
 * fillStyle, что мы и детектируем.
 */
export function isValidCssColor(value: string): boolean {
  if (!value) return false;
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    return CSS.supports("color", value);
  }
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  // Ставим заведомо валидный «маркер», затем пробуем перезаписать.
  // Если fillStyle не изменился — введённое значение canvas отверг.
  ctx.fillStyle = "#010203";
  const before = ctx.fillStyle;
  ctx.fillStyle = value;
  return ctx.fillStyle !== before;
}

export function toHex(value: string): string {
  if (!value.startsWith("#")) {
    const ctx = document.createElement("canvas").getContext("2d");

    if (!ctx) {
      throw new Error("2d context not supported or canvas already initialized");
    }

    ctx.fillStyle = value;

    return ctx.fillStyle;
  } else if (value.length === 4 || value.length === 5) {
    value = value
      .split("")
      .map((v, i) => (i ?
        v + v :
        "#"))
      .join("");

    return value;
  } else if (value.length === 7 || value.length === 9) {
    return value;
  }

  return "#000000";
}

function hex2rgb(hex: string): RGB {
  const rbgArr = (
    hex
      .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (
          _m, r, g, b,
        ) => "#" + r + r + g + g + b + b)
      .substring(1)
      .match(/.{2}/g) || []
  ).map((x) => parseInt(x, 16));

  return {
    b: rbgArr[ 2 ],
    g: rbgArr[ 1 ],
    r: rbgArr[ 0 ],
  };
}

function rgb2hsv({
  r,
  g,
  b,
}: RGB): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(
    r, g, b,
  );
  const d = max - Math.min(
    r, g, b,
  );

  let h: number;
  if (!d) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / d + (g < b ?
      6 :
      0)) * 60;
  } else if (max === g) {
    h = (2 + (b - r) / d) * 60;
  } else {
    h = (4 + (r - g) / d) * 60;
  }
  const s = max ?
    (d / max) * 100 :
    0;
  const v = max * 100;

  return {
    h,
    s,
    v,
  };
}

function hsv2rgb({
  h,
  s,
  v,
}: HSV): RGB {
  s /= 100;
  v /= 100;

  const i = ~~(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  const index = i % 6;

  const r = Math.round([
    v,
    q,
    p,
    p,
    t,
    v,
  ][ index ] * 255);
  const g = Math.round([
    t,
    v,
    v,
    q,
    p,
    p,
  ][ index ] * 255);
  const b = Math.round([
    p,
    p,
    t,
    v,
    v,
    q,
  ][ index ] * 255);

  return {
    b,
    g,
    r,
  };
}

function rgb2hex({
  b,
  g,
  r,
}: RGB): string {
  return "#" + [
    r,
    g,
    b,
  ].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function transformColor<M extends keyof Color, C extends Color[ M ]>(format: M,
  color: C): Color {
  let hex: Color[ "hex" ] = toHex("#121212");
  let rgb: Color[ "rgb" ] = hex2rgb(hex);
  let hsv: Color[ "hsv" ] = rgb2hsv(rgb);

  if (format === "hex") {
    const value = color as Color[ "hex" ];

    hex = toHex(value);
    rgb = hex2rgb(hex);
    hsv = rgb2hsv(rgb);
  } else if (format === "rgb") {
    const value = color as Color[ "rgb" ];

    rgb = value;
    hex = rgb2hex(rgb);
    hsv = rgb2hsv(rgb);
  } else if (format === "hsv") {
    const value = color as Color[ "hsv" ];

    hsv = value;
    rgb = hsv2rgb(hsv);
    hex = rgb2hex(rgb);
  }

  return {
    hex,
    hsv,
    rgb,
  };
}
