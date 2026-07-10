import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import { Theme } from "./theme";

const getPreferredTheme = (initialTheme?: Theme): Theme => {
  if (initialTheme) return initialTheme;

  const htmlTheme = document?.documentElement?.getAttribute("data-theme");

  if (htmlTheme === Theme.Dark || htmlTheme === Theme.Light) {
    return htmlTheme as Theme;
  }

  if (window?.matchMedia("(prefers-color-scheme: dark)")?.matches) {
    return Theme.Dark;
  }

  return Theme.Light;
};

export const useThemeSwitcher = ({
  initialTheme,
  inheritTheme,
}: {
  initialTheme?: Theme,
  inheritTheme?: string,
}) => {
  const isAppTop = inheritTheme === "app";
  const isDeviceTop = inheritTheme === "device";

  const [ theme, setTheme ] = useState<Theme>(() => getPreferredTheme(initialTheme));

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [ theme ]);

  useEffect(() => {
    if (isAppTop) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ?
        Theme.Dark :
        Theme.Light);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [ isAppTop ]);

  const toggleTheme = useCallback(() => {
    if (isAppTop || isDeviceTop) return;
    setTheme((prev) => (prev === Theme.Dark ?
      Theme.Light :
      Theme.Dark));
  }, [ isAppTop, isDeviceTop ]);

  return {
    theme,
    toggleTheme,
    setTheme,
  };
};
