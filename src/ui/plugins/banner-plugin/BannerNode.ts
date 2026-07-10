import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type ElementDOMSlot,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  type Spread,
  $applyNodeReplacement,
  ElementNode,
} from "lexical";

import { getPathWithUpload } from "@/lib/utils/upload-file";
import {
  type BannerBgFit,
  type BannerImagePosition,
  type BannerVisual,
  bannerContentStyle,
  bannerImageStyle,
  bannerTileSvg,
  bannerWrapperStyle,
} from "@/parser";

export const DEFAULT_BANNER_BACKGROUND = "#eef2ff";
export const DEFAULT_BANNER_HEIGHT = 250;
export const DEFAULT_BANNER_IMAGE_WIDTH = 160;

export interface BannerConfig {
  backgroundColor: string,
  bgImageSrc: string,
  bgImageFit: BannerBgFit,
  /** Размер плитки в px (для fit "repeat"). 0 — дефолт (100). */
  bgImageTileSize: number,
  /** Промежуток между плитками в px (частота): больше — реже. */
  bgImageSpacing: number,
  /** Поворот плитки в градусах (для fit "repeat"). */
  bgImageRotation: number,
  imageSrc: string,
  imagePosition: BannerImagePosition,
  imageWidth: number,
  reserveImageSpace: boolean,
  isLink: boolean,
  href: string,
  height: number,
}

export type SerializedBannerNode = Spread<Partial<BannerConfig> & {
  /** Legacy-поле: старый баннер (DecoratorNode) хранил plain-text строку. */
  text?: string,
}, SerializedElementNode>;

function defaultConfig(): BannerConfig {
  return {
    backgroundColor: DEFAULT_BANNER_BACKGROUND,
    bgImageSrc: "",
    bgImageFit: "cover",
    bgImageTileSize: 0,
    bgImageSpacing: 0,
    bgImageRotation: 0,
    imageSrc: "",
    imagePosition: "left",
    imageWidth: DEFAULT_BANNER_IMAGE_WIDTH,
    reserveImageSpace: true,
    isLink: false,
    href: "",
    height: DEFAULT_BANNER_HEIGHT,
  };
}

function makeBannerImage(src: string, visual: BannerVisual): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "tc-banner__image";
  img.src = src;
  img.setAttribute("alt", "");
  img.setAttribute("contenteditable", "false");
  Object.assign(img.style, bannerImageStyle(visual));
  return img;
}

/**
 * Баннер — контейнерная нода (ElementNode) по образцу цитаты. Внутри —
 * редактируемый rich-text (абзацы, заголовки, списки). Вставка других
 * блочных нод запрещена (см. BannerPlugin + блокировка тулбара).
 *
 * Конфиг хранится полями ноды и правится во всплывающем тулбаре
 * (BannerToolbar):
 *  - боковая картинка (imageSrc): слева/справа, во всю высоту, ширина настр.;
 *  - reserveImageSpace: учитывать ли картинку в выравнивании текста;
 *  - фон: цвет-заливка + опциональное фоновое изображение (bgImageSrc) с
 *    режимом cover/contain/повторение (bgImageFit);
 *  - height, isLink/href.
 *
 * Картинка — настоящий абсолютный <img>; редактируемые дети складываются в
 * отдельный слот .tc-banner__content через переопределённый getDOMSlot.
 */
export class BannerNode extends ElementNode {
  __config: BannerConfig;

  constructor(config: Partial<BannerConfig> = {}, key?: NodeKey) {
    super(key);
    this.__config = { ...defaultConfig(), ...config };
  }

  static getType(): string {
    return "banner";
  }

  static clone(node: BannerNode): BannerNode {
    return new BannerNode({ ...node.__config }, node.__key);
  }

  isShadowRoot(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return false;
  }

  private $visual(): BannerVisual {
    const c = this.__config;
    return {
      backgroundColor: c.backgroundColor,
      bgImageSrc: c.bgImageSrc,
      bgImageFit: c.bgImageFit,
      bgImageTileSize: c.bgImageTileSize,
      bgImageSpacing: c.bgImageSpacing,
      bgImageRotation: c.bgImageRotation,
      imageSrc: c.imageSrc,
      imagePosition: c.imagePosition,
      imageWidth: c.imageWidth,
      reserveImageSpace: c.reserveImageSpace,
      height: c.height,
    };
  }

