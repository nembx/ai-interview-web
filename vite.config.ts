import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [tailwindcss(), react()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/resume': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/jd-match': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/knowledge': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/rag': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/task': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
