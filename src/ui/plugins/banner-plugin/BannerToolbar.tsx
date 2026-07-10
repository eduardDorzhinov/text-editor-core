import {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FiImage,
  FiLink,
  FiSettings,
} from "react-icons/fi";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  NodeKey,
} from "lexical";

import {
  BannerBgFit,
  BannerImagePosition,
} from "@/parser";
import { ColorPicker } from "@/ui/components/color-picker";
import { useScopedPortal } from "@/vendor/shared";

import {
  $isBannerNode,
  BannerConfig,
  BannerNode,
  DEFAULT_BANNER_HEIGHT,
  DEFAULT_BANNER_IMAGE_WIDTH,
} from "./BannerNode";

import "./BannerToolbar.scss";

interface ActiveState {
  key: NodeKey,
  position: CSSProperties,
  config: BannerConfig,
}

const BG_FITS: { value: BannerBgFit, label: string }[] = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "repeat", label: "Плитка" },
];

export function BannerToolbar(): null | ReturnType<ReturnType<typeof useScopedPortal>> {
  const [ editor ] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const scopedPortal = useScopedPortal();

  const [ active, setActive ] = useState<ActiveState | null>(null);
  const [ open, setOpen ] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Текстовые/числовые инпуты пишем в ноду не на каждый символ (иначе
  // editor.update вернул бы фокус в редактор), а «сбросом» (flush) по blur и
  // при закрытии. Значения держим в state (рендер) и в ref (для flush после
  // размонтирования инпутов).
  const [ imageInput, setImageInput ] = useState("");
  const [ imageWidthInput, setImageWidthInput ] = useState("");
  const [ bgImageInput, setBgImageInput ] = useState("");
  const [ bgTileInput, setBgTileInput ] = useState("");
  const [ bgSpacingInput, setBgSpacingInput ] = useState("");
  const [ hrefInput, setHrefInput ] = useState("");
  const [ heightInput, setHeightInput ] = useState("");
  const imageRef = useRef("");
  const imageWidthRef = useRef("");
  const bgImageRef = useRef("");
  const bgTileRef = useRef("");
  const bgSpacingRef = useRef("");
  const hrefRef = useRef("");
  const heightRef = useRef("");
  const activeKeyRef = useRef<NodeKey | null>(null);

  const recompute = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        setActive(null);
        return;
      }
      const banner = $findMatchingParent(selection.anchor.getNode(), $isBannerNode);
      if (!$isBannerNode(banner)) {
        setActive(null);
        return;
      }
      const el = editor.getElementByKey(banner.getKey());
      if (!el) {
        setActive(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setActive({
        key: banner.getKey(),
        position: {
          position: "absolute",
          top: rect.top + window.scrollY + 8,
          left: rect.right + window.scrollX - 36,
          zIndex: 30,
        },
        config: { ...banner.getConfig() },
      });
    });
  }, [ editor ]);

  useEffect(() => {
    if (!isEditable) {
      setActive(null);
      return;
    }
    return mergeRegister(editor.registerUpdateListener(recompute),
      ((): (() => void) => {
        const handler = () => recompute();
        window.addEventListener("resize", handler);
        window.addEventListener(
          "scroll", handler, true,
        );
        return () => {
          window.removeEventListener("resize", handler);
          window.removeEventListener(
            "scroll", handler, true,
          );
        };
      })());
  }, [
    editor,
    isEditable,
    recompute,
  ]);

  // Инициализируем локальные инпуты при смене баннера (по ключу).
  const activeKey = active?.key ?? null;
  useEffect(() => {
    activeKeyRef.current = activeKey;
    if (!active) return;
    const c = active.config;
    setImageInput(c.imageSrc);
    setImageWidthInput(String(c.imageWidth));
    setBgImageInput(c.bgImageSrc);
    setBgTileInput(c.bgImageTileSize ?
      String(c.bgImageTileSize) :
      "");
    setBgSpacingInput(c.bgImageSpacing ?
      String(c.bgImageSpacing) :
      "");
    setHrefInput(c.href);
    setHeightInput(String(c.height));
    imageRef.current = c.imageSrc;
    imageWidthRef.current = String(c.imageWidth);
    bgImageRef.current = c.bgImageSrc;
    bgTileRef.current = c.bgImageTileSize ?
      String(c.bgImageTileSize) :
      "";
    bgSpacingRef.current = c.bgImageSpacing ?
      String(c.bgImageSpacing) :
      "";
    hrefRef.current = c.href;
    heightRef.current = String(c.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ activeKey ]);

  const clampInt = (
    raw: string, fallback: number, min: number,
  ): number => {
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ?
      fallback :
      Math.max(min, n);
  };

  // Пишем накопленные значения инпутов в ноду.
  const flush = useCallback(() => {
    const key = activeKeyRef.current;
    if (!key) return;
    const width = clampInt(
      imageWidthRef.current, DEFAULT_BANNER_IMAGE_WIDTH, 20,
    );
    const height = clampInt(
      heightRef.current, DEFAULT_BANNER_HEIGHT, 40,
    );
    // Пустой размер плитки → 0 (дефолт). Пустой промежуток → 0.
    const rawTile = parseInt(bgTileRef.current, 10);
    const tileSize = Number.isNaN(rawTile) ?
      0 :
      Math.max(4, rawTile);
    const rawSpacing = parseInt(bgSpacingRef.current, 10);
    const spacing = Number.isNaN(rawSpacing) ?
      0 :
      Math.max(0, rawSpacing);
    editor.update(() => {
      const node = $getNodeByKey(key);
      if (!$isBannerNode(node)) return;
      node.setImageSrc(imageRef.current.trim());
      node.setImageWidth(width);
      node.setBgImageSrc(bgImageRef.current.trim());
      node.setBgImageTileSize(tileSize);
      node.setBgImageSpacing(spacing);
      node.setHref(hrefRef.current.trim());
      node.setHeight(height);
    });
  }, [ editor ]);

  const closePopover = useCallback(() => {
    flush();
    setOpen(false);
  }, [ flush ]);

  useEffect(() => {
    if (!active) setOpen(false);
  }, [ active ]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePopover();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };
    document.addEventListener(
      "pointerdown", onPointer, true,
    );
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener(
        "pointerdown", onPointer, true,
      );
      window.removeEventListener("keydown", onKey);
    };
  }, [ open, closePopover ]);

  // Дискретные настройки (позиция, режим фона, чекбоксы, цвет) пишем сразу.
  const patch = useCallback((cb: (node: BannerNode) => void, patchCfg: Partial<BannerConfig>) => {
    if (!activeKey) return;
    setActive((prev) => prev ?
      { ...prev, config: { ...prev.config, ...patchCfg }} :
      prev);
    editor.update(() => {
      const node = $getNodeByKey(activeKey);
      if ($isBannerNode(node)) cb(node);
    });
  }, [ editor, activeKey ]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      flush();
      e.currentTarget.blur();
    }
  };

  if (!isEditable || !active) return null;

  const { config } = active;

  return scopedPortal(<div
    ref={panelRef}
    className="banner-toolbar"
    style={active.position}
  >
    <button
      aria-label="Настройки баннера"
      className={
        `banner-toolbar__btn${open ?
          " banner-toolbar__btn--active" :
          ""}`
      }
      type="button"
      onClick={
        () => (open ?
          closePopover() :
          setOpen(true))
      }
      onMouseDown={(e) => e.preventDefault()}
    >
      <FiSettings />
    </button>

    {
      open && (
        <div className="banner-toolbar__popover">
          {/* Боковая картинка */}
          <div className="banner-toolbar__field">
            <label className="banner-toolbar__label">
              <FiImage />
              <span>Картинка слева/справа (URL)</span>
            </label>
            <input
              className="banner-toolbar__input"
              placeholder="https://…"
              type="text"
              value={imageInput}
              onBlur={flush}
              onChange={
                (e) => {
                  imageRef.current = e.target.value;
                  setImageInput(e.target.value);
                }
              }
              onKeyDown={onInputKeyDown}
            />
          </div>

          {
            config.imageSrc && (
              <>
                <div className="banner-toolbar__field">
                  <span className="banner-toolbar__label">Позиция</span>
                  <div className="banner-toolbar__seg">
                    {
                      ([ "left", "right" ] as BannerImagePosition[]).map((pos) => (
                        <button
                          key={pos}
                          className={
                            `banner-toolbar__seg-btn${config.imagePosition === pos ?
                              " banner-toolbar__seg-btn--active" :
                              ""}`
                          }
                          type="button"
                          onClick={() => patch((n) => n.setImagePosition(pos), { imagePosition: pos })}
                        >
                          {
                            pos === "left" ?
                              "Слева" :
                              "Справа"
                          }
                        </button>
                      ))
                    }
                  </div>
                </div>

                <div className="banner-toolbar__field">
                  <label className="banner-toolbar__label">
                    <span>Ширина картинки, px</span>
                  </label>
                  <input
                    className="banner-toolbar__input"
                    min={20}
                    type="number"
                    value={imageWidthInput}
                    onBlur={flush}
                    onChange={
                      (e) => {
                        imageWidthRef.current = e.target.value;
                        setImageWidthInput(e.target.value);
                      }
                    }
                    onKeyDown={onInputKeyDown}
                  />
                </div>

                <div className="banner-toolbar__field">
                  <label className="banner-toolbar__checkbox">
                    <input
                      checked={config.reserveImageSpace}
                      type="checkbox"
                      onChange={
                        (e) =>
                          patch((n) => n.setReserveImageSpace(e.target.checked),
                            { reserveImageSpace: e.target.checked })
                      }
                    />
                    <span>Текст учитывает картинку</span>
                  </label>
                </div>
              </>
            )
          }

          <div className="banner-toolbar__divider" />

          {/* Высота */}
          <div className="banner-toolbar__field">
            <label className="banner-toolbar__label">
              <span>Высота баннера, px</span>
            </label>
            <input
              className="banner-toolbar__input"
              min={40}
              type="number"
              value={heightInput}
              onBlur={flush}
              onChange={
                (e) => {
                  heightRef.current = e.target.value;
                  setHeightInput(e.target.value);
                }
              }
              onKeyDown={onInputKeyDown}
            />
          </div>

          {/* Фон */}
          <div className="banner-toolbar__field">
            <span className="banner-toolbar__label">Цвет фона</span>
            <ColorPicker
              useColorPicker
              color={config.backgroundColor || "#ffffff"}
              onChange={(value) => patch((n) => n.setBackgroundColor(value), { backgroundColor: value })}
            />
          </div>

          <div className="banner-toolbar__field">
            <label className="banner-toolbar__label">
              <FiImage />
              <span>Фоновое изображение (URL)</span>
            </label>
            <input
              className="banner-toolbar__input"
              placeholder="https://…"
              type="text"
              value={bgImageInput}
              onBlur={flush}
              onChange={
                (e) => {
                  bgImageRef.current = e.target.value;
                  setBgImageInput(e.target.value);
                }
              }
              onKeyDown={onInputKeyDown}
            />
          </div>

          {
            config.bgImageSrc && (
              <div className="banner-toolbar__field">
                <span className="banner-toolbar__label">Заполнение фона</span>
                <div className="banner-toolbar__seg">
                  {
                    BG_FITS.map(({ value, label }) => (
                      <button
                        key={value}
                        className={
                          `banner-toolbar__seg-btn${config.bgImageFit === value ?
                            " banner-toolbar__seg-btn--active" :
                            ""}`
                        }
                        type="button"
                        onClick={() => patch((n) => n.setBgImageFit(value), { bgImageFit: value })}
                      >
                        {label}
                      </button>
                    ))
                  }
                </div>
              </div>
            )
          }

          {
            config.bgImageSrc && config.bgImageFit === "repeat" && (
              <>
                <div className="banner-toolbar__field">
                  <label className="banner-toolbar__label">
                    <span>Размер плитки, px (пусто — дефолт)</span>
                  </label>
                  <input
                    className="banner-toolbar__input"
                    min={4}
                    placeholder="авто"
                    type="number"
                    value={bgTileInput}
                    onBlur={flush}
                    onChange={
                      (e) => {
                        bgTileRef.current = e.target.value;
                        setBgTileInput(e.target.value);
                      }
                    }
                    onKeyDown={onInputKeyDown}
                  />
                </div>

                <div className="banner-toolbar__field">
                  <label className="banner-toolbar__label">
                    <span>Промежуток (частота), px</span>
                  </label>
                  <input
                    className="banner-toolbar__input"
                    min={0}
                    placeholder="0"
                    type="number"
                    value={bgSpacingInput}
                    onBlur={flush}
                    onChange={
                      (e) => {
                        bgSpacingRef.current = e.target.value;
                        setBgSpacingInput(e.target.value);
                      }
                    }
                    onKeyDown={onInputKeyDown}
                  />
                </div>

                <div className="banner-toolbar__field">
                  <span className="banner-toolbar__label">
                    {`Поворот: ${config.bgImageRotation}°`}
                  </span>
                  <input
                    max={360}
                    min={0}
                    step={1}
                    type="range"
                    value={config.bgImageRotation}
                    onChange={
                      (e) =>
                        patch((n) => n.setBgImageRotation(Number(e.target.value)),
                          { bgImageRotation: Number(e.target.value) })
                    }
                  />
                </div>
              </>
            )
          }

          <div className="banner-toolbar__divider" />

          {/* Ссылка */}
          <div className="banner-toolbar__field">
            <label className="banner-toolbar__checkbox">
              <input
                checked={config.isLink}
                type="checkbox"
                onChange={(e) => patch((n) => n.setIsLink(e.target.checked), { isLink: e.target.checked })}
              />
              <FiLink />
              <span>Весь баннер — ссылка</span>
            </label>
            {
              config.isLink && (
                <input
                  className="banner-toolbar__input"
                  placeholder="https://…"
                  type="text"
                  value={hrefInput}
                  onBlur={flush}
                  onChange={
                    (e) => {
                      hrefRef.current = e.target.value;
                      setHrefInput(e.target.value);
                    }
                  }
                  onKeyDown={onInputKeyDown}
                />
              )
            }
          </div>
        </div>
      )
    }
  </div>,
  document.body);
}