  // ── DOM (редактор) ─────────────────────────────────────────────────────
  private $patternId(): string {
    return `banner-pat-${this.__key}`;
  }

  // Слой SVG-плитки (fit "repeat"): создаёт/обновляет/удаляет .tc-banner__bg.
  private $syncBgLayer(dom: HTMLElement): void {
    const svg = bannerTileSvg(this.$visual(), this.$patternId());
    let layer = dom.querySelector<HTMLElement>(":scope > .tc-banner__bg");
    if (svg) {
      if (!layer) {
        layer = document.createElement("div");
        layer.className = "tc-banner__bg";
        layer.setAttribute("contenteditable", "false");
        dom.insertBefore(layer, dom.firstChild);
      }
      if (layer.innerHTML !== svg) layer.innerHTML = svg;
    } else if (layer) {
      layer.remove();
    }
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const visual = this.$visual();
    const wrapper = document.createElement("div");
    wrapper.className = "tc-banner";
    Object.assign(wrapper.style, bannerWrapperStyle(visual));

    const content = document.createElement("div");
    content.className = "tc-banner__content";
    content.setAttribute("data-banner-content", "true");
    Object.assign(content.style, bannerContentStyle(visual));

    this.$syncBgLayer(wrapper);
    if (this.__config.imageSrc) {
      wrapper.appendChild(makeBannerImage(this.__config.imageSrc, visual));
    }
    wrapper.appendChild(content);
    return wrapper;
  }

  updateDOM(_prevNode: this, dom: HTMLElement): boolean {
    const visual = this.$visual();
    Object.assign(dom.style, bannerWrapperStyle(visual));

    this.$syncBgLayer(dom);

    const content = dom.querySelector<HTMLElement>(":scope > .tc-banner__content");
    if (content) Object.assign(content.style, bannerContentStyle(visual));

    const existing = dom.querySelector<HTMLImageElement>(":scope > .tc-banner__image");
    if (this.__config.imageSrc) {
      if (existing) {
        if (existing.getAttribute("src") !== this.__config.imageSrc) {
          existing.src = this.__config.imageSrc;
        }
        Object.assign(existing.style, bannerImageStyle(visual));
      } else {
        dom.insertBefore(makeBannerImage(this.__config.imageSrc, visual), dom.firstChild);
      }
    } else if (existing) {
      existing.remove();
    }
    return false;
  }

  // Редактируемые дети складываются в .tc-banner__content, а не рядом с <img>.
  getDOMSlot(element: HTMLElement): ElementDOMSlot {
    const content = element.querySelector<HTMLElement>(":scope > [data-banner-content]");
    return super.getDOMSlot(content ?? element);
  }

