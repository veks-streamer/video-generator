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
export async function searchVideos(
  query: string,
  apiKey: string,
  targetDuration: number,
): Promise<VideoClip[]> {
  const avgClip = 8;
  const needed = Math.ceil(targetDuration / avgClip) + 3;
  const perPage = Math.min(Math.max(needed * 2, 15), 80);

  const res = await fetch(
    `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&size=medium`,
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
  if (!data.videos?.length) {
    throw new Error(`No clips found for "${query}". Try a different theme or search term.`);
  }

  return data.videos
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

/** Pick a shuffled subset of clips that roughly fills the target duration. */
export function selectClips(
  clips: VideoClip[],
  targetDuration: number,
  perClipCap = 6,
): VideoClip[] {
  const shuffled = [...clips].sort(() => Math.random() - 0.5);
  const selected: VideoClip[] = [];
  let total = 0;
  for (const clip of shuffled) {
    if (total >= targetDuration) break;
    if (selected.some((c) => c.id === clip.id)) continue;
    selected.push(clip);
    total += Math.min(clip.duration, perClipCap);
  }
  return selected;
}
