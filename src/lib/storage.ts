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