  // ── HTML round-trip (буфер обмена) ─────────────────────────────────────
  exportDOM(): DOMExportOutput {
    const c = this.__config;
    const element = document.createElement("div");
    element.className = "tc-banner";
    element.setAttribute("data-background-color", c.backgroundColor);
    element.setAttribute("data-bg-image-src", c.bgImageSrc);
    element.setAttribute("data-bg-image-fit", c.bgImageFit);
    element.setAttribute("data-bg-image-tile-size", String(c.bgImageTileSize));
    element.setAttribute("data-bg-image-spacing", String(c.bgImageSpacing));
    element.setAttribute("data-bg-image-rotation", String(c.bgImageRotation));
    element.setAttribute("data-image-src", c.imageSrc);
    element.setAttribute("data-image-position", c.imagePosition);
    element.setAttribute("data-image-width", String(c.imageWidth));
    element.setAttribute("data-reserve-image-space", String(c.reserveImageSpace));
    element.setAttribute("data-is-link", String(c.isLink));
    element.setAttribute("data-href", c.href);
    element.setAttribute("data-height", String(c.height));
    Object.assign(element.style, bannerWrapperStyle(this.$visual()));
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.classList.contains("tc-banner")) return null;
        return {
          conversion: (el: HTMLElement): DOMConversionOutput => {
            const fit = el.getAttribute("data-bg-image-fit");
            const pos = el.getAttribute("data-image-position");
            return {
              node: $createBannerNode({
                backgroundColor:
                  el.getAttribute("data-background-color") || DEFAULT_BANNER_BACKGROUND,
                bgImageSrc: el.getAttribute("data-bg-image-src") || "",
                bgImageFit: fit === "contain" || fit === "repeat" ?
                  fit :
                  "cover",
                bgImageTileSize: Number(el.getAttribute("data-bg-image-tile-size")) || 0,
                bgImageSpacing: Number(el.getAttribute("data-bg-image-spacing")) || 0,
                bgImageRotation: Number(el.getAttribute("data-bg-image-rotation")) || 0,
                imageSrc: el.getAttribute("data-image-src") || "",
                imagePosition: pos === "right" ?
                  "right" :
                  "left",
                imageWidth:
                  Number(el.getAttribute("data-image-width")) || DEFAULT_BANNER_IMAGE_WIDTH,
                reserveImageSpace: el.getAttribute("data-reserve-image-space") !== "false",
                isLink: el.getAttribute("data-is-link") === "true",
                href: el.getAttribute("data-href") || "",
                height: Number(el.getAttribute("data-height")) || DEFAULT_BANNER_HEIGHT,
              }),
            };
          },
          priority: 2,
        };
      },
    };
  }

  // ── JSON ───────────────────────────────────────────────────────────────
  static importJSON(json: SerializedBannerNode): BannerNode {
    const node = $createBannerNode({
      backgroundColor: json.backgroundColor ?? DEFAULT_BANNER_BACKGROUND,
      bgImageSrc: json.bgImageSrc ?
        getPathWithUpload(json.bgImageSrc) :
        "",
      bgImageFit: json.bgImageFit ?? "cover",
      bgImageTileSize: json.bgImageTileSize ?? 0,
      bgImageSpacing: json.bgImageSpacing ?? 0,
      bgImageRotation: json.bgImageRotation ?? 0,
      imageSrc: json.imageSrc ?
        getPathWithUpload(json.imageSrc) :
        "",
      imagePosition: json.imagePosition ?? "left",
      imageWidth: json.imageWidth ?? DEFAULT_BANNER_IMAGE_WIDTH,
      reserveImageSpace: json.reserveImageSpace ?? true,
      isLink: json.isLink ?? false,
      href: json.href ?? "",
      height: json.height ?? DEFAULT_BANNER_HEIGHT,
    });
    return node.updateFromJSON(json);
  }

  exportJSON(): SerializedBannerNode {
    return {
      ...super.exportJSON(),
      type: "banner",
      version: 1,
      ...this.__config,
    };
  }

  // ── getters / setters ──────────────────────────────────────────────────
  getConfig(): BannerConfig {
    return this.getLatest().__config;
  }

  private set<K extends keyof BannerConfig>(key: K, value: BannerConfig[ K ]): void {
    const writable = this.getWritable();
    writable.__config = { ...writable.__config, [ key ]: value };
  }

  setBackgroundColor(value: string): void {
    this.set("backgroundColor", value);
  }

  setBgImageSrc(value: string): void {
    this.set("bgImageSrc", value);
  }

  setBgImageFit(value: BannerBgFit): void {
    this.set("bgImageFit", value);
  }

  setBgImageTileSize(value: number): void {
    this.set("bgImageTileSize", value);
  }

  setBgImageSpacing(value: number): void {
    this.set("bgImageSpacing", value);
  }

  setBgImageRotation(value: number): void {
    this.set("bgImageRotation", value);
  }

  setImageSrc(value: string): void {
    this.set("imageSrc", value);
  }

  setImagePosition(value: BannerImagePosition): void {
    this.set("imagePosition", value);
  }

  setImageWidth(value: number): void {
    this.set("imageWidth", value);
  }

  setReserveImageSpace(value: boolean): void {
    this.set("reserveImageSpace", value);
  }

  setIsLink(value: boolean): void {
    this.set("isLink", value);
  }

  setHref(value: string): void {
    this.set("href", value);
  }

  setHeight(value: number): void {
    this.set("height", value);
  }
}

export function $createBannerNode(config: Partial<BannerConfig> = {}): BannerNode {
  return $applyNodeReplacement(new BannerNode(config));
}

export function $isBannerNode(node: LexicalNode | null | undefined): node is BannerNode {
  return node instanceof BannerNode;
}
