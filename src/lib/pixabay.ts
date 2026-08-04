import type { VideoClip } from "./constants";

// Pixabay video search. Pixabay content is royalty-free for commercial use with
// no attribution required (Pixabay Content License). NOTE: the API does not
// expose framerate, so Pixabay clips are re-encoded to the chosen fps in
// Standard mode (they can't be used in Fast mode, which needs native fps).

const BASE = "https://pixabay.com/api/videos/";

interface PixVid { url: string; width: number; height: number }
interface PixHit {
  id: number;
  duration: number;
  videos: Record<string, PixVid>;
  user: string;
}

function pickSize(videos: Record<string, PixVid>, targetW: number, targetH: number): PixVid | null {
  const sizes = Object.values(videos).filter((v) => v.url && v.width && v.height);
  if (sizes.length === 0) return null;
  const atLeast = sizes.filter((v) => v.width >= targetW && v.height >= targetH).sort((a, b) => a.width * a.height - b.width * b.height);
  if (atLeast.length) return atLeast[0];
  return [...sizes].sort((a, b) => b.width * b.height - a.width * a.height)[0];
}

export async function searchPixabay(
  query: string,
  apiKey: string,
  targetDuration: number,
  page = 1,
  targetFps = 30,
  targetWidth = 1280,
  targetHeight = 720,
): Promise<VideoClip[]> {
  const needed = Math.ceil(targetDuration / 5) + 3;
  const clips: VideoClip[] = [];

  for (let i = 0; i < 3; i++) {
    const p = ((page - 1 + i) % 50) + 1;
    const url = `${BASE}?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&per_page=80&page=${p}&safesearch=true`;
    const res = await fetch(url);
    if (res.status === 400 || res.status === 401 || res.status === 429) {
      throw new Error(`Pixabay error ${res.status} — check the API key in Settings (or rate limit).`);
    }
    if (!res.ok) throw new Error(`Pixabay API error: ${res.status}`);
    const data = await res.json();
    const hits: PixHit[] = data.hits ?? [];
    if (hits.length === 0) break;
    for (const h of hits) {
      if (h.duration < 3) continue;
      const v = pickSize(h.videos, targetWidth, targetHeight);
      if (!v) continue;
      if (clips.some((c) => c.id === h.id)) continue;
      clips.push({
        id: h.id,
        duration: h.duration,
        width: v.width,
        height: v.height,
        fps: targetFps,     // unknown → will be re-encoded to target fps
        nativeFps: false,
        url: v.url,
        thumbnail: "",
        videographer: h.user ?? "Pixabay",
      });
    }
    if (clips.length >= needed * 2) break;
  }

  if (clips.length === 0) {
    throw new Error(`No “${query}” clips on Pixabay at ${targetWidth}×${targetHeight}. Try another theme, quality, or Pexels.`);
  }
  return clips;
}
