import {
  ComponentType,
  ReactElement,
} from "react";

import { LexicalEditor, LexicalNodeConfig } from "lexical";

import { type Hotkey, setExtensionHotkeys } from "@/lib/hotkeys";

/**
 * API расширений редактора. Ядро (repo `core-editor`) знает только про базовые
 * блоки; вставки конкретных доменов приходят расширениями, которые
 * приложение-интегратор регистрирует один раз при старте
 * через registerEditorExtensions() — ДО инициализации LexicalComposer.
 *
 * Симметрично ParserExtension (см. @/parser). Ядро редактора ни одной строкой
 * не ссылается на конкретные расширения.
 */

/** Компонент-диалог вставки: получает активный редактор и onClose. */
export type InsertDialogComponent = (props: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}) => ReactElement;

export interface InsertActionContext {
  editor: LexicalEditor,
  /** Открыть модалку-диалог вставки. */
  openDialog: (title: string, Dialog: InsertDialogComponent) => void,
}

/** Пункт меню «Вставка» + хоткей, приходящий из расширения. */
export interface InsertMenuItem {
  /** Совпадает с id хоткея (для тултипа и сайдбара). */
  id: string,
  /** Текст тултипа. */
  label: string,
  /** Текст пункта в дропдауне. */
  text: string,
  Icon: ComponentType,
  hotkeyId?: string,
  /** KeyboardEvent.code для хоткея Mod+Alt+<code> (напр. "KeyA"). */
  code?: string,
  /** Гейт по настройкам (true → показывать). */
  isEnabled?: (settings: Record<string, boolean>) => boolean,
  run: (ctx: InsertActionContext) => void,
}

export interface SettingsPanelGroup {
  title: string,
  rows: { key: string, text: string }[],
}

export interface EditorExtensionSettings {
  /** Значения флагов по умолчанию (мёржатся в состояние настроек). */
  defaults: Record<string, boolean>,
  /** Группа переключателей в панели «Настройки». */
  panel?: SettingsPanelGroup,
  /** Какие хоткеи прятать в сайдбаре, когда флаг настройки выключен. */
  hiddenHotkeys?: { settingKey: string, hotkeyIds: string[] }[],
}

export interface EditorExtension {
  id: string,
  nodes?: LexicalNodeConfig[],
  plugins?: ComponentType[],
  insertItems?: InsertMenuItem[],
  hotkeys?: Hotkey[],
  settings?: EditorExtensionSettings,
}

let extensions: EditorExtension[] = [];

/** Регистрирует расширения редактора (перезаписывает предыдущие). */
export const registerEditorExtensions = (exts: EditorExtension[]): void => {
  extensions = exts;
  // Хоткеи расширений отдаём в реестр хоткеев, чтобы getHotkey()/тултипы их
  // находили по id.
  setExtensionHotkeys(exts.flatMap((e) => e.hotkeys ?? []));
};

export const getEditorExtensions = (): EditorExtension[] => extensions;

export const getEditorExtensionNodes = (): LexicalNodeConfig[] =>
  extensions.flatMap((e) => e.nodes ?? []);

export const getEditorExtensionPlugins = (): ComponentType[] =>
  extensions.flatMap((e) => e.plugins ?? []);

export const getEditorExtensionInsertItems = (): InsertMenuItem[] =>
  extensions.flatMap((e) => e.insertItems ?? []);

export const getEditorExtensionSettingsDefaults = (): Record<string, boolean> =>
  Object.assign({}, ...extensions.map((e) => e.settings?.defaults ?? {}));

export const getEditorExtensionSettingsPanels = (): SettingsPanelGroup[] =>
  extensions
    .map((e) => e.settings?.panel)
    .filter((p): p is SettingsPanelGroup => Boolean(p));

/** id хоткеев, которые надо спрятать при текущих настройках (гейт расширений). */
export const getEditorExtensionHiddenHotkeys = (settings: Record<string, boolean>): string[] => {
  const hidden: string[] = [];
  for (const ext of extensions) {
    for (const rule of ext.settings?.hiddenHotkeys ?? []) {
      if (!settings[ rule.settingKey ]) hidden.push(...rule.hotkeyIds);
    }
  }
  return hidden;
};
