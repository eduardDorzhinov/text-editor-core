/**
 * VITE GLOBAL CONSTANTS
 * Эти переменные подставляются Vite на этапе сборки через define()
 *
 * Они доступны только в окружениях, где работает Vite (packages, webcom)
 * В Node / Vitest / ts-node / Next.js без Vite они будут undefined,
 * поэтому в shared-коде используйте безопасные fallback
 */
import { getConst } from "./get-vite-const";
import { normalizeUrl } from "./normalize-url";

declare const __MODE__: string | undefined;
declare const __API_URL__: string | undefined;
declare const __IS_WEBCOM__: boolean | undefined;
declare const __WEBCOM_STORAGE_URL__: string | undefined;
declare const __WEBCOM_BUILD_PATH__: string | undefined;
declare const __BASE_URL__: string | undefined;
declare const __ORIGIN_ID__: string | undefined;
declare const __WEBCOM_SCOPE_CLASS__: string | undefined;
declare const __WEBCOM_SENTRY_DSN__: string;

const VITE_MODE = (() => {
  try {
    return __MODE__;
  } catch {
    return undefined;
  }
})();
const NEXT_MODE = (() => {
  try {
    // @ts-ignore
    return process.env.MODE;
  } catch {
    return undefined;
  }
})();
const VITE_API_URL = (() => {
  try {
    return __API_URL__;
  } catch {
    return undefined;
  }
})();
const NEXT_API_URL = (() => {
  try {
    // @ts-ignore
    return process.env.API_URL;
  } catch {
    return undefined;
  }
})();
const VITE_IS_WEBCOM = (() => {
  try {
    return __IS_WEBCOM__;
  } catch {
    return undefined;
  }
})();
const NEXT_IS_WEBCOM = (() => {
  try {
    // @ts-ignore
    return process.env.IS_WEBCOM;
  } catch {
    return undefined;
  }
})();
const VITE_WEBCOM_STORAGE_URL = (() => {
  try {
    return __WEBCOM_STORAGE_URL__;
  } catch {
    return undefined;
  }
})();
const NEXT_WEBCOM_STORAGE_URL = (() => {
  try {
    // @ts-ignore
    return process.env.WEBCOM_STORAGE_URL;
  } catch {
    return undefined;
  }
})();
const VITE_WEBCOM_BUILD_PATH = (() => {
  try {
    return __WEBCOM_BUILD_PATH__;
  } catch {
    return undefined;
  }
})();
const NEXT_WEBCOM_BUILD_PATH = (() => {
  try {
    // @ts-ignore
    return process.env.WEBCOM_BUILD_PATH;
  } catch {
    return undefined;
  }
})();
const VITE_BASE_URL = (() => {
  try {
    return __BASE_URL__;
  } catch {
    return undefined;
  }
})();
const NEXT_BASE_URL = (() => {
  try {
    // @ts-ignore
    return process.env.BASE_URL;
  } catch {
    return undefined;
  }
})();
const VITE_ORIGIN_ID = (() => {
  try {
    return __ORIGIN_ID__;
  } catch {
    return undefined;
  }
})();
const NEXT_ORIGIN_ID = (() => {
  try {
    // @ts-ignore
    return process.env.ORIGIN_ID;
  } catch {
    return undefined;
  }
})();
const VITE_WEBCOM_SCOPE_CLASS = (() => {
  try {
    return __WEBCOM_SCOPE_CLASS__;
  } catch {
    return undefined;
  }
})();
const NEXT_WEBCOM_SCOPE_CLASS = (() => {
  try {
    // @ts-ignore
    return process.env.WEBCOM_SCOPE_CLASS;
  } catch {
    return undefined;
  }
})();

const VITE_WEBCOM_SENTRY_DSNS = (() => {
  try {
    return __WEBCOM_SENTRY_DSN__;
  } catch {
    return undefined;
  }
})();

const NEXT_WEBCOM_SENTRY_DSN = (() => {
  try {
    // @ts-ignore
    return process.env.WEBCOM_SENTRY_DSN;
  } catch {
    return undefined;
  }
})();

export const IS_DEV_MODE = getConst(
  VITE_MODE,
  NEXT_MODE,
  "",
) === "development";
export const BASE_URL = getConst(
  VITE_BASE_URL,
  NEXT_BASE_URL,
  "",
);
export const IS_WEBCOM = getConst(
  VITE_IS_WEBCOM,
  NEXT_IS_WEBCOM,
  false,
);
export const API_URL = IS_DEV_MODE ?
  `${BASE_URL}/api` :
  getConst(
    VITE_API_URL,
    NEXT_API_URL,
    "",
  );

export const WEBCOM_STORAGE_URL = getConst(
  VITE_WEBCOM_STORAGE_URL,
  NEXT_WEBCOM_STORAGE_URL,
  "",
);
export const WEBCOM_BUILD_PATH = getConst(
  VITE_WEBCOM_BUILD_PATH,
  NEXT_WEBCOM_BUILD_PATH,
  "",
);
export const ORIGIN_ID = getConst(
  VITE_ORIGIN_ID,
  NEXT_ORIGIN_ID,
  "",
);
export const FULL_WEBCOM_URL = normalizeUrl(WEBCOM_STORAGE_URL as string, WEBCOM_BUILD_PATH as string);

export const WEBCOM_ASSETS_BASE = normalizeUrl(FULL_WEBCOM_URL, "assets");

export const SCOPE_WEBCOM_CLASS = IS_WEBCOM ?
  getConst(
    VITE_WEBCOM_SCOPE_CLASS,
    NEXT_WEBCOM_SCOPE_CLASS,
    "webcom-scope",
  ) :
  null;

export const WEBCOM_SENTRY_DSN = getConst(
  VITE_WEBCOM_SENTRY_DSNS,
  NEXT_WEBCOM_SENTRY_DSN, "",
);

if (typeof window !== "undefined") {
  // @ts-ignore
  window.VITE_CONSTANTS = {
    IS_DEV_MODE,
    BASE_URL,
    IS_WEBCOM,
    API_URL,
    WEBCOM_STORAGE_URL,
    WEBCOM_BUILD_PATH,
    ORIGIN_ID,
    FULL_WEBCOM_URL,
    WEBCOM_ASSETS_BASE,
    SCOPE_WEBCOM_CLASS,
  };
}
