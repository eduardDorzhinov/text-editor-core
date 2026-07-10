import { ComponentType, ReactNode } from "react";

import * as Sentry from "@sentry/browser";

import { setErrorHandler } from "./api-error-handler";

declare const __SENTRY_RELEASE__: string;

export type CaptureErrorOptions = {
  webcomName: string,
  hostApp: string,
  extra?: Record<string, unknown>,
};

export type SentryWebcomErrorBoundaryProps = {
  children: ReactNode,
  webcomName: string,
  fallback?: ReactNode,
};

export type SentryModule = {
  initWebcomSentry: typeof initWebcomSentry,
  initWebcomErrorTracking: typeof initWebcomErrorTracking,
  captureWebcomError: typeof captureWebcomError,
  WebcomErrorBoundary: ComponentType<SentryWebcomErrorBoundaryProps>,
};

export const initWebcomSentry = (dsn: string) => {
  Sentry.init({
    dsn,
    environment: "production",
    release: typeof __SENTRY_RELEASE__ !== "undefined" ?
      __SENTRY_RELEASE__ :
      undefined,
    integrations: [],
  });
};

export const initWebcomErrorTracking = () => {
  setErrorHandler((error, context) => {
    Sentry.captureException(error, {
      tags: {
        source: "webcom-api",
        endpoint: context.endpoint,
        method: context.method,
        operation: context.operation,
      },
      extra: {
        request: context.request,
        response: context.response,
        tags: context.tags,
      },
    });
  });
};

export const captureWebcomError = (error: Error,
  options: CaptureErrorOptions) => {
  Sentry.captureException(error, {
    tags: {
      source: "webcom",
      webcomName: options.webcomName,
      hostApp: options.hostApp,
    },
    extra: options.extra,
  });
};

export const setWebcomSentryContext = (name: string,
  context: Record<string, unknown>) => {
  Sentry.setContext(name, context);
};
