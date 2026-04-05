# Source Layout Notes

Flow Reader now uses these active source roots:

- `src/` for the web app
- project root for extension/runtime files such as `background.ts`, `content.tsx`, `options.tsx`, `server.ts`, and `text.ts`

Older duplicate React component copies that previously lived at the repository root were removed to avoid release-time confusion about which files ship to production.
