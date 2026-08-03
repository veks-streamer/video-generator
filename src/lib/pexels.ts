import type { VideoClip } from "./constants";

const BASE_URL = "https://api.pexels.com/videos";

interface PexelsVideoFile {
  quality: string;
  file_type: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  link: string;
}

interface PexelsVideo {
  id: number;
  duration: number;
  width: number;
  height: number;
  image: string;
  video_files: PexelsVideoFile[];
  user: { name: string };
}

interface PexelsSearchResponse {
  videos: PexelsVideo[];
}

async function fetchPage(query: string, apiKey: string, page: number): Promise<PexelsVideo[]> {
  const res = await fetch(
    `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=80&page=${page}&orientation=landscape&size=medium`,
    { headers: { Authorization: apiKey } },
  );
  if (res.status === 401) throw new Error("Pexels rejected the API key (401). Check it in Settings.");
  if (res.status === 429) throw new Error("Pexels rate limit reached (429). Try again shortly.");
  if (!res.ok) throw new Error(`Pexels API error: ${res.status}`);
  const data: PexelsSearchResponse = await res.json();
  return data.videos ?? [];
}

/**
 * Pick the best mp4 file for a clip given the target fps and target width.
 * Preference order:
 *   1. files whose fps matches the target (native fps — no fps conversion)
 *   2. among those, the smallest file that is still >= target width
 *      (so we always downscale, never upscale)
 * Falls back to the closest-fps / largest file if nothing native is available.
 */
function pickFile(
  v: PexelsVideo,
  targetFps: number,
  targetWidth: number,
): { url: string; width: number; height: number; fps: number; nativeFps: boolean } | null {
  const files = v.video_files.filter((f) => f.file_type === "video/mp4" && f.link && f.width && f.height);
  if (files.length === 0) return null;

  const fpsOf = (f: PexelsVideoFile) => Math.round(f.fps ?? 30);
  const native = files.filter((f) => fpsOf(f) === targetFps);

  const chooseByWidth = (pool: PexelsVideoFile[]) => {
    const atLeast = pool
      .filter((f) => (f.width ?? 0) >= targetWidth)
      .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
    if (atLeast.length) return atLeast[0]; // smallest that still covers target → clean downscale
    return [...pool].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]; // largest available
  };

  if (native.length) {
    const f = chooseByWidth(native);
    return { url: f.link, width: f.width!, height: f.height!, fps: fpsOf(f), nativeFps: true };
  }
  // no native-fps file: take the closest fps, largest resolution
  const f = chooseByWidth(files);
  return { url: f.link, width: f.width!, height: f.height!, fps: fpsOf(f), nativeFps: false };
}

export async function searchVideos(
  query: string,
  apiKey: string,
  _targetDuration: number,
  page = 1,
  targetFps = 30,
  targetWidth = 1280,
): Promise<VideoClip[]> {
  let videos = await fetchPage(query, apiKey, page);
  if (videos.length === 0 && page > 1) videos = await fetchPage(query, apiKey, 1);
  if (videos.length === 0) {
    throw new Error(`No clips found for "${query}". Try a different theme or search term.`);
  }

  const clips: VideoClip[] = [];
  for (const v of videos) {
    if (v.duration < 4 || v.duration > 25) continue;
    const f = pickFile(v, targetFps, targetWidth);
    if (!f) continue;
    clips.push({
      id: v.id,
      duration: v.duration,
      width: f.width,
      height: f.height,
      fps: f.fps,
      nativeFps: f.nativeFps,
      url: f.url,
      thumbnail: v.image,
      videographer: v.user?.name ?? "Pexels",
    });
  }
  return clips;
}

/**
 * Pick a shuffled subset that fills the target duration. Prefers:
 *   1. native-fps clips (so no fps conversion is needed)
 *   2. clips not used in previous videos (avoid repeats across a batch)
 * Only falls back to non-native / already-used clips when there aren't enough.
 */
export function selectClips(
  clips: VideoClip[],
  targetDuration: number,
  perClipCap = 6,
  exclude?: Set<number>,
): VideoClip[] {
  const shuffled = [...clips].sort(() => Math.random() - 0.5);
  const rank = (c: VideoClip) =>
    (c.nativeFps ? 0 : 2) + (exclude?.has(c.id) ? 1 : 0); // lower is better
  const ordered = shuffled.sort((a, b) => rank(a) - rank(b));

  const selected: VideoClip[] = [];
  let total = 0;
  for (const clip of ordered) {
    if (total >= targetDuration) break;
    if (selected.some((c) => c.id === clip.id)) continue;
    selected.push(clip);
    total += Math.min(clip.duration, perClipCap);
  }
  return selected;
}
