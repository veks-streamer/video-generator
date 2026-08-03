import type { VideoClip } from "./constants";

const BASE_URL = "https://api.pexels.com/videos";

interface PexelsVideoFile {
  quality: string;
  file_type: string;
  width: number | null;
  height: number | null;
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

/**
 * Search Pexels for landscape/portrait clips matching a query.
 * Runs entirely in the browser using the user's own API key.
 */
async function fetchPage(
  query: string,
  apiKey: string,
  page: number,
): Promise<PexelsVideo[]> {
  // Max pool per page for variety; pagination gives us fresh clips on repeats.
  const res = await fetch(
    `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=80&page=${page}&size=medium`,
    { headers: { Authorization: apiKey } },
  );

  if (res.status === 401) {
    throw new Error("Pexels rejected the API key (401). Check it in Settings.");
  }
  if (res.status === 429) {
    throw new Error("Pexels rate limit reached (429). Try again in a little while.");
  }
  if (!res.ok) {
    throw new Error(`Pexels API error: ${res.status}`);
  }

  const data: PexelsSearchResponse = await res.json();
  return data.videos ?? [];
}

export async function searchVideos(
  query: string,
  apiKey: string,
  _targetDuration: number,
  page = 1,
): Promise<VideoClip[]> {
  let videos = await fetchPage(query, apiKey, page);
  // If we paged past the end, fall back to page 1 so we still get results.
  if (videos.length === 0 && page > 1) {
    videos = await fetchPage(query, apiKey, 1);
  }
  if (videos.length === 0) {
    throw new Error(`No clips found for "${query}". Try a different theme or search term.`);
  }

  return videos
    .filter((v) => v.duration >= 4 && v.duration <= 25)
    .map((v) => {
      // Prefer a compact SD/HD file (~640-1280 wide) to keep browser
      // encoding fast; fall back to whatever is available.
      const files = [...v.video_files].sort(
        (a, b) => (a.width ?? 0) - (b.width ?? 0),
      );
      const pick =
        files.find((f) => (f.width ?? 0) >= 960 && (f.width ?? 0) <= 1280) ??
        files.find((f) => (f.width ?? 0) >= 640) ??
        files[files.length - 1];
      return {
        id: v.id,
        duration: v.duration,
        width: pick?.width ?? v.width,
        height: pick?.height ?? v.height,
        url: pick?.link ?? "",
        thumbnail: v.image,
        videographer: v.user?.name ?? "Pexels",
      };
    })
    .filter((c) => c.url);
}

/**
 * Pick a shuffled subset of clips that roughly fills the target duration.
 * Clips whose id is in `exclude` (already used in previous videos) are pushed
 * to the back, so fresh clips are always preferred and repeats only happen
 * when there simply aren't enough new clips to fill the duration.
 */
export function selectClips(
  clips: VideoClip[],
  targetDuration: number,
  perClipCap = 6,
  exclude?: Set<number>,
): VideoClip[] {
  const shuffled = [...clips].sort(() => Math.random() - 0.5);
  const ordered = exclude
    ? [
        ...shuffled.filter((c) => !exclude.has(c.id)),
        ...shuffled.filter((c) => exclude.has(c.id)),
      ]
    : shuffled;

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
