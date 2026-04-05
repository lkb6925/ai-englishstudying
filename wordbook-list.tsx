import { rankOrderValue } from '@/src/lib/rank';
import type { PlanTier, Rank, WordbookEntry } from '@/src/lib/types';
import { Lock } from 'lucide-react';

type GroupedWords = Record<Rank, WordbookEntry[]>;

type WordbookListProps = {
  words: WordbookEntry[];
  planTier: PlanTier;
};

const rankMeta: Record<Rank, { label: string; color: string; bg: string; border: string }> = {
  red:    { label: '🔴 위험', color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  orange: { label: '🟠 주의', color: '#fdba74', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
  yellow: { label: '🟡 관심', color: '#fde68a', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  green:  { label: '🟢 안정', color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  blue:   { label: '🔵 신규', color: '#93c5fd', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' },
  master: { label: '⭐ 마스터', color: '#d4d4d8', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' },
};

function groupWords(words: WordbookEntry[]): GroupedWords {
  const base: GroupedWords = { red: [], orange: [], yellow: [], green: [], blue: [], master: [] };
  for (const word of words) base[word.rank].push(word);
  return base;
}

export function WordbookList({ words, planTier }: WordbookListProps) {
  const grouped = groupWords(words);
  const orderedRanks = (Object.keys(grouped) as Rank[]).sort(
    (a, b) => rankOrderValue(a) - rankOrderValue(b),
  );

  if (words.length === 0) {
    return (
      <div className="rounded-3xl p-16 text-center" style={{
        background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)'
      }}>
        <div className="text-5xl mb-4">📖</div>
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>아직 단어가 없어요</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          확장앱을 설치하고 영어 페이지에서 단어를 조회하면<br />자동으로 여기 추가됩니다.
        </p>
      </div>
    );
  }

  return (
    <section className="relative rounded-3xl overflow-hidden" style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
    }}>
      <div className="p-8">
        <h2 className="mb-8 text-2xl font-black" style={{ color: 'var(--text-primary)' }}>내 단어장</h2>

        <div className={`space-y-10 ${planTier === 'free' ? 'pointer-events-none blur-sm select-none' : ''}`}>
          {orderedRanks.map((rank) => {
            const items = grouped[rank];
            if (items.length === 0) return null;
            const meta = rankMeta[rank];

            return (
              <article key={rank}>
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="text-base font-bold" style={{ color: meta.color }}>{meta.label}</h3>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                    {items.length}개
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <div key={item.id}
                      className="rounded-2xl p-4 transition-all hover:scale-[1.02]"
                      style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                      <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{item.term}</p>
                      <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{item.context_sample}</p>
                      <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <span>조회 {item.total_lookup_count}회</span>
                        <span>{new Date(item.last_seen_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Free tier overlay */}
      {planTier === 'free' && (
        <div className="absolute inset-0 flex items-center justify-center" style={{
          background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(4px)'
        }}>
          <div className="mx-4 max-w-sm rounded-3xl p-8 text-center" style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)'
          }}>
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Lock className="h-7 w-7" style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="mb-2 text-xl font-black" style={{ color: 'var(--text-primary)' }}>단어장 잠금</h3>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Premium으로 업그레이드하면 모든 단어와 상세 분석을 볼 수 있어요.
            </p>
            <button
              className="w-full rounded-2xl px-6 py-3 font-bold transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}
            >
              Premium 시작하기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
