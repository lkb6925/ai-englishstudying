# .env.local 작성 템플릿

이 문서는 `.env.local`에 그대로 붙여넣고 값을 채우기 위한 템플릿입니다.

중요:
- `env.local`이 아니라 `.env.local` 파일을 사용하세요.
- `NEXT_PUBLIC_*` / `VITE_*` 값은 같은 Supabase 프로젝트 값을 넣으면 됩니다.
- 실제 키 값은 절대 이 문서에 남기지 마세요.

## Supabase에서 가져올 값

Supabase 대시보드 → Settings → API 에서 확인합니다.

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`

## AI 키

AI 기능을 쓸 거면 아래 중 하나를 넣으면 됩니다.
- `AI_API_KEY` 권장
- 또는 `GEMINI_API_KEY`
- 또는 `ANTHROPIC_API_KEY`

로컬 테스트만 먼저 할 거면 `AI_PROVIDER=mock`으로 둬도 됩니다.

## 복붙용 템플릿

```env
APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000
VITE_APP_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

AI_API_KEY=YOUR_AI_API_KEY
AI_PROVIDER=mock
AI_MODEL=mock
```

## 저장 후 확인

`.env.local`에 붙여넣은 뒤 아래를 실행하면 됩니다.

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## SQL 실행은 따로 해도 되나?

네. `supabase-schema.sql`은 앱 실행 세션과 분리해서, Supabase SQL Editor에서 실행하는 쪽이 더 깔끔합니다.
한 번만 하는 초기 설정이라서, 지금처럼 앱 세션과 분리하는 게 맞습니다.
