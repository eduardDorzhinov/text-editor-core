import path from 'path';

import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv, type ServerOptions } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const nodeEnv = process.env.NODE_ENV === 'production' ? 'prod' : 'stage';
  const env = loadEnv(nodeEnv, import.meta.dirname);

  if (process.env.NODE_ENV === 'stage') {
    process.env.NODE_ENV = 'production';
  }

  Object.assign(process.env, {
    ...env,
    VITE_WEBCOM_STORAGE_URL: env.VITE_WEBCOM_STORAGE_URL || '',
    VITE_API_URL: env.VITE_API_URL || '',
    WEBCOM_BUILD_PATH: env.WEBCOM_BUILD_PATH || '',
    VITE_BASE_URL: env.VITE_BASE_URL || '',
  });

  const proxy: ServerOptions = {
    proxy: {
      [process.env.VITE_BASE_URL + '/api']: {
        target: process.env.VITE_API_URL,
        changeOrigin: true,
        rewrite: (p) => {
          let result = p;
          if (process.env.VITE_BASE_URL) {
            result = result.replace(process.env.VITE_BASE_URL, '');
          }
          return result.replace(/^\/api/, '');
        },
        configure: (proxyServer) => {
          proxyServer.on('proxyReq', (proxyReq) => {
            const token = env.VITE_AUTH_TOKEN;
            if (token) {
              proxyReq.setHeader('Cookie', `X-Auth-Key=${token}`);
            } else {
              console.warn('VITE_AUTH_TOKEN is not defined');
            }
          });
        },
      },
    },
  };

  return {
    base: process.env.VITE_BASE_URL,
    define: {
      __MODE__: JSON.stringify(mode),
      __IS_WEBCOM__: JSON.stringify(false),
      __WEBCOM_STORAGE_URL__: JSON.stringify(''),
      __WEBCOM_BUILD_PATH__: JSON.stringify(''),
      __API_URL__: JSON.stringify(env.VITE_API_URL || ''),
      __BASE_URL__: JSON.stringify(env.VITE_BASE_URL || ''),
    },
    plugins: [
      react(),
      svgr(),
      tsconfigPaths(),
      cssInjectedByJsPlugin(),
    ],
    resolve: {
      // @/parser → внешний пакет-парсер (text-parser-core). Более специфичные
      // алиасы идут первыми. Локально указывает на соседний репозиторий; в
      // интеграционном репо путь перенастраивается на сабмодуль.
      alias: [
        {
          find: /^@\/parser$/,
          replacement: path.resolve(import.meta.dirname, '../text-parser-core/src/index.ts'),
        },
        {
          find: /^@\/parser\//,
          replacement: path.resolve(import.meta.dirname, '../text-parser-core/src') + '/',
        },
        {
          find: /^@\//,
          replacement: path.resolve(import.meta.dirname, './src') + '/',
        },
        {
          find: /^@$/,
          replacement: path.resolve(import.meta.dirname, './src'),
        },
      ],
    },
    server: { ...proxy, open: true },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'global-builtin'],
          loadPaths: [path.resolve(import.meta.dirname, 'node_modules')],
          additionalData: `
            @use "${path.resolve(import.meta.dirname, 'src/vendor/styles/mixins')}" as *;
            @use "${path.resolve(import.meta.dirname, 'src/vendor/styles/breakpoints')}" as *;
            @use "${path.resolve(import.meta.dirname, 'src/vendor/styles/old-typography')}" as *;
          `,
        },
      },
    },
  };
});
