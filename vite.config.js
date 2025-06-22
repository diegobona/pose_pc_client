import { defineConfig } from 'vite';
import { resolve } from 'path';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  // Remove SvelteKit plugin since we're using vanilla HTML/JS
  plugins: [],

  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    // Entry point
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'src/app.html')
      },
      // Copy JS files as external assets
      external: ['/src/js/vendor/jquery.min.js', '/src/js/core/scene.js', '/src/js/core/camera.js', '/src/js/main.js']
    },
    // Copy static assets
    copyPublicDir: true,
    // Copy additional assets
    assetsInclude: ['**/*.js']
  },

  // Public directory for static assets
  publicDir: 'static',

  // Root directory - keep as project root
  // root: 'src',

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  },

  // Define global constants
  define: {
    global: 'globalThis',
  }
}));
