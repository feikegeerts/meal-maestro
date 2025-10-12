export interface StorageSaveOptions {
  ttlMs?: number;
  version?: number;
}

type StoredPayload<T> = {
  v?: number;
  t?: number; // saved at (ms since epoch)
  d: T;
};

export function saveWithTTL<T>(key: string, data: T, opts: StorageSaveOptions = {}): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPayload<T> = { v: opts.version, t: Date.now(), d: data };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore quota or serialization errors silently
    // console.warn('saveWithTTL failed', e);
  }
}

export function loadWithTTL<T>(key: string, opts: StorageSaveOptions = {}): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw) as StoredPayload<T>;
    if (opts.version != null && payload.v != null && payload.v !== opts.version) {
      return null;
    }
    if (opts.ttlMs != null && payload.t != null) {
      if (Date.now() - payload.t > opts.ttlMs) {
        sessionStorage.removeItem(key);
        return null;
      }
    }
    return payload.d;
  } catch {
    return null;
  }
}

export function removeStored(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
