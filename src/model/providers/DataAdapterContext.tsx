/**
 * Адаптер загрузки/сохранения документа { json, comments }.
 * Источники (по приоритету): window.TextCreator.getDataCallback(fieldUid) →
 * localStorage (при localUsed). Сохранение: saveCallback либо localStorage.
 *
 * Подводный камень: документ может превысить квоту localStorage (~5MB) →
 * QuotaExceededError. Поэтому при записи в localStorage поле `html`
 * отбрасывается, а сама запись обёрнута в try/catch с json-only фолбэком;
 * при финальной неудаче ошибка пробрасывается, чтобы UI показал тост.
 * См. docs/GOTCHAS.md.
 */
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { EditorSkeleton } from "@/ui/components/editor-skeleton";
import { STORAGE_KEY } from "@/ui/plugins/actions-plugin";

export type EditorData = {
  json?: object,
  html?: string,
  comments?: number[],
};

export interface DataAdapter {
  load: (fieldUid?: string) => EditorData | null,
  save: (fieldUid: string | undefined, data: EditorData) => void,
  uploadFile?: (file: File) => Promise<string | null>,
}

type DataAdapterContextValue = {
  adapter: DataAdapter,
  initialData: EditorData | null,
};

const localStorageAdapter: DataAdapter = {
  load: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as EditorData;
    } catch {
      return null;
    }
  },
  save: (_fieldUid, data) => {
    // В localStorage держим только то, что реально нужно для восстановления
    // редактора: json (canonical Lexical state) и comments. Поле `html`
    // — это derived view, при загрузке оно не читается (см. Editor.tsx),
    // зато удваивает объём и быстро упирается в ~5MB-квоту браузера.
    // Внешним адаптерам через window.TextCreator.saveCallback `html`
    // всё ещё передаётся (см. createWindowAdapter ниже).
    const payload: EditorData = {
      json: data.json,
      comments: data.comments,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      // QuotaExceededError — без обработки следующий setItem снова крашится,
      // и автосейв стопорит весь редактор. Логируем и пытаемся одну
      // последнюю спасительную попытку: сбросить только comments
      // (обычно занимают меньше всего), потом — отдать пользователю
      // понятный сигнал, не падая.
      console.warn("[TextCreator] localStorage save failed:", e);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ json: payload.json }));
      } catch (e2) {
        console.error("[TextCreator] Документ слишком большой для localStorage. Подключите внешний saveCallback.", e2);
        // Пробрасываем, чтобы вызывающий код (onSave) показал пользователю
        // флеш-сообщение, а не делал вид, что сохранение прошло.
        throw e2;
      }
    }
  },
};

function createWindowAdapter(): DataAdapter {
  return {
    load: (fieldUid) => {
      if (fieldUid && window?.TextCreator?.getDataCallback) {
        return window.TextCreator.getDataCallback(fieldUid) as EditorData;
      }
      return localStorageAdapter.load();
    },
    save: (fieldUid, data) => {
      const saveCallback = window?.TextCreator?.saveCallback;
      if (fieldUid && saveCallback) {
        saveCallback(fieldUid, data as any);
      } else {
        localStorageAdapter.save(fieldUid, data);
      }
    },
  };
}

const DataAdapterContext = createContext<DataAdapterContextValue>({
  adapter: localStorageAdapter,
  initialData: null,
});

export const DataAdapterProvider = ({
  children,
  adapter,
  localUsed,
  fieldUid,
}: {
  children: ReactNode,
  adapter?: DataAdapter,
  localUsed?: boolean,
  fieldUid?: string,
}) => {
  const resolvedAdapter = useMemo(() => {
    if (adapter) return adapter;
    if (localUsed) return localStorageAdapter;
    return createWindowAdapter();
  }, [ adapter, localUsed ]);

  const [ initialData, setInitialData ] = useState<EditorData | null | undefined>(undefined);

  useEffect(() => {
    try {
      const data = resolvedAdapter.load(fieldUid);
      setInitialData(data);
    } catch (e) {
      console.error("Failed to load editor data:", e);
      setInitialData(null);
    }
  }, [ resolvedAdapter, fieldUid ]);

  const value = useMemo(() => ({
    adapter: resolvedAdapter,
    initialData: initialData ?? null,
  }), [ resolvedAdapter, initialData ]);

  // undefined = still loading, null = loaded but empty
  if (initialData === undefined) {
    return <EditorSkeleton />;
  }

  return (
    <DataAdapterContext.Provider value={value}>
      {children}
    </DataAdapterContext.Provider>
  );
};

export const useDataAdapter = (): DataAdapter => {
  return useContext(DataAdapterContext).adapter;
};

export const useInitialData = (): EditorData | null => {
  return useContext(DataAdapterContext).initialData;
};
