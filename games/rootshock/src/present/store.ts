/* The browser's local storage, which can be missing, full or refused (a private window, a blocked site): every use
   is allowed to fail quietly. */

export function readStore(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** null removes it */
export function writeStore(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* nowhere to keep it */ }
}
