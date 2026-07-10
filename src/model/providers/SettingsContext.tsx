import {
  Context,
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getEditorExtensionSettingsDefaults } from "@/model/editor-extensions";

export const INITIAL_SETTINGS_STATE = {
  commentMode: true,
  googleTranslatorPlugin: false,
  videoUrl: true,
  videoUpload: false,
  videoRutube: true,
  videoVk: true,
  audioUrl: true,
  audioUpload: false,
  downloadUrl: true,
  downloadUpload: false,
  pdfUrl: true,
  pdfUpload: false,
  scormInsert: false,
};

/**
 * Состояние настроек: базовые ключи ядра (типизированы) + ключи расширений
 * (строки, доступны через индекс). Флаги доменных вставок приходят из
 * расширений, а не из ядра.
 */
export type SettingsState = typeof INITIAL_SETTINGS_STATE & Record<string, boolean>;

type SettingsContextShape = {
  setOption: (name: string, value: boolean) => void,
  settings: SettingsState,
  showSettings: boolean,
  setShowSettings?: Dispatch<SetStateAction<boolean>>,
};

const SettingsContext: Context<SettingsContextShape> = createContext<SettingsContextShape>({
  setOption: () => {
    // noop
  },
  settings: INITIAL_SETTINGS_STATE as SettingsState,
  showSettings: false,
});

export const SettingsContextProvider = ({
  children,
}: {
  children: ReactNode,
}) => {
  const [ showSettings, setShowSettings ] = useState(false);
  // Начальное состояние = базовые настройки + дефолты расширений (расширения
  // регистрируются приложением-интегратором до первого рендера).
  const [ settings, setSettings ] = useState<SettingsState>(() => ({
    ...INITIAL_SETTINGS_STATE,
    ...getEditorExtensionSettingsDefaults(),
  }) as SettingsState);

  const setOption = useCallback((setting: string, value: boolean) => {
    setSettings((options) => ({
      ...options,
      [ setting ]: value,
    }));
  }, []);

  useEffect(() => {
    if (settings?.googleTranslatorPlugin) {
      document.body.classList.remove("disabled-google-translator");
    } else {
      document.body.classList.add("disabled-google-translator");
    }
  }, [ settings?.googleTranslatorPlugin ]);

  const contextValue = useMemo(() => {
    return {
      setOption,
      settings,
      showSettings,
      setShowSettings,
    };
  }, [
    setOption,
    settings,
    showSettings,
  ]);

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextShape => {
  return useContext(SettingsContext);
};
