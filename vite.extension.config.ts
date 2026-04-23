import { defineConfig, loadEnv } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import {
  getChromeExtensionHostPermissions,
  getWordbookUrl,
  resolveApiBaseUrl,
  resolveAppOrigin,
} from './app-config';

type ExtensionPluginOptions = {
  appUrl: string;
  apiBaseUrl: string;
};

function copyExtensionAssets({ appUrl, apiBaseUrl }: ExtensionPluginOptions) {
  return {
    name: 'copy-extension-assets',
    closeBundle: async () => {
      const manifest = {
        manifest_version: 3,
        name: 'AI English Study',
        version: '0.1.0',
        description:
          'AI 기반 영어 단어 조회 및 자동 단어장 - Alt/Option + 마우스 올리기',
        permissions: ['storage', 'activeTab'],
        host_permissions: getChromeExtensionHostPermissions(apiBaseUrl, appUrl),
        background: {
          service_worker: 'background.js',
          type: 'module',
        },
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['content.js'],
            run_at: 'document_idle',
          },
        ],
        options_ui: {
          page: 'options.html',
          open_in_tab: true,
        },
        action: {
          default_popup: 'popup.html',
          default_title: 'AI English Study',
        },
        web_accessible_resources: [
          {
            resources: ['tailwind-shadow.css'],
            matches: ['<all_urls>'],
          },
        ],
      };

      await fs.writeFile(
        path.resolve(__dirname, 'dist-extension', 'manifest.json'),
        JSON.stringify(manifest, null, 2),
      );

      const popupHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI English Study</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 280px;
      font-family: 'Pretendard Variable', 'Pretendard', system-ui, sans-serif;
      background: #0a0a0f;
      color: #f4f4f5;
      -webkit-font-smoothing: antialiased;
    }
    .header {
      padding: 16px;
      background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1));
      border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .logo-text { font-weight: 900; font-size: 15px; }
    .logo-sub { font-size: 11px; color: #71717a; margin-top: 1px; }
    .body { padding: 16px; }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      margin-bottom: 12px;
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.25);
      font-size: 13px;
      font-weight: 600;
      color: #6ee7b7;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .key-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      background: rgba(99,102,241,0.12);
      border: 1px solid rgba(99,102,241,0.3);
      color: #818cf8;
      width: 100%;
      margin-bottom: 12px;
    }
    .key-icon {
      font-size: 16px;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(99,102,241,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: none;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      margin-bottom: 8px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      color: #a1a1aa;
    }
    .meta {
      margin-top: 8px;
      font-size: 11px;
      color: #71717a;
      word-break: break-all;
    }
    .btn:hover { transform: scale(1.02); }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">📖</div>
    <div>
      <div class="logo-text">AI English Study</div>
      <div class="logo-sub">AI 영어 단어 조회</div>
    </div>
  </div>

  <div class="body">
    <div class="status">
      <span class="dot"></span>
      확장앱 활성화됨
    </div>

    <div class="key-badge">
      <span class="key-icon">⌥</span>
      <span id="modifier-text">Alt / Option + 마우스 올리기</span>
    </div>

    <button class="btn btn-primary" id="wordbook-btn">
      📚 내 단어장 열기
    </button>

    <button class="btn btn-secondary" id="options-btn">
      ⚙️ 설정 (단축키 변경)
    </button>

    <p class="meta" id="api-base-url"></p>
  </div>

  <script type="module" src="popup.js"></script>
</body>
</html>`;
      await fs.writeFile(
        path.resolve(__dirname, 'dist-extension', 'popup.html'),
        popupHtml,
      );

      const optionsHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI English Study Options</title>
</head>
<body>
  <div id="root"></div>
  <script src="options.js"></script>
</body>
</html>`;
      await fs.writeFile(
        path.resolve(__dirname, 'dist-extension', 'options.html'),
        optionsHtml,
      );

      const tailwindCss = `
/* Tailwind CSS for shadow DOM */
@tailwind base;
@tailwind components;
@tailwind utilities;
`;
      await fs.writeFile(
        path.resolve(__dirname, 'dist-extension', 'tailwind-shadow.css'),
        tailwindCss,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const codespaceName = env.VITE_CODESPACE_NAME || env.CODESPACE_NAME;
  const forwardingDomain =
    env.VITE_CODESPACES_PORT_FORWARDING_DOMAIN ||
    env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  const appUrl = resolveAppOrigin(
    env.VITE_APP_URL || env.APP_URL,
    codespaceName,
    forwardingDomain,
  );
  const apiBaseUrl = resolveApiBaseUrl(
    env.VITE_API_BASE_URL || env.API_BASE_URL,
    env.VITE_APP_URL || env.APP_URL,
    codespaceName,
    forwardingDomain,
  );

  return {
    build: {
      outDir: 'dist-extension',
      lib: {
        entry: {
        background: path.resolve(__dirname, 'background.ts'),
        content: path.resolve(__dirname, 'content.tsx'),
        options: path.resolve(__dirname, 'options.tsx'),
        popup: path.resolve(__dirname, 'popup.ts'),
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
    plugins: [
      copyExtensionAssets({
        appUrl,
        apiBaseUrl,
      }),
    ],
  };
});
