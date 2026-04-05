import { defineConfig } from 'vite';
import fs from 'fs/promises';
import path from 'path';

function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    closeBundle: async () => {
      const filesToCopy = ['manifest.json', 'popup.html'];
      await Promise.all(filesToCopy.map(async (file) => {
        try {
          const src = path.resolve(__dirname, file);
          const dest = path.resolve(__dirname, 'dist-extension', file);
          await fs.copyFile(src, dest);
        } catch (error) {
          // popup.html may not exist in all setups
          if (file === 'manifest.json') {
            throw error;
          }
        }
      }));

      // Create options.html
      const optionsHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow Reader Options</title>
</head>
<body>
  <div id="root"></div>
  <script src="options.js"></script>
</body>
</html>`;
      await fs.writeFile(path.resolve(__dirname, 'dist-extension', 'options.html'), optionsHtml);

      // Create tailwind-shadow.css
      const tailwindCss = `
/* Tailwind CSS for shadow DOM */
@tailwind base;
@tailwind components;
@tailwind utilities;
`;
      await fs.writeFile(path.resolve(__dirname, 'dist-extension', 'tailwind-shadow.css'), tailwindCss);
    },
  };
}

export default defineConfig({
  build: {
    outDir: 'dist-extension',
    lib: {
      entry: {
        background: path.resolve(__dirname, 'background.ts'),
        content: path.resolve(__dirname, 'content.tsx'),
        options: path.resolve(__dirname, 'options.tsx'),
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
      '@': path.resolve(__dirname, '.'),
    },
  },
  plugins: [copyExtensionAssets()],
});
