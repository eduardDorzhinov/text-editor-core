/**
 * Helper для безопасного получения Vite констант
 * В Vite: переменные заменяются на значения при сборке
 * В Next.js/Node.js: переменные не существуют, возвращается fallback
 */
export const getViteConst = <T>(getter: () => T | undefined, fallback: T): T => {
  try {
    const value = getter();
    if (typeof value === "string") {
      return value as T;
    }
    return value !== undefined && value !== null ?
      value :
      fallback;
  } catch {
    return fallback;
  }
};

export const getConst = <T extends (string | boolean)>(
  viteConst: T | undefined,
  webpackConst: string | undefined,
  fallback: T,
) => {
  try {
    if (viteConst !== undefined) {
      return getViteConst(() => viteConst, fallback);
    } else if (webpackConst) {
      return webpackConst;
    } else {
      return fallback;
    }
  } catch (e) {
    console.error(e);
    return fallback;
  }
};
