export type Rank = 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'master';

export type PlanTier = 'free' | 'premium';

export type LookupResponse = {
  lemma: string;
  contextual_meanings: [string, ...string[]];
};

export type LookupEventInsert = {
  term: string;
  normalized_term: string;
  context: string;
  source_domain: string;
  source_path_hash: string;
};

export type WordbookEntry = {
  id: string;
  user_id: string;
  term: string;
  normalized_term: string;
  context_sample: string;
  total_lookup_count: number;
  rank: Rank;
  last_seen_at: string;
  created_at: string;
};

export type LookupEventResult = {
  persisted: boolean;
  reason?: 'unauthorized' | 'excluded_domain';
  totalLookupCount: number;
  promoted: boolean;
  planTier: PlanTier | null;
};
