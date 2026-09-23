import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const APP_VERSION: string = pkg.version;
const BUILD_TIME = new Date().toISOString();

// يولّد dist/version.json ليعرف التطبيق المفتوح أن نسخة أحدث نُشرت على الخادم
function versionFile(): Plugin {
  return {
    name: 'app-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: APP_VERSION, buildTime: BUILD_TIME }),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFile()],
  // إعدادات مطلوبة لـ Tauri: منفذ ثابت، وعدم مسح مخرجات Rust من الطرفية
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  esbuild: {
    target: 'esnext',
  },
  build: {
    target: 'esnext',
  },
});
