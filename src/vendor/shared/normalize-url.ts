export const normalizeUrl = (base: string, extraPath: string): string => {
  const normalizedBase = base.endsWith("/") ?
    base.slice(0, -1) :
    base;
  const normalizedPath = extraPath.startsWith("/") ?
    extraPath.slice(1) :
    extraPath;
  return `${normalizedBase}/${normalizedPath}`;
};
