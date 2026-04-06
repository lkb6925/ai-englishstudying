export const extensionStorageKeys = {
  apiBaseUrl: 'flow_reader_api_base_url',
  modifier: 'flow_reader_modifier',
  jwt: 'supabase_jwt',
  guestStats: 'flow_reader_guest_stats',
} as const;

export type StorageArea =
  | typeof chrome.storage.local
  | typeof chrome.storage.session
  | typeof chrome.storage.sync;

export async function readStorageValue<T>(
  area: StorageArea,
  key: string,
): Promise<T | null> {
  const values = await area.get(key);
  return (values[key] as T | undefined) ?? null;
}

export async function writeStorageValue<T>(
  area: StorageArea,
  key: string,
  value: T,
): Promise<void> {
  await area.set({ [key]: value });
}

export async function removeStorageValue(
  area: StorageArea,
  key: string,
): Promise<void> {
  await area.remove(key);
}
