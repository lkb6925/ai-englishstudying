# AI English Study Setup

AI English Study는 웹앱, Express API, Chrome 확장앱이 함께 동작하는 구조입니다.

## 소스 기준

- 웹앱의 정식 소스는 `src/`입니다.
- 확장앱 엔트리는 루트의 `background.ts`, `content.tsx`, `options.tsx`, `popup.html`입니다.
- `dist/`와 `dist-extension/`은 빌드 산출물입니다.
- `ai_feedback.md`는 watcher가 실행 중일 때 생성되는 산출물입니다.

## 필수 환경변수

`.env.local`에 아래 값을 넣습니다. 이 파일명이 중요합니다. Next/Vite가 자동으로 읽는 건 `env.local`이 아니라 `.env.local`입니다.

```env
APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000
VITE_APP_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
AI_API_KEY=YOUR_API_KEY_OR_USE_GEMINI_API_KEY
AI_PROVIDER=mock # local offline testing; change to gemini or anthropic for live calls
AI_MODEL=mock
```

- `APP_URL`: 웹앱의 public origin
- `API_BASE_URL`: 확장앱이 호출할 기본 API origin. 비우면 `APP_URL`을 사용합니다.
- `VITE_APP_URL`, `VITE_API_BASE_URL`: 확장앱/프런트 번들용 공개 환경변수입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

- 웹앱과 API는 `http://localhost:3000`에서 함께 실행됩니다.
- 홈 화면에서 `/setup`으로 들어가면 확장앱 설치 안내를 볼 수 있습니다.

## Chrome 확장앱 빌드

```bash
npm run build-extension
```

- `dist-extension/` 폴더가 생성됩니다.
- `dist-extension/manifest.json`은 환경변수를 기준으로 자동 생성됩니다.
- GitHub Codespaces에서 빌드하면 `localhost` 대신 공개 포트 URL을 자동 기본값으로 사용합니다.
- Chrome의 `chrome://extensions`에서 개발자 모드를 켠 뒤 `dist-extension/` 폴더를 불러옵니다.

원격 개발 환경에서 로컬 Chrome에 설치해야 한다면 zip으로 내려받는 쪽이 더 편합니다.

```bash
npm run package-extension
```

- 루트에 `ai-english-study-extension.zip`이 생성됩니다.
- 이 zip을 로컬 컴퓨터로 다운로드한 뒤 압축을 풉니다.
- Chrome의 `chrome://extensions`에서 개발자 모드를 켠 뒤, 압축 해제된 폴더를 선택합니다.

## Supabase 스키마

`supabase-schema.sql`을 SQL Editor에서 실행합니다.

- `profiles`
- `lookup_events`
- `wordbook_entries`
- `wordbook_entries.meaning_snapshot`

기존 프로젝트를 업그레이드하는 경우에도 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`가 포함되어 있어 `meaning_snapshot` 필드가 추가됩니다.

## AI Watcher

```bash
npm run watch:ai
```

- 실행 시 `ai_feedback.md`가 없으면 자동으로 초기 파일을 만듭니다.
- 코드 파일을 저장하면 watcher가 AI 리뷰를 요청하고 결과를 `ai_feedback.md`에 기록합니다.
- `AI_API_KEY`가 없더라도 `GEMINI_API_KEY` 또는 `ANTHROPIC_API_KEY`가 있으면 그걸 사용합니다.
- `AI_PROVIDER=mock`이면 외부 API 없이 로컬에서 바로 테스트할 수 있습니다.
- `env.local` 파일이 있으면 `cp env.local .env.local`로 복사해 주세요. `.env.local`만 자동 로드됩니다.

## 출시 전 체크리스트

```bash
npm run lint
npm run build
npm run build-extension
```

- 로그인 후 확장앱 조회가 저장되는지 확인합니다.
- 같은 단어를 두 번 조회하면 `wordbook_entries`에 저장되는지 확인합니다.
- Premium 계정에서 `/wordbook`과 Swipe Review가 모두 열리는지 확인합니다.
- 무료 계정에서 상세 단어장과 리뷰가 잠기는지 확인합니다.
