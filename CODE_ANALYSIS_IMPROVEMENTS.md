# Flow Reader - 코드 분석 및 개선 사항 보고서

**작성 목적**: Codex AI가 전체 구조를 이해하고 효율적으로 리팩토링할 수 있도록 상세히 작성

---

## 📋 목차
1. [아키텍처 개요](#아키텍처-개요)
2. [현재 코드의 문제점](#현재-코드의-문제점-및-비효율성)
3. [비효율적인 소드](#비효율적인-코드-패턴)
4. [타입 안정성 문제](#타입-안정성-문제)
5. [상태 관리 문제](#상태-관리-문제)
6. [api/백엔드 개선사항](#apibackend-개선사항)
7. [프론트엔드 개선사항](#프론트엔드-개선사항)
8. [확장앱 개선사항](#chrome-확장앱-개선사항)
9. [새로운 아이디어](#새로운-아이디어)
10. [성능 최적화](#성능-최적화)

---

## 🏗️ 아키텍처 개요

### 현재 구조
```
Frontend (React + Vite)
├── src/pages/ (Home, Wordbook, Setup)
├── src/components/ (UI components)
├── src/lib/ (Utilities, Supabase, types)
└── dist-extension/ (Chrome extension build)

Backend (Express + Node.js)
├── server.ts (API endpoints)
├── Gemini AI integration
└── Supabase integration

Chrome Extension
├── background.ts (service worker)
├── content.tsx (content script - 약 300+ 줄)
└── messages.ts (communication types)

Database (Supabase PostgreSQL)
├── profiles
├── lookup_events
└── wordbook_entries
```

### 앱 흐름
1. 사용자가 Alt/Option 키를 누르고 마우스를 올린다
2. Content script가 마우스 위치의 단어를 감지
3. Background worker에 메시지를 보낸다
4. 백엔드 `/api/lookup` 엔드포인트로 AI 룩업 요청
5. 결과를 overlay에 표시
6. `/api/lookup-event` 로 데이터 저장 (authenticated users)

---

## 🔴 현재 코드의 문제점 및 비효율성

### 1. **Content Script의 과도한 책임 (분산된 로직)**

#### 문제점
- `content.tsx`가 약 300+ 줄의 거대한 클래스 기반 컴포넌트
- 다양한 책임이 혼합:
  - 키보드/마우스 이벤트 핸들링
  - Shadow DOM overlay 관리
  - 캐싱 로직
  - 레이트 리미팅
  - 인증 토큰 처리
  - API 통신

#### 개선 방안
```typescript
// 현재 (나쁜 예) - 모든 로직이 한 클래스에
class FlowReaderContentScript {
  private handleMouseMove = ...
  private overlayHost = ...
  private renderOverlay = ...
  private lookupWord = ...
  private cacheResults = ...
  private limitRequests = ...
}

// 개선된 방안 - 책임 분리
class EventManager {
  // 키보드/마우스 이벤트만 담당
  onKeyDown, onKeyUp, onMouseMove
}

class OverlayManager {
  // Shadow DOM overlay만 담당
  show, hide, update, destroy
}

class LookupCache {
  // 캐싱만 담당
  get, set, isExpired
}

class RequestLimiter {
  // 레이트 리미팅만 담당
  canRequest, record, reset
}

class LookupService {
  // 외부 API 통신만 담당
  lookup, recordEvent
}
```

---

### 2. **중복된 Rank 계산 로직**

#### 문제점
- `server.ts`에 `getRankFromCount` 함수
- `src/lib/rank.ts`에 `getRankFromLookupCount` 함수
- 두 함수가 거의 동일한 로직인데 **중복되어 있음**

```typescript
// server.ts의 getRankFromCount
function getRankFromCount(count: number): string {
  if (count >= 12) return 'red';
  if (count >= 8) return 'orange';
  if (count >= 5) return 'yellow';
  if (count >= 3) return 'green';
  return 'blue';
}

// src/lib/rank.ts의 getRankFromLookupCount
export function getRankFromLookupCount(lookupCount: number): Rank {
  if (lookupCount <= 0) return 'blue';
  let resolvedRank: Rank = 'blue';
  for (const threshold of lookupRankThresholds) {
    if (lookupCount >= threshold.minCount) {
      resolvedRank = threshold.rank;
    }
  }
  return resolvedRank;
}
```

#### 명제
- **동일한 threshold 사용하지만 구현 방식이 다름**
- `server.ts` 버전이 더 간단하지만, `rank.ts` 버전이 유지보수하기 더 좋음
- 단일 source of truth 필요

#### 해결책
```typescript
// src/lib/rank.ts로 통합
export const RANK_THRESHOLDS: Array<{ minCount: number; rank: Rank }> = [
  { minCount: 1, rank: 'blue' },
  { minCount: 3, rank: 'green' },
  { minCount: 5, rank: 'yellow' },
  { minCount: 8, rank: 'orange' },
  { minCount: 12, rank: 'red' },
];

export function getRankFromCount(count: number): Rank {
  if (count <= 0) return 'blue';
  let rank: Rank = 'blue';
  for (const threshold of RANK_THRESHOLDS) {
    if (count >= threshold.minCount) {
      rank = threshold.rank;
    }
  }
  return rank;
}

// server.ts에서 import해서 사용
import { getRankFromCount } from './src/lib/rank.ts';
```

---

### 3. **getRankOrderValue 로직 중복**

#### 문제점
- `server.ts`의 `getRankOrderValue`
- `src/lib/rank.ts`의 `rankOrderValue`
- 거의 동일한 코드가 두 곳에 존재

```typescript
// server.ts
function getRankOrderValue(rank: string): number {
  const order: Record<string, number> = {
    red: 0, orange: 1, yellow: 2, green: 3, blue: 4, master: 5,
  };
  return order[rank] ?? order.blue;
}

// src/lib/rank.ts
export function rankOrderValue(rank: Rank): number {
  const order: Record<Rank, number> = {
    red: 0, orange: 1, yellow: 2, green: 3, blue: 4, master: 5,
  };
  return order[rank];
}
```

#### 해결책
- `server.ts`에서 `src/lib/rank.ts`의 함수를 import해서 사용
- 함수명 통일: `rankOrderValue` 또는 `getRankOrderValue`로 하나로 통일

---

### 4. **타입 불일치 및 any 타입 과용**

#### 문제점
```typescript
// src/lib/supabase.ts
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export function useAuth() {
  const [user, setUser] = useState<any>(null);  // ❌ any 타입!
  // ...
}

// server.ts에서도 타입 검증이 불완전
const { word, sentence } = req.body as { word?: string; sentence?: string };
// word와 sentence가 undefined일 수 있는데 검증이 약함
```

#### 개선
```typescript
// 타입 정의 강화
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);  // ✅ 구체적인 타입
  // ...
}

// 요청 검증 함수 분리
function validateLookupRequest(body: unknown): { word: string; sentence: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }
  
  const { word, sentence } = body as Record<string, unknown>;
  
  if (typeof word !== 'string' || !word.trim()) {
    throw new Error('word must be a non-empty string');
  }
  
  if (typeof sentence !== 'string' || !sentence.trim()) {
    throw new Error('sentence must be a non-empty string');
  }
  
  return { word, sentence };
}
```

---

### 5. **에러 처리의 부실**

#### 문제점
```typescript
// content.tsx - 에러가 무시됨
private async loadModifierFromBackground() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FLOW_GET_MODIFIER',
    });
    if (response.ok && 'modifier' in response.data) {
      this.modifierMode = response.data.modifier;
    }
  } catch {
    // extension context may not be ready
    // ❌ 에러가 완전히 무시됨, 기본값도 설정 안됨
  }
}

// background.ts - 에러 처리 없음
async function recordGuestLookup(term: string): Promise<GuestStats> {
  const key = term.toLowerCase().trim();
  const stats = await readGuestStats();
  // 계속 진행... 에러 처리 없음
}

// server.ts - Gemini API 에러 처리
async function lookupContextualMeanings(word: string, sentence: string) {
  if (!ai) {
    return {
      contextual_meanings: ['테스트 의미'],  // ❌ 하드코딩된 더미 데이터
    };
  }
  // AI 호출... 에러는?
}
```

#### 개선
```typescript
// 에러 타입 정의
class ExtensionError extends Error {
  constructor(public code: 'EXTENSION_NOT_READY' | 'API_ERROR' | 'STORAGE_ERROR') {
    super();
  }
}

// 재시도 로직 추가
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Retry failed');
}

// Proper error handling in content script
private async loadModifierFromBackground() {
  try {
    const response = await retryWithBackoff(() => 
      chrome.runtime.sendMessage({ type: 'FLOW_GET_MODIFIER' })
    );
    
    if (response.ok && 'modifier' in response.data) {
      this.modifierMode = response.data.modifier;
    }
  } catch (error) {
    console.warn('Failed to load modifier, using default:', error);
    this.modifierMode = 'alt_option'; // 안전한 기본값
  }
}
```

---

### 6. **API 응답 형식 불일치**

#### 문제점
```typescript
// 라우트마다 응답 형식이 다름

// /api/lookup - 간단한 JSON
res.json({
  lemma: word,
  contextual_meanings: [...]
})

// /api/lookup-event - 복잡한 JSON
res.json({
  persisted: true,
  totalLookupCount: 5,
  promoted: false,
  planTier: 'premium',
})

// /api/quiz-review - 또 다른 형식
res.json({ 
  success: true, 
  entryId, 
  nextRank 
});
```

#### 개선
```typescript
// 통일된 응답 형식
type ApiResponse<T> = 
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type LookupResponse = { lemma: string; meanings: string[] };
type LookupEventResponse = {
  persisted: boolean;
  totalCount: number;
  promoted: boolean;
  planTier: 'free' | 'premium' | null;
};

// 라우트에서 사용
app.post('/api/lookup', async (req, res) => {
  try {
    const result = await lookupContextualMeanings(word, sentence);
    res.json({ ok: true, data: result } as ApiResponse<LookupResponse>);
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: { code: 'LOOKUP_FAILED', message: error.message }
    } as ApiResponse<never>);
  }
});
```

---

### 7. **환경 변수 처리의 불안정성**

#### 문제점
```typescript
// src/lib/supabase.ts
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// ❌ any 타입 캐스트
// ❌ 타입 안전성 없음
// ❌ vite.config.ts에서 define이 제대로 설정되었는지 확인 불가

// background.ts
const defaultAppUrl = resolveAppOrigin(import.meta.env.VITE_APP_URL);
const defaultApiBaseUrl = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.VITE_APP_URL,
);
// undefined일 수 있음

// server.ts
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// 빈 문자열이면 ai = null이 되는데, API 호출 시 테스트 데이터 반환
```

#### 개선
```typescript
// env.ts - 타입 안전한 환경 변수 처리
export function getEnv(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue || '';
}

// 타입 안전한 환경 변수 래퍼
export const config = {
  supabase: {
    url: getEnv('VITE_SUPABASE_URL'),
    key: getEnv('VITE_SUPABASE_ANON_KEY'),
  },
  gemini: {
    apiKey: getEnv('GEMINI_API_KEY'),
  },
  app: {
    url: getEnv('VITE_APP_URL', 'http://localhost:3000'),
    apiUrl: getEnv('VITE_API_BASE_URL'),
  },
} as const;

// 사용
import { config } from './env.ts';
const supabase = createClient(config.supabase.url, config.supabase.key);
```

---

### 8. **캐싱 전략의 문제**

#### 문제점
```typescript
// background.ts에 캐싱이 있음
type CachedLookup = {
  meanings: string[];
  expiresAt: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

// 하지만:
// 1. 메모리 캐시만 사용 (테탭이 닫히면 사라짐)
// 2. 캐시 크기 제한 없음 (메모리 누수 가능)
// 3. 캐시 무효화 전략이 없음
// 4. 중복 요청 감지 로직과 캐싱이 혼재
```

#### 개선
```typescript
class LookupCache {
  private cache = new Map<string, { meanings: string[]; expiresAt: number }>();
  private readonly maxSize = 1000;
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  get(key: string): string[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.meanings;
  }

  set(key: string, meanings: string[]): void {
    // LRU 제거: 캐시가 가득 찼으면 가장 오래된 항목 제거
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      meanings,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(pattern?: RegExp): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

---

### 9. **상태 관리의 산재**

#### 문제점
```typescript
// Chrome Storage에 여러 곳에 저장됨
const modifierStorageKey = 'flow_reader_modifier';
const jwtStorageKey = 'supabase_jwt';
const guestStatsStorageKey = 'flow_reader_guest_stats';

// 근데 background.ts에서는 다르게 사용
chrome.storage.session.get(jwtStorageKey)  // 세션 스토리지
chrome.storage.local.get(jwtStorageKey)    // 로컬 스토리지

// wordbook.tsx에서는 React state
const [words, setWords] = useState<WordbookEntry[]>([]);
const [planTier, setPlanTier] = useState<PlanTier>('free');

// 상태 변경이 분산되어 있음 + 동기화 문제
```

#### 개선
```typescript
// storage 계층 추상화
interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

class ChromeStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    const area = key.startsWith('session_') 
      ? chrome.storage.session 
      : chrome.storage.local;
    const result = await area.get(key);
    return result[key] ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const area = key.startsWith('session_') 
      ? chrome.storage.session 
      : chrome.storage.local;
    await area.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    const area = key.startsWith('session_') 
      ? chrome.storage.session 
      : chrome.storage.local;
    await area.remove(key);
  }

  async clear(): Promise<void> {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();
  }
}

// 상태 관리
class AppState {
  constructor(private storage: StorageAdapter) {}

  async getModifier(): Promise<ModifierMode> {
    return this.storage.get<ModifierMode>('modifier') ?? 'alt_option';
  }

  async setModifier(mode: ModifierMode): Promise<void> {
    await this.storage.set('modifier', mode);
  }

  async getJwt(): Promise<string | null> {
    return this.storage.get<string>('session_jwt') ?? null;
  }

  async setJwt(token: string | null): Promise<void> {
    if (token) {
      await this.storage.set('session_jwt', token);
    } else {
      await this.storage.remove('session_jwt');
    }
  }

  async getGuestStats(): Promise<GuestStats> {
    return this.storage.get<GuestStats>('guest_stats') ?? { total: 0, terms: {}, shownCount: 0 };
  }

  async setGuestStats(stats: GuestStats): Promise<void> {
    await this.storage.set('guest_stats', stats);
  }
}
```

---

### 10. **데이터베이스 쿼리 비효율성**

#### 문제점
```typescript
// server.ts - `/api/lookup-event`
// 1. 조회 카운트 쿼리
const { count: previousLookupCount, error: countError } = await userDb
  .from('lookup_events')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('normalized_term', normalizedTerm);

// 2. 기존 엔트리 조회
const { data: existingEntry, error: existingError } = await userDb
  .from('wordbook_entries')
  .select('id, rank, meaning_snapshot')
  .eq('user_id', user.id)
  .eq('normalized_term', normalizedTerm)
  .maybeSingle();

// 3. 새로운 이벤트 삽입
await userDb.from('lookup_events').insert({ ... });

// 4. 엔트리 업데이트 또는 삽입
if (existingEntry) {
  await userDb.from('wordbook_entries').update({ ... });
} else if (totalLookupCount >= 2) {
  await userDb.from('wordbook_entries').insert({ ... });
}
```

#### 문제점 분석
- **N+1 쿼리**: 카운트 → 기존 엔트리 → 삽입/업데이트 (최소 3-4개 쿼리)
- **중복 로직**: 총 조회 수는 `lookup_events` 테이블에서 계산되는데, 이미 저장할 때 계산됨
- **트랜잭션 부재**: 동시성 문제 가능성

#### 개선
```typescript
// PostgreSQL 트리거와 함수로 처리 (개선된 데이터베이스 스키마)
CREATE OR REPLACE FUNCTION handle_lookup_event()
RETURNS TRIGGER AS $$
DECLARE
  total_count INTEGER;
  new_rank TEXT;
  existing_entry RECORD;
BEGIN
  -- 총 조회 수 계산
  total_count := (
    SELECT COUNT(*) FROM lookup_events
    WHERE user_id = NEW.user_id AND normalized_term = NEW.normalized_term
  );

  -- 새로운 랭크 결정
  new_rank := CASE 
    WHEN total_count >= 12 THEN 'red'
    WHEN total_count >= 8 THEN 'orange'
    WHEN total_count >= 5 THEN 'yellow'
    WHEN total_count >= 3 THEN 'green'
    ELSE 'blue'
  END;

  -- wordbook_entries에서 기존 엔트리 확인 및 업데이트/삽입
  INSERT INTO wordbook_entries (
    user_id, term, normalized_term, context_sample, 
    total_lookup_count, rank, last_seen_at
  ) VALUES (
    NEW.user_id, NEW.term, NEW.normalized_term, NEW.context,
    total_count, new_rank, NOW()
  )
  ON CONFLICT (user_id, normalized_term) DO UPDATE SET
    total_lookup_count = total_count,
    rank = new_rank,
    last_seen_at = NOW(),
    context_sample = COALESCE(NEW.context, context_sample);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_lookup_event
AFTER INSERT ON lookup_events
FOR EACH ROW EXECUTE FUNCTION handle_lookup_event();

// 이제 백엔드에서는 단순히 삽입만
app.post('/api/lookup-event', async (req, res) => {
  const { term, context, meanings, sourceDomain, sourcePathHash } = req.body;
  const jwt = extractJWT(req);
  
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await getSupabaseUser(jwt);
    const userDb = createUserScopedSupabase(jwt);

    // 단일 INSERT 쿼리
    const { data, error } = await userDb.from('lookup_events').insert({
      user_id: user.id,
      term,
      normalized_term: term.toLowerCase().trim(),
      context: context?.slice(0, 300) || null,
      source_domain: sourceDomain || null,
      source_path_hash: sourcePathHash || null,
    }).select('*').single();

    if (error) throw error;

    // 이제 wordbook_entries는 트리거로 자동 업데이트됨
    // 최종 데이터를 조회해서 반환
    const { data: entry } = await userDb
      .from('wordbook_entries')
      .select('total_lookup_count, rank, plan_tier')
      .eq('normalized_term', term.toLowerCase().trim())
      .eq('user_id', user.id)
      .single();

    res.json({
      persisted: true,
      totalLookupCount: entry?.total_lookup_count,
      rank: entry?.rank,
      planTier: entry?.plan_tier || 'free',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record lookup' });
  }
});
```

---

### 11. **번들 크기 분석 부재**

#### 문제점
```typescript
// vite.config.ts에서 수동으로 청크 분할하지만
rollupOptions: {
  output: {
    manualChunks(id) {
      if (id.includes('node_modules')) {
        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
          return 'vendor-react';
        }
        // ...
      }
    },
  },
},

// 실제로 번들 크기가 얼마나 되는지 확인할 방법이 없음
// Visualizer 플러그인 없음
```

#### 개선
```typescript
// vite.config.ts에 추가
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      open: true,
      filename: 'dist/bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  // ...
});

// package.json에 스크립트 추가
{
  "scripts": {
    "analyze": "vite build && npm run build",
    "build:extension": "vite build --config vite.extension.config.ts"
  }
}
```

---

### 12. **Supabase 클라이언트 설정 문제**

#### 문제점
```typescript
// src/lib/supabase.ts
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// 재정의되지 않음 - 매번 새로운 인스턴스가 생성되는 건 아니지만
// 테스트하기 어려움
```

#### 개선
```typescript
// 싱글톤 패턴
let supabaseInstance: SupabaseClient | null = null;

export function initSupabase(url: string, key: string) {
  if (supabaseInstance) return supabaseInstance;
  
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}

export function getSupabase(): SupabaseClient | null {
  return supabaseInstance;
}

// main.tsx에서 초기화
import { initSupabase } from '@/src/lib/supabase';

initSupabase(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

---

## 📝 비효율적인 코드 패턴

### 1. **필요 없는 .maybeSingle() 호출**

```typescript
// 현재
const { data: existingEntry, error: existingError } = await userDb
  .from('wordbook_entries')
  .select('id, rank, meaning_snapshot')
  .eq('user_id', user.id)
  .eq('normalized_term', normalizedTerm)
  .maybeSingle();  // ← 불필요, UNIQUE 제약이 있으므로 single()으로 충분

// 개선
const { data: existingEntry, error: existingError } = await userDb
  .from('wordbook_entries')
  .select('id, rank, meaning_snapshot')
  .eq('user_id', user.id)
  .eq('normalized_term', normalizedTerm)
  .single();
```

### 2. **반복되는 Supabase 요청 패턴**

```typescript
// 현재 - Promise.all() 사용이 좋지만, 더 나을 수 있음
const [profileRes, wordsRes] = await Promise.all([
  supabase.from('profiles').select('plan_tier').eq('id', user.id).maybeSingle(),
  supabase.from('wordbook_entries').select('*').eq('user_id', user.id).order('last_seen_at', { ascending: false })
]);

// 개선 - RLS와 함께 복합 쿼리로 최소화
const { data, error } = await supabase.rpc('get_user_profile_and_words', {
  p_user_id: user.id
});
```

### 3. **콘솔 로그 과용**

```typescript
// content.tsx, background.ts에서 많은 console.log가 있음
console.error('Review submission failed', err);
console.warn('Failed to load modifier, using default:', error);

// 프로덕션에서는 제거되어야 하고, 개발 환경에서만 활성화
```

#### 개선
```typescript
// logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: any[]) => isDev && console.log(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
  error: (...args: any[]) => isDev && console.error(...args),
  debug: (...args: any[]) => isDev && console.debug(...args),
};

// 사용
logger.error('Review submission failed', err);
```

---

## 🔒 타입 안정성 문제

### 1. **Supabase 응답 타입 검증 부재**

```typescript
// 현재
const profileRes, wordsRes = await Promise.all([...]);
if (profileRes.data) {
  setPlanTier(profileRes.data.plan_tier as PlanTier);  // ❌ as 캐스트!
}
if (wordsRes.data) {
  setWords(wordsRes.data as WordbookEntry[]);  // ❌ 타입 검증 없음
}

// 개선 - 런타임 검증
function validatePlanTier(value: unknown): PlanTier {
  if (value !== 'free' && value !== 'premium') {
    throw new Error(`Invalid plan tier: ${value}`);
  }
  return value;
}

function validateWordbooks(data: unknown[]): WordbookEntry[] {
  return data.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid wordbook entry');
    const entry = item as Record<string, unknown>;
    return {
      id: String(entry.id),
      user_id: String(entry.user_id),
      term: String(entry.term),
      // ... 전체 필드 검증
    };
  });
}
```

### 2. **Chrome Extension API 타입 안전성**

```typescript
// 현재
const storage = await chrome.storage.sync.get('flow_reader_api_base_url');
const value = storage.flow_reader_api_base_url;
if (typeof value === 'string' && value.length > 0) {
  return value.replace(/\/$/, '');
}

// 개선 - 타입 가드
interface StorageSchema {
  flow_reader_api_base_url?: string;
  flow_reader_modifier?: 'alt_option' | 'cmd_ctrl';
  supabase_jwt?: string;
}

async function getStorageValue<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const data = await chrome.storage.sync.get(key);
  return data[key];
}
```

---

## 🔄 상태 관리 문제

### 1. **React Query 부재**

프로젝트에서 `react-query` 또는 `@tanstack/react-query`을 사용하지 않음.

#### 문제점
```typescript
// wordbook.tsx
useEffect(() => {
  if (!user || !supabase) {
    setIsFetching(false);
    return;
  }

  const fetchData = async () => {
    const [profileRes, wordsRes] = await Promise.all([...]);
    // 수동 에러 처리, 로딩 상태, 캐싱 모두 없음
  };

  fetchData();
}, [user]);
```

#### 개선
```typescript
// React Query 설치: npm install @tanstack/react-query

// hooks/useUserWords.ts
import { useQuery } from '@tanstack/react-query';

export function useUserWords() {
  const { user, loading } = useAuth();
  
  return useQuery({
    queryKey: ['user-words', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const [profile, words] = await Promise.all([
        supabase.from('profiles').select('plan_tier').eq('id', user.id).single(),
        supabase.from('wordbook_entries').select('*').eq('user_id', user.id),
      ]);
      return { profile: profile.data, words: words.data };
    },
    enabled: !!user && !loading,
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// wordbook.tsx에서 사용
export function WordbookPage() {
  const { data, isLoading, error } = useUserWords();
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return <WordbookDashboard {...data} />;
}
```

### 2. **Zustand 또는 Context로 전역 상태**

```typescript
// store/authStore.ts
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  planTier: PlanTier;
  setUser: (user: User | null) => void;
  setPlanTier: (tier: PlanTier) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  planTier: 'free',
  setUser: (user) => set({ user }),
  setPlanTier: (planTier) => set({ planTier }),
  logout: () => set({ user: null, planTier: 'free' }),
}));
```

---

## 🔧 API/Backend 개선사항

### 1. **라우트 조직화**

```typescript
// 현재 - 모든 라우트가 server.ts에 있음
app.post('/api/lookup', ...)
app.post('/api/lookup-event', ...)
app.post('/api/quiz-review', ...)

// 개선 - 라우터로 분리
// routes/lookup.ts
export const lookupRouter = express.Router();
lookupRouter.post('/contextual', handleLookup);
lookupRouter.post('/event', handleLookupEvent);
lookupRouter.post('/stats', getStats);

// routes/quiz.ts
export const quizRouter = express.Router();
quizRouter.post('/review', handleReview);
quizRouter.get('/progress', getProgress);

// server.ts
app.use('/api/lookup', lookupRouter);
app.use('/api/quiz', quizRouter);
```

### 2. **미들웨어 분리**

```typescript
// middleware/auth.ts
export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const jwt = extractJWT(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Missing JWT' });
  }
  
  req.user = await getSupabaseUser(jwt);  // type augmentation
  next();
}

// middleware/validation.ts
export function validateRequest(schema: zod.ZodSchema) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    req.validated = result.data;
    next();
  };
}

// routes/lookup.ts
const lookupSchema = z.object({
  term: z.string().min(1),
  context: z.string().optional(),
  meanings: z.array(z.string()).optional(),
});

lookupRouter.post(
  '/event',
  validateRequest(lookupSchema),
  authMiddleware,
  handleLookupEvent
);
```

### 3. **에러 처리 통합**

```typescript
// middleware/errorHandler.ts
export function errorHandler(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof AuthError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

app.use(errorHandler);
```

### 4. **로깅 및 모니터링**

```typescript
// middleware/logging.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export function loggingMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });
  
  next();
}

app.use(loggingMiddleware);
```

### 5. **Rate Limiting**

```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const lookupLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 30, // 분당 30개 요청
  message: 'Too many lookup requests',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/lookup/event', lookupLimiter, handleLookupEvent);
```

---

## 🎨 프론트엔드 개선사항

### 1. **Component 분해 (Split Large Components)**

#### 문제
- `WordbookDashboard`가 너무 많은 책임
- `SwipeQuiz`가 복잡한 UI 로직

#### 개선
```typescript
// components/wordbook/WordbookStats.tsx
export function WordbookStats({ total, grouped }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* 각 랭크별 통계 */}
    </div>
  );
}

// components/wordbook/WordbookFilters.tsx
export function WordbookFilters({
  selectedRanks,
  onRanksChange,
  searchTerm,
  onSearchChange,
}: Props) {
  return (
    <div className="flex gap-2">
      {/* 필터링 UI */}
    </div>
  );
}

// components/wordbook/WordbookGrid.tsx
export function WordbookGrid({ words, onWordSelect }: Props) {
  return (
    <div className="grid gap-4">
      {/* 단어 카드 표시 */}
    </div>
  );
}

// WordbookDashboard는 이들을 조합
export function WordbookDashboard({ words, planTier }: Props) {
  const [selectedRanks, setSelectedRanks] = useState<Rank[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="space-y-6">
      <WordbookStats total={words.length} />
      <WordbookFilters {...} />
      <WordbookGrid words={filteredWords} />
    </div>
  );
}
```

### 2. **Form 관리 (React Hook Form)**

```typescript
// 현재 - 수동 state 관리
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  try {
    // ...
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// 개선 - React Hook Form
import { useForm } from 'react-hook-form';

type LoginForm = {
  email: string;
  password: string;
};

export function AuthForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();
  
  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data);
      navigate('/');
    } catch (error) {
      // 에러 처리
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: true })} />
      {errors.email && <span>Email is required</span>}
      <button disabled={isSubmitting}>
        {isSubmitting ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
```

### 3. **API 호출 레이어**

```typescript
// 현재 - 직접 fetch 호출
const response = await fetch('/api/lookup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word, sentence }),
});

// 개선 - API 클라이언트
// api/client.ts
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message, response.status);
    }

    return response.json();
  }

  lookup(word: string, sentence: string) {
    return this.request('/api/lookup', {
      method: 'POST',
      body: JSON.stringify({ word, sentence }),
    });
  }

  recordLookup(data: LookupEventBody) {
    return this.request('/api/lookup-event', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  submitReview(entryId: string, action: 'know' | 'dont_know') {
    return this.request('/api/quiz-review', {
      method: 'POST',
      body: JSON.stringify({ entryId, action }),
    });
  }
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_BASE_URL);
```

### 4. **애니메이션 개선**

```typescript
// 현재 - 기본 framer-motion 사용
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={handleDragEnd}
>
  {/* 콘텐츠 */}
</motion.div>

// 개선 - 더 자연스러운 애니메이션
const variants = {
  enter: { opacity: 0, x: 100 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

<motion.div
  variants={variants}
  initial="enter"
  animate="center"
  exit="exit"
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
  {/* 콘텐츠 */}
</motion.div>
```

### 5. **반응형 디자인 개선**

```typescript
// 현재 - 모든 화면 크기에 같은 레이아웃
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

// 개선 - 모바일 우선, 더 세밀한 중단점
<div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

---

## 🔌 Chrome 확장앱 개선사항

### 1. **Content Script 재설계**

#### 현재 문제
- 약 300+ 줄의 거대한 클래스
- 여러 책임 혼합

#### 개선 계획 - 모듈식 아키텍처

```typescript
// content-script/core/EventManager.ts
class EventManager {
  private modifierMode: ModifierMode = 'alt_option';
  private listeners: Map<string, Function> = new Map();

  onModifierChange(callback: (mode: ModifierMode) => void) {
    window.addEventListener('keydown', (e) => {
      const pressed = e.metaKey || e.ctrlKey;
      this.listeners.forEach((cb) => cb(pressed));
    });
  }

  onMouseMove(callback: (e: MouseEvent) => void) {
    window.addEventListener('mousemove', callback);
  }

  destroy() {
    // 정리
  }
}

// content-script/ui/OverlayManager.ts
class OverlayManager {
  private host: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  create() {
    this.host = document.createElement('div');
    this.shadowRoot = this.host.attachShadow({ mode: 'open' });
    document.body.appendChild(this.host);
  }

  render(data: LookupData) {
    // Shadow DOM에 렌더링
  }

  show() { /* ... */ }
  hide() { /* ... */ }
  destroy() { /* ... */ }
}

// content-script/api/LookupService.ts
class LookupService {
  constructor(private apiBaseUrl: string) {}

  async lookup(term: string, context: string): Promise<LookupResult> {
    const response = await fetch(`${this.apiBaseUrl}/api/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: term, sentence: context }),
    });
    return response.json();
  }

  async recordEvent(event: LookupEventBody): Promise<void> {
    // ...
  }
}

// content-script/main.ts
class FlowReaderContentScript {
  private eventManager: EventManager;
  private overlayManager: OverlayManager;
  private lookupService: LookupService;
  private cache: LookupCache;

  async init() {
    this.eventManager = new EventManager();
    this.overlayManager = new OverlayManager();
    this.lookupService = new LookupService(apiBaseUrl);
    this.cache = new LookupCache();

    this.eventManager.onMouseMove((e) => {
      this.handleMouseMove(e);
    });
  }

  private async handleMouseMove(e: MouseEvent) {
    const term = this.getWordAtPosition(e.clientX, e.clientY);
    if (!term) return;

    const cached = this.cache.get(term);
    if (cached) {
      this.overlayManager.render({ term, meanings: cached });
      return;
    }

    const result = await this.lookupService.lookup(term, context);
    this.cache.set(term, result.meanings);
    this.overlayManager.render(result);
  }

  destroy() {
    this.eventManager.destroy();
    this.overlayManager.destroy();
  }
}
```

### 2. **백그라운드 워커 최적화**

```typescript
// 현재 - 복잡한 통신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FLOW_LOOKUP') {
    // ...
  } else if (message.type === 'FLOW_GET_MODIFIER') {
    // ...
  }
  // ...
});

// 개선 - 핸들러 맵
type MessageHandler<T = any, R = any> = (payload: T) => Promise<R>;

const handlers: Record<string, MessageHandler> = {
  FLOW_LOOKUP: handleLookup,
  FLOW_GET_MODIFIER: handleGetModifier,
  FLOW_SET_MODIFIER: handleSetModifier,
  FLOW_SET_JWT: handleSetJWT,
  FLOW_CLEAR_JWT: handleClearJWT,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = handlers[message.type];
  if (!handler) {
    sendResponse({ ok: false, error: 'Unknown message type' });
    return;
  }

  handler(message.payload)
    .then(data => sendResponse({ ok: true, data }))
    .catch(error => sendResponse({ ok: false, error: error.message }));

  return true; // Keep channel open for async response
});
```

### 3. **권한(Permissions) 최소화**

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": [
    "https://*/"
  ]
}
```

### 4. **Content Security Policy 강화**

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'sha256-...'"
  }
}
```

---

## 💡 새로운 아이디어

### 1. **AI 기반 단어 그룹화 및 추천**

```typescript
// 새로운 API 엔드포인트
app.get('/api/word-insights/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  
  // 사용자의 모든 단어 조회
  const { data: words } = await userDb
    .from('wordbook_entries')
    .select('*')
    .eq('user_id', userId);

  // AI를 사용해 단어 간 관계 및 패턴 분석
  const insights = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `
      사용자가 학습하는 단어들입니다:
      ${words.map(w => w.term).join(', ')}
      
      다음을 분석해주세요:
      1. 어휘 수준 평가
      2. 주제별 그룹화
      3. 다음 학습 추천
      4. 학습 계획 제안
      
      JSON 형식으로 반환해주세요.
    `,
  });

  res.json(JSON.parse(insights.text));
});

// 프론트엔드 - 새로운 페이지
export function WordInsightsPage() {
  const { data: insights } = useQuery({
    queryKey: ['word-insights'],
    queryFn: () => apiClient.getWordInsights(),
  });

  return (
    <div className="space-y-6">
      <VocabularyLevel level={insights.level} />
      <WordGroups groups={insights.groups} />
      <NextRecommendations items={insights.recommendations} />
      <LearningPlan plan={insights.plan} />
    </div>
  );
}
```

### 2. **곡선 기반 적응 형 복습 시스템 (Spaced Repetition)**

```typescript
// 새로운 테이블
CREATE TABLE spaced_repetition_schedule (
  id UUID PRIMARY KEY,
  wordbook_entry_id UUID REFERENCES wordbook_entries(id),
  next_review_at TIMESTAMPTZ,
  interval INTEGER DEFAULT 1, -- 일 단위
  ease_factor FLOAT DEFAULT 2.5, -- SM-2 알고리즘
  repetitions INTEGER DEFAULT 0
);

// 새로운 API 엔드포인트
app.get('/api/review-queue/:userId', authMiddleware, async (req, res) => {
  const { data: dueWords } = await userDb
    .from('spaced_repetition_schedule')
    .select('wordbook_entries(*)')
    .eq('user_id', req.params.userId)
    .lte('next_review_at', new Date())
    .order('next_review_at', { ascending: true })
    .limit(20);

  res.json(dueWords);
});

// SM-2 알고리즘 구현
function updateSchedule(
  quality: 0 | 1 | 2 | 3 | 4 | 5, // 0-5 점수
  previousInterval: number,
  previousEaseFactor: number,
) {
  const newEaseFactor = Math.max(
    1.3,
    previousEaseFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const newInterval = quality < 3
    ? 1
    : previousInterval === 1
    ? 3
    : Math.round(previousInterval * newEaseFactor);

  return { newInterval, newEaseFactor };
}
```

### 3. **멀티 언어 지원**

```typescript
// i18n 설정
// locales/ko.json
{
  "nav.home": "홈",
  "nav.wordbook": "단어장",
  "button.login": "로그인",
  "wordbook.empty": "아직 조회한 단어가 없습니다"
}

// locales/en.json
{
  "nav.home": "Home",
  "nav.wordbook": "Wordbook",
  "button.login": "Login",
  "wordbook.empty": "No words yet"
}

// hooks/useI18n.ts
import i18n from 'i18next';

export function useI18n() {
  const { t } = useTranslation();
  return { t };
}

// 컴포넌트에서 사용
export function Header() {
  const { t } = useI18n();
  return <h1>{t('nav.home')}</h1>;
}
```

### 4. **소셜 학습 기능**

```typescript
// 새로운 테이블
CREATE TABLE user_follows (
  follower_id UUID REFERENCES auth.users(id),
  following_id UUID REFERENCES auth.users(id),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE shared_wordbooks (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id),
  name TEXT,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE shared_wordbook_entries (
  id UUID PRIMARY KEY,
  shared_wordbook_id UUID REFERENCES shared_wordbooks(id),
  wordbook_entry_id UUID REFERENCES wordbook_entries(id)
);

// 새로운 페이지: 공개 단어장 탐색
export function CommunityPage() {
  const { data: publicWordbooks } = useQuery({
    queryKey: ['public-wordbooks'],
    queryFn: () => apiClient.getPublicWordbooks(),
  });

  return (
    <div className="grid gap-4">
      {publicWordbooks.map(wb => (
        <WordbookCard
          key={wb.id}
          wordbook={wb}
          onFollow={() => apiClient.followUser(wb.creator_id)}
          onImport={() => apiClient.importWordbook(wb.id)}
        />
      ))}
    </div>
  );
}
```

### 5. **통계 및 분석 대시보드**

```typescript
// 새로운 API
app.get('/api/analytics/dashboard/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;

  const [totalWords, wordsByRank, lookupTrend, topTerms] = await Promise.all([
    userDb.from('wordbook_entries').select('*', { count: 'exact' }).eq('user_id', userId),
    // 랭크별 단어 수
    // 조회 추세 (일주일 기준)
    // 가장 많이 조회된 단어
  ]);

  res.json({
    totalWords: totalWords.count,
    wordsByRank: {
      red: 10,
      orange: 20,
      yellow: 30,
      // ...
    },
    lookupTrend: [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 8 },
      // ...
    ],
    topTerms: ['example', 'learning', 'analyze'],
  });
});

// 프론트엔드 - 차트 라이브러리 추가 (recharts, visx)
import { LineChart, Line } from 'recharts';

export function AnalyticsDashboard() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiClient.getAnalytics(),
  });

  return (
    <div className="space-y-6">
      <StatCard label="Total Words" value={analytics.totalWords} />
      <RankDistribution data={analytics.wordsByRank} />
      <LineChart data={analytics.lookupTrend}>
        <Line type="monotone" dataKey="count" />
      </LineChart>
      <TopTermsTable terms={analytics.topTerms} />
    </div>
  );
}
```

### 6. **음성/음성 인식 기능**

```typescript
// 새로운 페이지: 발음 연습
export function PronunciationPage() {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = async (e) => {
      const audioBlob = e.data;
      const result = await apiClient.analyzePronunciation(audioBlob);
      // 발음 피드백 표시
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <AudioPlayer word={currentWord} />
      <button onClick={startRecording}>
        {isRecording ? 'Recording...' : 'Start Recording'}
      </button>
      <PronunciationFeedback score={pronunciationScore} />
    </div>
  );
}
```

### 7. **오프라인 지원**

```typescript
// IndexedDB를 사용한 로컬 동기화
// lib/storage/indexedDb.ts
class IndexedDBStorage {
  private db: IDBDatabase;

  async init() {
    const request = indexedDB.open('flowreader', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('wordbook_entries')) {
        db.createObjectStore('wordbook_entries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('lookup_events')) {
        db.createObjectStore('lookup_events', { keyPath: 'id' });
      }
    };

    return new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveForSync(key: string, data: any) {
    const tx = this.db.transaction('lookup_events', 'readwrite');
    tx.objectStore('lookup_events').add({
      id: crypto.randomUUID(),
      key,
      data,
      synced: false,
      timestamp: Date.now(),
    });
  }

  async getSyncQueue() {
    return new Promise((resolve) => {
      const tx = this.db.transaction('lookup_events', 'readonly');
      const store = tx.objectStore('lookup_events');
      const index = store.index('synced');
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// Service Worker에서 배경 동기화
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-lookups') {
    event.waitUntil(syncLookupEvents());
  }
});

async function syncLookupEvents() {
  const queue = await idb.getSyncQueue();
  for (const event of queue) {
    try {
      await apiClient.recordLookup(event.data);
      await idb.markAsSynced(event.id);
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  }
}
```

### 8. **다크 테마 지원**

```typescript
// hooks/useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // 시스템 설정 감지
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return theme;
}

// 사용 - Tailwind 커스터마이징
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ...
      },
    },
  },
};

// App.tsx
export default function App() {
  const theme = useTheme();
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      {/* 앱 콘텐츠 */}
    </div>
  );
}
```

---

## ⚡ 성능 최적화

### 1. **렌더링 최적화**

```typescript
// 현재 - 불필요한 리렌더링 가능성
export function WordbookList({ words, planTier }: Props) {
  const grouped = groupWords(words);  // ← 매번 새로운 객체 생성
  const orderedRanks = ...;  // ← 동일한 계산 반복

  return (
    {orderedRanks.map(rank => (
      <article key={rank}>
        {grouped[rank].map(item => (
          <WordCard key={item.id} item={item} />  // ← 부모 리렌더링 시 리렌더링
        ))}
      </article>
    ))}
  );
}

// 개선 - useMemo와 React.memo 적용
export const WordbookList = React.memo(function WordbookList({ words, planTier }: Props) {
  const grouped = useMemo(() => groupWords(words), [words]);
  const orderedRanks = useMemo(
    () => Object.keys(grouped).sort((a, b) => rankOrderValue(a) - rankOrderValue(b)),
    [grouped]
  );

  return (
    {orderedRanks.map(rank => (
      <RankGroup key={rank} rank={rank} items={grouped[rank]} />
    ))}
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.planTier === nextProps.planTier &&
    prevProps.words === nextProps.words
  );
});

export const WordCard = React.memo(({ item }: { item: WordbookEntry }) => (
  <div className="...">
    {/* 카드 내용 */}
  </div>
));
```

### 2. **무한 스크롤 구현**

```typescript
// react-intersection-observer 사용
import { useInView } from 'react-intersection-observer';

export function WordbookListWithInfiniteScroll() {
  const [page, setPage] = useState(1);
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['words'],
    queryFn: ({ pageParam = 1 }) => apiClient.getWords({ page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView]);

  return (
    <>
      {data?.pages.map((page) =>
        page.words.map((word) => <WordCard key={word.id} word={word} />)
      )}
      <div ref={ref}>
        {isFetchingNextPage ? 'Loading more...' : 'End of list'}
      </div>
    </>
  );
}
```

### 3. **네트워크 성능**

```typescript
// 현재 - 모든 단어를 한 번에 로드
supabase.from('wordbook_entries').select('*')

// 개선 - 필요한 필드만, 페이지네이션
supabase
  .from('wordbook_entries')
  .select('id, term, rank, total_lookup_count')  // 필수 필드만
  .eq('user_id', userId)
  .order('last_seen_at', { ascending: false })
  .range(0, 19)  // 페이지당 20개

// 또는 GraphQL 사용 (성능 향상)
query GetWordbook($userId: UUID!, $limit: Int = 20, $offset: Int = 0) {
  wordbook_entries(
    where: { user_id: { _eq: $userId } }
    order_by: { last_seen_at: desc }
    limit: $limit
    offset: $offset
  ) {
    id
    term
    rank
    total_lookup_count
  }
}
```

### 4. **이미지/에셋 최적화**

```typescript
// 현재 - 압축 없음
<img src="/logo.png" alt="Logo" />

// 개선 - 최적화된 포맷
<picture>
  <source srcSet="/logo.webp" type="image/webp" />
  <source srcSet="/logo.png" type="image/png" />
  <img
    src="/logo.png"
    alt="Logo"
    loading="lazy"
    decoding="async"
    width={32}
    height={32}
  />
</picture>
```

### 5. **코드 스플리팅**

```typescript
// 현재 - 모든 라우트 한 번에 로드
import HomePage from '@/pages/home';
import WordbookPage from '@/pages/wordbook';

// 개선 - 동적 임포트
const HomePage = lazy(() => import('@/pages/home'));
const WordbookPage = lazy(() => import('@/pages/wordbook'));
const SetupPage = lazy(() => import('@/pages/setup'));
const AuthPage = lazy(() => import('@/pages/auth'));

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/wordbook" element={<WordbookPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </Suspense>
  );
}
```

---

## 📊 리팩토링 우선순위

### Phase 1: 기본 구조 (1-2주)
1. Content script 모듈화
2. 중복 코드 제거 (rankFromCount 통일)
3. 에러 처리 표준화
4. API 응답 형식 통일

### Phase 2: 상태 관리 (1주)
1. React Query 도입
2. Zustand/Context API 설정
3. Chrome Storage 추상화

### Phase 3: 기능 개선 (2주)
1. 폼 관리 (React Hook Form)
2. 로깅 및 모니터링
3. Rate limiting

### Phase 4: 새로운 기능 (3주+)
1. Spaced Repetition
2. 워드 인사이트/분석
3. 소셜 기능

---

## 🎯 요약

**주요 문제점:**
- Content script 과정 복잡
- 코드 중복 (rank, error handling)
- 타입 안정성 부족
- 에러 처리 미흡
- 상태 관리 분산

**즉시 개선 가능:**
1. 중복 코드 제거
2. 에러 처리 통합
3. API 응답 형식 통일
4. 타입 강화

**장기적 개선:**
1. 아키텍처 재설계
2. 상태 관리 라이브러리
3. 새로운 기능 추가
4. 성능 최적화

---

**이 보고서는 Codex가 효율적으로 리팩토링을 진행할 수 있도록 작성되었습니다.**
**각 섹션은 구체적인 코드 예제와 함께 개선 방안을 제시하고 있습니다.**
