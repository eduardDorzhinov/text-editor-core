import { createHash } from 'crypto';
import * as path from 'path';

import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import svgr from 'vite-plugin-svgr';

import { postcssRemToPx } from './build/postcss-rem-to-px';
import { postcssSpecificity } from './build/postcss-specificity';
import { WEBCOM_NAME } from './src/webcom-constants';

const PROJECT_ROOT = import.meta.dirname;

export default defineConfig(({ mode }) => {
  const nodeEnv = process.env.NODE_ENV === 'production' ? 'prod' : 'stage';
  const env = loadEnv(nodeEnv, PROJECT_ROOT);

  const clearVersion = process.env.VITE_WEBCOM_CLEAR_VERSION || env.VITE_WEBCOM_CLEAR_VERSION || '';

  let buildPath = `/${WEBCOM_NAME}`;
  if (clearVersion) {
    buildPath += `/${clearVersion}`;
  }

  const outDir = path.resolve(PROJECT_ROOT, 'webcom-dist', WEBCOM_NAME, clearVersion);

  Object.assign(process.env, {
    ...env,
    VITE_WEBCOM_STORAGE_URL: env.VITE_WEBCOM_STORAGE_URL || '',
    VITE_API_URL: env.VITE_API_URL || '',
  });

  const scopeClass = `webcom-scope-${WEBCOM_NAME}`;

  const config: UserConfig = {
    base: `${env.VITE_WEBCOM_STORAGE_URL || ''}${buildPath}`,
    define: {
      __MODE__: JSON.stringify(mode),
      __IS_WEBCOM__: JSON.stringify(true),
      __WEBCOM_STORAGE_URL__: JSON.stringify(env.VITE_WEBCOM_STORAGE_URL || ''),
      __API_URL__: JSON.stringify(env.VITE_API_URL || ''),
      __WEBCOM_BUILD_PATH__: JSON.stringify(buildPath),
      __ORIGIN_ID__: JSON.stringify(''),
      __WEBCOM_SCOPE_CLASS__: JSON.stringify(scopeClass),
      __BASE_URL__: JSON.stringify(env.VITE_BASE_URL || ''),
      __WEBCOM_SENTRY_DSN__: JSON.stringify(env.VITE_WEBCOM_SENTRY_DSN || ''),
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
    },
    publicDir: false,
    plugins: [
      react(),
      svgr(),
      cssInjectedByJsPlugin({ topExecutionPriority: true, styleId: `webcom-css-${WEBCOM_NAME}` }),
    ],
    resolve: {
      // @/parser → внешний пакет-парсер (text-parser-core). Более специфичные
      // алиасы идут первыми. Локально указывает на соседний репозиторий; в
      // интеграционном репо путь перенастраивается на сабмодуль.
      alias: [
        {
          find: /^@\/parser$/,
          replacement: path.resolve(PROJECT_ROOT, '../text-parser-core/src/index.ts'),
        },
        {
          find: /^@\/parser\//,
          replacement: path.resolve(PROJECT_ROOT, '../text-parser-core/src') + '/',
        },
        {
          find: /^@\//,
          replacement: path.resolve(PROJECT_ROOT, './src') + '/',
        },
        {
          find: /^@$/,
          replacement: path.resolve(PROJECT_ROOT, './src'),
        },
      ],
    },
    css: {
      modules: {
        generateScopedName: (name: string, filename: string) => {
          if (name === scopeClass) return scopeClass;
          const hash = createHash('md5')
            .update(`${filename}:${name}`)
            .digest('base64url')
            .slice(0, 5);
          return `_${name}_${hash}`;
        },
      },
      postcss: {
        plugins: [postcssRemToPx(), postcssSpecificity({ scopeClass })],
      },
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'global-builtin'],
          loadPaths: [path.resolve(PROJECT_ROOT, 'node_modules')],
          additionalData: `
            @use "${path.resolve(PROJECT_ROOT, 'src/vendor/styles/mixins')}" as *;
            @use "${path.resolve(PROJECT_ROOT, 'src/vendor/styles/breakpoints')}" as *;
            @use "${path.resolve(PROJECT_ROOT, 'src/vendor/styles/old-typography')}" as *;
          `,
        },
      },
    },
    build: {
      emptyOutDir: true,
      outDir,
      sourcemap: true,
      minify: 'esbuild',
      lib: {
        entry: path.resolve(PROJECT_ROOT, 'src', 'webcom.tsx'),
        name: WEBCOM_NAME,
        formats: ['es'],
        fileName: () => `${WEBCOM_NAME}.es.js`,
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  };

  return config;
});
