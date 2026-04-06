export type CachedLookup = {
  meanings: string[];
  expiresAt: number;
};

type CacheRecord = {
  storageKey: string;
  entry: CachedLookup;
};

export class LocalStorageLookupCache {
  constructor(
    private readonly storageKeyPrefix = 'flow-reader:ext:',
    private readonly maxEntries = 100,
  ) {}

  get(key: string): CachedLookup | null {
    const storageKey = this.getStorageKey(key);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as CachedLookup;
      if (!Array.isArray(parsed.meanings) || typeof parsed.expiresAt !== 'number') {
        window.localStorage.removeItem(storageKey);
        return null;
      }

      if (parsed.expiresAt < Date.now()) {
        window.localStorage.removeItem(storageKey);
        return null;
      }

      return parsed;
    } catch {
      window.localStorage.removeItem(storageKey);
      return null;
    }
  }

  set(key: string, value: CachedLookup) {
    try {
      this.pruneExpiredEntries();
      this.trimToCapacity();
      window.localStorage.setItem(this.getStorageKey(key), JSON.stringify(value));
    } catch {
      // localStorage full or unavailable
    }
  }

  private getStorageKey(key: string): string {
    return `${this.storageKeyPrefix}${key}`;
  }

  private collectRecords(): CacheRecord[] {
    const records: CacheRecord[] = [];
    const storageKeys: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const storageKey = window.localStorage.key(index);
      if (!storageKey || !storageKey.startsWith(this.storageKeyPrefix)) {
        continue;
      }
      storageKeys.push(storageKey);
    }

    for (const storageKey of storageKeys) {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        continue;
      }

      try {
        const entry = JSON.parse(raw) as CachedLookup;
        if (!Array.isArray(entry.meanings) || typeof entry.expiresAt !== 'number') {
          window.localStorage.removeItem(storageKey);
          continue;
        }
        records.push({ storageKey, entry });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    return records;
  }

  private pruneExpiredEntries() {
    const now = Date.now();

    for (const record of this.collectRecords()) {
      if (record.entry.expiresAt < now) {
        window.localStorage.removeItem(record.storageKey);
      }
    }
  }

  private trimToCapacity() {
    const records = this.collectRecords().sort(
      (left, right) => left.entry.expiresAt - right.entry.expiresAt,
    );

    while (records.length >= this.maxEntries) {
      const oldest = records.shift();
      if (!oldest) {
        return;
      }

      window.localStorage.removeItem(oldest.storageKey);
    }
  }
}
