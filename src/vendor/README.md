# `src/vendor/` — инлайненные пакеты

**Правило:** относитесь к `vendor/` как к стороннему коду. Когда нужно общее поведение, предпочитайте расширять это, а не тянуть новую зависимость, но держите изменения минимальными и самодостаточными — эти файлы зеркалят upstream-пакеты и существуют в основном для развязки с монорепой.

| Каталог | Был | Содержимое |
|---------|-----|------------|
| `shared/` | `@repo/edtech-shared` | Порталы (`use-scoped-portal`, `scoped-portal`, `portal-scope-context`), `use-click-outside`, переключатель темы, `use-is-scrollable`, глобальные константы (`BASE_URL`, `IS_DEV_MODE`, `API_URL`, `IS_WEBCOM`, `SCOPE_WEBCOM_CLASS`), URL/string-утилиты, **`create-webcom`** (регистрация custom element). |
| `api/` | `@repo/edtech-api` | `fetcher` (обёртка fetch), `getApiUrl`, `getUploadUrl`, шаблоны API URL. |
| `ui-kit/` | `@repo/edtech-ui-kit` | `Loader`, `Modal` (использует ScopedPortal), `Button` (+ `ButtonSize`), `DownloadFile`. SVG-иконки инлайнены; SCSS-миксины заменены на CSS media queries. |
| `error-logger/` | `@repo/edtech-error-logger` | `ErrorBoundary`, `WebcomErrorBoundary`, init/capture Sentry (`@sentry/browser`), `getErrorHandler`, `safeStringify`, fallback-UI по умолчанию. |
| `styles/` | `@repo/edtech-styles` | SCSS-миксины, breakpoints, legacy-типографика, CSS design-токены (`tokens/`). Миксины инжектятся через `additionalData` в `vite.config.mts`; токены импортируются в `main.tsx`. |
| `assets/` | `@repo/edtech-assets` | (Большинство SVG инлайнено в компоненты; здесь то, что осталось.) |

## Примечания

- **Единственная внешняя зависимость, привнесённая vendor-кодом:** `@sentry/browser` (используется только в `error-logger/`).
- **`create-webcom.tsx`** — то, что использует `src/webcom.tsx` для регистрации custom element. Webcom-сборка (`vite.webcom.config.mts`) скоупит CSS под `SCOPE_WEBCOM_CLASS` и конвертирует rem→px, чтобы элемент не наследовал стили хост-страницы.
- У каждого каталога есть barrel `index.ts` — импортируйте из каталога, а не по глубоким путям.
