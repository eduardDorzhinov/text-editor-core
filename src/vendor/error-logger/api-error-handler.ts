export type RequestContext = {
  url: string,
  method: string,
  body?: string,
};

export type ResponseContext = {
  status?: number,
  data?: unknown,
};

export type ErrorContext = {
  endpoint: string,
  method: string,
  operation?: string,
  tags?: Record<string, string>,
  request?: RequestContext,
  response?: ResponseContext,
};

export type ErrorHandler = (error: unknown, context: ErrorContext & { source?: string }) => void;

let errorHandler: ErrorHandler | null = null;

export const setErrorHandler = (handler: ErrorHandler | null) => {
  errorHandler = handler;
};

export const getErrorHandler = () => errorHandler;

export const safeStringify = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return `[FormData: ${[ ...value.keys() ].join(", ")}]`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "[Unable to stringify]";
  }
};
