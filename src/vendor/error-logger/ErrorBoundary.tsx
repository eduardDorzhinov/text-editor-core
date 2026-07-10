"use client";

import {
  Component,
  ErrorInfo,
  ReactNode,
} from "react";

import { DefaultFallback } from "./DefaultFallback";

export interface ErrorBoundaryProps {
  children: ReactNode,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
}

export interface ErrorBoundaryState {
  hasError: boolean,
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback onRetry={this.reset} />;
    }

    return this.props.children;
  }
}
