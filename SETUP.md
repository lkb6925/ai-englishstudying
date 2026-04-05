# Flow Reader — 완전 설정 가이드

> AI 기반 영어 단어 조회 + 자동 단어장 서비스

---

## 📁 파일 구조

```
flow-reader/
├── src/                        # 웹앱 (React)
│   ├── App.tsx
│   ├── index.css               # 다크 테마 디자인 시스템
│   ├── main.tsx
│   ├── pages/
│   │   ├── home.tsx            # 홈페이지
│   │   └── wordbook.tsx        # 단어장 페이지
│   ├── components/
│   │   ├── auth-form.tsx       # 로그인/회원가입
│   │   ├── header.tsx
│   │   ├── swipe-quiz.tsx      # 스와이프 복습
│   │   ├── wordbook-dashboard.tsx
│   │   ├── wordbook-list.tsx
│   │   └── ui/button.tsx
│   └── lib/
│       ├── supabase.ts         # Supabase 클라이언트
│       ├── rank.ts             # 랭크 로직
│       ├── types.ts
│       └── utils.ts
├── extension/                  # Chrome 확장앱
│   ├── manifest.json
│   ├── background.ts           # 서비스 워커
│   ├── content.tsx             # 페이지 내 오버레이
│   ├── messages.ts             # 타입 정의
│   ├── options.tsx             # ⭐ 설정 페이지 (단축키 변경)
│   ├── popup.html              # ⭐ 확장앱 팝업
│   └── chrome.d.ts
├── server.ts                   # Express + Gemini AI 서버
├── supabase-schema.sql         # ⭐ DB 스키마 (한번만 실행)
├── vite.config.ts
├── vite.extension.config.ts
├── package.json
├── tsconfig.json
├── .env.example                # 환경변수 예시
└── .env.local                  # ← 실제 키 입력 (git 제외)
```

---

## 🚀 STEP 1: Supabase 설정

### 1-1. 프로젝트 생성
1. [supabase.com](https://supabase.com) → **New Project**
2. 프로젝트 이름, 비밀번호 설정 후 생성 (약 2분 소요)

### 1-2. DB 스키마 실행
1. Supabase 대시보드 → **SQL Editor**
2. `supabase-schema.sql` 파일 전체 내용 붙여넣기
3. **Run** 클릭

### 1-3. 키 복사
1. 대시보드 → **Settings** → **API**
2. `Project URL` → `VITE_SUPABASE_URL`에 입력
3. `anon public` 키 → `VITE_SUPABASE_ANON_KEY`에 입력

### 1-4. 이메일 인증 끄기 (개발 중 편의)
- **Authentication** → **Providers** → **Email** → **Confirm email** 토글 OFF
- (나중에 배포 시 다시 켜세요)

---

## 🤖 STEP 2: Gemini API 키

1. [aistudio.google.com](https://aistudio.google.com) 접속
2. **Get API key** → **Create API key**
3. 키 복사 → `GEMINI_API_KEY`에 입력

---

## ⚙️ STEP 3: 환경변수 설정

`.env.local` 파일을 열고 입력:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
GEMINI_API_KEY=AIzaSy...
APP_URL=http://localhost:3000
```

---

## 💻 STEP 4: 웹앱 실행

```bash
npm install
npm run dev
```

→ http://localhost:3000 에서 확인

---

## 🔌 STEP 5: Chrome 확장앱 설치

### 5-1. 빌드
```bash
npm run build-extension
```
→ `dist-extension/` 폴더 생성됨

### 5-2. Chrome에 설치
1. Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 토글 ON
3. **압축 해제된 확장 프로그램 로드** 클릭
4. `dist-extension/` 폴더 선택

### 5-3. 확장앱 설정
- Chrome 툴바에서 Flow Reader 아이콘 클릭
- **⚙️ 설정** 버튼 → 단축키 선택 (Alt/Option 또는 Cmd/Ctrl)
- 서버 주소 확인 (기본: `http://localhost:3000`)

---

## 🎮 사용 방법

1. 아무 영어 웹페이지로 이동
2. `Alt` (또는 설정한 키)를 누른 채로 모르는 단어에 마우스 올리기
3. 0.2초 후 AI가 문맥에 맞는 한국어 뜻 표시
4. 같은 단어를 2번 이상 조회하면 단어장에 자동 등록

---

## ❗ 문제 해결

| 문제 | 해결 방법 |
|------|-----------|
| 로그인 안 됨 | Supabase 대시보드에서 이메일 인증 OFF 확인 |
| 팝업이 안 뜸 | 확장앱 설정에서 서버 주소 `http://localhost:3000` 확인 |
| AI 응답 없음 | `.env.local`의 `GEMINI_API_KEY` 확인, 서버 재시작 |
| 단어장이 비어 있음 | 로그인 후 단어를 2회 이상 조회해야 등록됨 |
| 확장앱 오류 | `chrome://extensions`에서 새로고침 버튼 클릭 |

---

## 🗺️ 향후 개선 사항 (직접 해야 함)

- [ ] Supabase Storage로 이미지/음성 지원
- [ ] Premium 결제 연동 (Stripe 등)
- [ ] 확장앱 Chrome 웹스토어 배포
- [ ] 서버 배포 (Render, Railway, Fly.io 등)
- [ ] 푸시 알림으로 복습 리마인더
