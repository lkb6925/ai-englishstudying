import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-extension',
    lib: {
      entry: {
        background: path.resolve(__dirname, 'extension/background.ts'),
        content: path.resolve(__dirname, 'extension/content.tsx'),
        options: path.resolve(__dirname, 'extension/options.tsx'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
    },
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
