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
interface PexelsSearchResponse { videos: PexelsVideo[] }

async function fetchPage(query: string, apiKey: string, page: number): Promise<PexelsVideo[]> {
  const res = await fetch(
    `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=80&page=${page}&size=large`,
    { headers: { Authorization: apiKey } },
  );
  if (res.status === 401) throw new Error("Pexels rejected the API key (401). Check it in Settings.");
  if (res.status === 429) throw new Error("Pexels rate limit reached (429). Try again shortly.");
  if (!res.ok) throw new Error(`Pexels API error: ${res.status}`);
  const data: PexelsSearchResponse = await res.json();
  return data.videos ?? [];
}

/**
 * STRICT file selection. Only returns a file that:
 *   - is mp4
 *   - has EXACTLY the requested fps (native — no fps conversion, ever)
 *   - is >= the target resolution in BOTH width and height (so we only ever
 *     downscale, never upscale)
 * Among valid files it takes the smallest one that still covers the target
 * (cleanest downscale). Returns null when the clip has no qualifying file, in
 * which case the clip is skipped entirely.
 */
function pickStrictFile(
  v: PexelsVideo,
  targetFps: number,
  targetW: number,
  targetH: number,
): { url: string; width: number; height: number; fps: number } | null {
  const valid = v.video_files.filter(
    (f) =>
      f.file_type === "video/mp4" &&
      f.link &&
      f.width && f.height && f.fps != null &&
      Math.round(f.fps) === targetFps &&
      f.width >= targetW &&
      f.height >= targetH,
  );
  if (valid.length === 0) return null;
  valid.sort((a, b) => (a.width! * a.height!) - (b.width! * b.height!));
  const f = valid[0];
  return { url: f.link, width: f.width!, height: f.height!, fps: Math.round(f.fps!) };
}

export async function searchVideos(
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
  let scanned = 0;

  // Scan up to 4 pages (rotating from `page`) to find enough strictly-matching clips.
  for (let i = 0; i < 4; i++) {
    const pnum = ((page - 1 + i) % 100) + 1;
    const videos = await fetchPage(query, apiKey, pnum);
    if (videos.length === 0) break;
    scanned += videos.length;
    for (const v of videos) {
      if (v.duration < 4 || v.duration > 25) continue;
      const f = pickStrictFile(v, targetFps, targetWidth, targetHeight);
      if (!f) continue;
      if (clips.some((c) => c.id === v.id)) continue;
      clips.push({
        id: v.id,
        duration: v.duration,
        width: f.width,
        height: f.height,
        fps: f.fps,
        nativeFps: true,
        url: f.url,
        thumbnail: v.image,
        videographer: v.user?.name ?? "Pexels",
      });
    }
    if (clips.length >= needed * 2) break;
  }

  if (clips.length === 0) {
    throw new Error(
      `No “${query}” clips available at ${targetWidth}×${targetHeight} @ ${targetFps}fps. ` +
        `Pexels doesn't have enough source footage at that exact framerate/resolution — ` +
        `try a lower framerate (e.g. 30fps), lower quality, or another theme.`,
    );
  }
  return clips;
}

/**
 * Pick a shuffled subset that fills the target duration, preferring clips not
 * used in previous videos. All candidates already match fps/resolution strictly.
 */
export function selectClips(
  clips: VideoClip[],
  targetDuration: number,
  perClipCap = 6,
  exclude?: Set<number>,
): VideoClip[] {
  const shuffled = [...clips].sort(() => Math.random() - 0.5);
  const ordered = exclude
    ? [...shuffled.filter((c) => !exclude.has(c.id)), ...shuffled.filter((c) => exclude.has(c.id))]
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
