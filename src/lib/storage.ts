const PEXELS_KEY = "vg.pexelsApiKey";

export function getPexelsKey(): string {
  try {
    return localStorage.getItem(PEXELS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPexelsKey(key: string): void {
  try {
    if (key) localStorage.setItem(PEXELS_KEY, key.trim());
    else localStorage.removeItem(PEXELS_KEY);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function hasPexelsKey(): boolean {
  return getPexelsKey().length > 0;
}

// ---- de-duplication across generations ----
const USED_KEY = "vg.usedClipIds";
const PAGE_KEY = "vg.queryPages";
const USED_CAP = 400; // remember the last N clip ids; older ones may recur

export function getUsedClipIds(): Set<number> {
  try {
    const raw = localStorage.getItem(USED_KEY);
    return new Set<number>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<number>();
  }
}

export function addUsedClipIds(ids: number[]): void {
  try {
    const cur = getUsedClipIds();
    for (const id of ids) cur.add(id);
    let arr = Array.from(cur);
    if (arr.length > USED_CAP) arr = arr.slice(arr.length - USED_CAP);
    localStorage.setItem(USED_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export function clearUsedClipIds(): void {
  try {
    localStorage.removeItem(USED_KEY);
  } catch {
    /* ignore */
  }
}

/** Round-robin the Pexels result page per query so repeats pull fresh clips. */
export function nextQueryPage(query: string): number {
  const key = query.toLowerCase().trim();
  try {
    const raw = localStorage.getItem(PAGE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const next = (map[key] ?? Math.floor(Math.random() * 3)) + 1;
    map[key] = next > 12 ? 1 : next; // wrap so we don't page into the void
    localStorage.setItem(PAGE_KEY, JSON.stringify(map));
    return map[key];
  } catch {
    return 1 + Math.floor(Math.random() * 3);
  }
}
