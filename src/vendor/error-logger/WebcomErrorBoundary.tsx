import { ErrorInfo } from "react";

import * as Sentry from "@sentry/browser";

import { DefaultFallback } from "./DefaultFallback";
import { ErrorBoundary, ErrorBoundaryProps } from "./ErrorBoundary";

export interface WebcomErrorBoundaryProps extends Omit<ErrorBoundaryProps, "onError"> {
  webcomName: string,
}

export class WebcomErrorBoundary extends ErrorBoundary {
  declare props: WebcomErrorBoundaryProps;

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { webcomName } = this.props;

    try {
      const client = Sentry.getClient();
      if (client) {
        Sentry.withScope((scope) => {
          scope.setTag("source", "webcom");
          scope.setTag("webcomName", webcomName);
          scope.setTag("hostApp", typeof window !== "undefined" ?
            window.location.hostname :
            "unknown");
          scope.setExtra("componentStack", errorInfo.componentStack);
          Sentry.captureException(error);
        });
      }
    } catch (e) {
      console.error("[WebcomErrorBoundary] Failed to send to Sentry:", e);
    }
  }

  render() {
    const {
      children,
      fallback,
      webcomName,
    } = this.props;

    if (this.state.hasError) {
      return fallback ?? (
        <DefaultFallback description={`Компонент ${webcomName} временно недоступен`} />
      );
    }

    return children;
  }
}
