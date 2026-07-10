import { getErrorHandler, safeStringify } from "../error-logger/api-error-handler";
import {
  API_URL,
  camelize,
  IS_WEBCOM,
  normalizeUrl,
} from "../shared";
import { API_URLS } from "./constants";

declare global {
  interface Window {
    WebComponentProxyApi?: string,
  }
}

export const getApiUrl = () => {
  if (typeof window !== "undefined" && window.WebComponentProxyApi && IS_WEBCOM) {
    return window.WebComponentProxyApi;
  }
  return API_URL;
};

export const getUploadUrl = (path?: string) => {
  if (!path) return "";
  return normalizeUrl(getApiUrl() + "/upload", path);
};

export type FetchOptions = {
  url: string,
  params?: Record<string, string | number | string[] | number[] | boolean>,
  stopAtKeys?: string[],
  responseType?: "json" | "html",
} & RequestInit;

export const fetcher = async <T>(options: FetchOptions): Promise<T> => {
  const {
    url,
    params,
    stopAtKeys = [],
    responseType = "json",
    ...requestInit
  } = options;

  const apiUrl = getApiUrl();

  const queryString = params ?
    "?" +
    Object.entries(params)
      .flatMap(([ key, value ]) =>
        Array.isArray(value) ?
          value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`) :
          [ `${encodeURIComponent(key)}=${encodeURIComponent(value)}` ])
      .join("&") :
    "";

  const fullUrl = `${apiUrl}${url}${queryString}`;
  let responseData: unknown;
  let responseStatus: number | undefined;

  try {
    const response = await fetch(fullUrl, {
      ...requestInit,
      credentials: "include",
    });

    responseStatus = response.status;

    if (responseType === "json") {
      responseData = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return camelize(responseData, { stopAtKeys }) as T;
    }

    responseData = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return responseData as T;

  } catch (error) {
    getErrorHandler()?.(error, {
      endpoint: url,
      method: (requestInit.method as string) ?? "GET",
      tags: {
        hostApp: typeof window !== "undefined" ?
          window.location.origin :
          "server",
      },
      request: {
        url: fullUrl,
        method: requestInit.method ?? "GET",
        body: safeStringify(requestInit.body),
      },
      response: {
        status: responseStatus,
        data: responseData,
      },
    });

    throw error;
  }
};

interface UploadGuiResponse {
  metrics: object,
  status: {
    description: string,
    status: number,
  },
}

export const uploadFileToStorage = async ({
  file,
  objUid,
  field,
  tpl,
}: {
  file: File,
  objUid: string,
  field: string,
  tpl: string,
}) => {
  const formData = new FormData();
  formData.append("uploadfile", file);

  const res = await fetcher<UploadGuiResponse>({
    url: API_URLS.UPLOAD_FILE,
    params: {
      objuid: objUid,
      field: field,
      tpl: tpl,
    },
    method: "POST",
    body: formData,
  });

  if (res.status.status !== 200 || !res.status.description) {
    throw Error("Upload file error");
  }

  return res.status.description;
};
