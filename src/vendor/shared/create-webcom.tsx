"use client";

import {
  ComponentProps,
  ComponentType,
} from "react";
import ReactDOM from "react-dom/client";

import {
  initWebcomErrorTracking,
  initWebcomSentry,
  WebcomErrorBoundary,
} from "../error-logger";
import {
  SCOPE_WEBCOM_CLASS,
  WEBCOM_SENTRY_DSN,
} from "./global-constants";

type AttributeType = "string" | "boolean" | "number" | "json" | "array";

type AttributeConfig<P, K extends keyof P = keyof P> = {
  name: string,
  prop?: K,
  type: AttributeType,
  default?: P[ K ],
};

type WebcomConfig<C extends ComponentType<any>, P = ComponentProps<C>> = {
  name: string,
  Component: C,
  attributes?: AttributeConfig<P>[],
  scopeId?: string,
  getExtraProps?: (element: HTMLElement) => Partial<P>,
};

const parseAttribute = (element: HTMLElement, attr: AttributeConfig<any>): unknown => {
  const raw = element.getAttribute(attr.name.toLowerCase());

  if (raw === null) return attr.default;

  switch (attr.type) {
    case "boolean":
      return raw === "true";
    case "number": {
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ?
        attr.default :
        parsed;
    }
    case "json":
      try {
        return JSON.parse(raw);
      } catch {
        return attr.default;
      }
    case "array":
      return raw ?
        raw.split(",") :
        attr.default ?? [];
    default:
      return raw;
  }
};

type CustomElementConstructor = new () => HTMLElement;

let sentryInitialized = false;

const initSentry = () => {
  if (sentryInitialized) return;

  if (WEBCOM_SENTRY_DSN) {
    initWebcomSentry(WEBCOM_SENTRY_DSN as string);
    initWebcomErrorTracking();
  }

  sentryInitialized = true;
};

export const createWebcom = <C extends ComponentType<any>>(
  config: WebcomConfig<C>,
): CustomElementConstructor => {
  const {
    name,
    Component,
    attributes = [],
    scopeId,
    getExtraProps,
  } = config;

  const OBSERVED = attributes.map((a) => a.name.toLowerCase());

  class WebcomElement extends HTMLElement {
    _root: ReturnType<typeof ReactDOM.createRoot> | null = null;
    _wrapper: HTMLDivElement | null = null;
    _portalObserver: MutationObserver | null = null;

    connectedCallback() {
      initSentry();

      this.style.display = "block";
      this.style.height = "100%";

      this._wrapper = document.createElement("div");
      this._wrapper.style.height = "100%";

      if (scopeId) {
        this._wrapper.id = scopeId;
      }

      if (SCOPE_WEBCOM_CLASS) {
        this._wrapper.classList.add(SCOPE_WEBCOM_CLASS as string);
        this._setupPortalObserver(SCOPE_WEBCOM_CLASS as string);
      }

      this.appendChild(this._wrapper);
      this._root = ReactDOM.createRoot(this._wrapper);
      this._render();
    }

    disconnectedCallback() {
      this._root?.unmount();
      this._root = null;
      this._wrapper?.remove();
      this._wrapper = null;
      this._portalObserver?.disconnect();
      this._portalObserver = null;
    }

    _setupPortalObserver(scopeClass: string) {
      const getTheme = () =>
        document.documentElement.getAttribute("data-theme") || "light";

      this._portalObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.classList.contains(scopeClass)) continue;

            node.classList.add(scopeClass);

            const theme = getTheme();
            node.classList.add(theme);
            node.setAttribute("data-theme", theme);
          }
        }
      });

      this._portalObserver.observe(document.body, { childList: true });
    }

    static get observedAttributes() {
      return OBSERVED;
    }

    attributeChangedCallback(
      _name: string,
      oldVal: string | null,
      newVal: string | null,
    ) {
      if (oldVal === newVal) return;
      if (this._root) this._render();
    }

    _render() {
      const props = attributes.reduce((acc, attr) => {
        const propName = (attr.prop ?? attr.name) as string;
        (acc as Record<string, unknown>)[ propName ] = parseAttribute(this, attr);
        return acc;
      }, {} as ComponentProps<C>);

      const extraProps = getExtraProps?.(this) ?? {};

      const allProps = {
        ...props,
        ...extraProps,
      } as ComponentProps<C>;

      this._root!.render(<WebcomErrorBoundary webcomName={name}>
        <Component {...allProps} />
      </WebcomErrorBoundary>);
    }
  }

  customElements.define(name, WebcomElement);

  return WebcomElement;
};
