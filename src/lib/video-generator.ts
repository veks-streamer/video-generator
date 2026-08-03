import { FFmpeg } from "@ffmpeg/ffmpeg";
import type { VideoClip, ProgressUpdate } from "./constants";
import { SHORT_SHA } from "../version";

// Core files are hosted alongside the app (same-origin) so we avoid any
// cross-origin-isolation / SharedArrayBuffer requirements. This is the
// single-threaded build of ffmpeg.wasm, which runs fine on GitHub Pages.
const CORE_BASE = `${import.meta.env.BASE_URL}ffmpeg`;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

// Ring buffer of the most recent ffmpeg log lines, surfaced on error so
// failures are actually diagnosable in the UI/console.
const recentLogs: string[] = [];
function pushLog(line: string) {
  recentLogs.push(line);
  if (recentLogs.length > 25) recentLogs.shift();
}
export function getRecentFfmpegLog(): string {
  return recentLogs.slice(-8).join("\n");
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const instance = new FFmpeg();
      instance.on("log", ({ message }) => pushLog(message));
      // @ffmpeg/ffmpeg spawns a *module* worker, so it loads the core via
      // dynamic import(). That requires the ESM core (which has a default
      // export) served same-origin — NOT the UMD build.
      // Cache-bust the unhashed core files so a new deploy never serves a
      // stale engine from the browser cache.
      const v = `?v=${SHORT_SHA}`;
      await instance.load({
        coreURL: `${CORE_BASE}/ffmpeg-core.js${v}`,
        wasmURL: `${CORE_BASE}/ffmpeg-core.wasm${v}`,
      });
      ffmpeg = instance;
      return instance;
    } catch (e) {
      loadPromise = null; // allow a retry on the next attempt
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Failed to load the video engine (ffmpeg.wasm): ${detail}. ` +
          `Make sure ${CORE_BASE}/ffmpeg-core.wasm is reachable, and use an up-to-date desktop browser.`,
      );
    }
  })();

  return loadPromise;
}

export interface GenerateOptions {
  clips: VideoClip[];
  width: number;
  height: number;
  crf: number;
  fps: number;
  perClipCap: number;
  music: { bytes: Uint8Array; loop: boolean; volume: number } | null;
  onProgress: (p: ProgressUpdate) => void;
}

export interface GenerateOutput {
  blob: Blob;
  duration: number;
  usedClips: VideoClip[];
}

async function fetchClip(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export async function generateVideo(opts: GenerateOptions): Promise<GenerateOutput> {
  const { clips, width, height, crf, fps, perClipCap, music, onProgress } = opts;

  onProgress({ stage: "loading", progress: 4, message: "Loading video engine (ffmpeg.wasm)…" });
  const ff = await getFFmpeg();

  const total = clips.length;
  const usedClips: VideoClip[] = [];
  const normalized: string[] = [];
  let expectedDuration = 0;
  let downloadFailures = 0;
  let encodeFailures = 0;
  let lastEncodeError = "";

  for (let i = 0; i < total; i++) {
    const clip = clips[i];
    const base = 10 + (i / total) * 68;

    onProgress({
      stage: "downloading",
      progress: base,
      message: `Downloading clip ${i + 1} of ${total}…`,
      currentStep: i + 1,
      totalSteps: total,
    });

    let data: Uint8Array;
    try {
      data = await fetchClip(clip.url);
    } catch (e) {
      downloadFailures++;
      pushLog(`download failed for clip ${clip.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue; // skip unreachable / CORS-blocked clips
    }

    const src = `src${i}.mp4`;
    const out = `n${i}.mp4`;
    await ff.writeFile(src, data);

    onProgress({
      stage: "encoding",
      progress: base + (0.5 / total) * 68,
      message: `Processing clip ${i + 1} of ${total}…`,
      currentStep: i + 1,
      totalSteps: total,
    });

    try {
      await ff.exec([
        "-i", src,
        "-t", String(perClipCap),
        "-vf",
        `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,` +
          `crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p`,
        "-an",
        "-r", String(fps),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", String(crf),
        "-pix_fmt", "yuv420p",
        "-y", out,
      ]);
      normalized.push(out);
      usedClips.push(clip);
      expectedDuration += Math.min(clip.duration, perClipCap);
    } catch (e) {
      encodeFailures++;
      lastEncodeError = e instanceof Error ? e.message : String(e);
    } finally {
      await ff.deleteFile(src).catch(() => {});
    }
  }

  if (normalized.length === 0) {
    if (downloadFailures > 0 && encodeFailures === 0) {
      throw new Error(
        `All ${downloadFailures} clip downloads were blocked (likely a network/CORS issue reaching the Pexels CDN). ` +
          `Try another theme, or check your connection.`,
      );
    }
    throw new Error(
      `Could not process any clips (${encodeFailures} encode failures). ` +
        (lastEncodeError ? `Last ffmpeg error: ${lastEncodeError}` : "See console for the ffmpeg log."),
    );
  }

  // Concatenate normalized clips (all share identical codec params → stream copy).
  onProgress({ stage: "stitching", progress: 82, message: "Stitching clips together…" });
  const list = normalized.map((f) => `file '${f}'`).join("\n");
  await ff.writeFile("concat.txt", new TextEncoder().encode(list));
  await ff.exec([
    "-f", "concat", "-safe", "0", "-i", "concat.txt",
    "-c", "copy", "-movflags", "+faststart", "-y", "stitched.mp4",
  ]);

  let outputName = "stitched.mp4";

  // Optional background music, mixed at the exact video length with a fade-out.
  if (music) {
    onProgress({ stage: "audio", progress: 92, message: "Mixing in background music…" });
    await ff.writeFile("music_in", music.bytes);
    const dur = Math.max(1, Math.round(expectedDuration));
    const fadeStart = Math.max(0, dur - 2);
    const vol = Math.max(0, Math.min(2, music.volume));
    const af = `volume=${vol},afade=t=out:st=${fadeStart}:d=2`;
    try {
      const args = music.loop
        ? [
            "-i", "stitched.mp4",
            "-stream_loop", "-1", "-i", "music_in",
            "-map", "0:v", "-map", "1:a",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-af", af, "-t", String(dur), "-movflags", "+faststart", "-y", "final.mp4",
          ]
        : [
            "-i", "stitched.mp4",
            "-i", "music_in",
            "-map", "0:v", "-map", "1:a",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-af", af, "-t", String(dur), "-movflags", "+faststart", "-y", "final.mp4",
          ];
      await ff.exec(args);
      outputName = "final.mp4";
    } catch (e) {
      pushLog(`music mix failed, exporting silent cut: ${e instanceof Error ? e.message : String(e)}`);
      outputName = "stitched.mp4";
    }
  }

  onProgress({ stage: "encoding", progress: 98, message: "Finalizing…" });
  const fileData = await ff.readFile(outputName);
  const bytes = fileData as Uint8Array;
  const blob = new Blob([new Uint8Array(bytes)], { type: "video/mp4" });

  // Best-effort cleanup so repeated runs don't leak MEMFS memory.
  for (const f of normalized) await ff.deleteFile(f).catch(() => {});
  await ff.deleteFile("concat.txt").catch(() => {});
  await ff.deleteFile("stitched.mp4").catch(() => {});
  await ff.deleteFile("music_in").catch(() => {});
  await ff.deleteFile("final.mp4").catch(() => {});

  onProgress({ stage: "complete", progress: 100, message: "Your video is ready!" });

  return { blob, duration: expectedDuration, usedClips };
}
