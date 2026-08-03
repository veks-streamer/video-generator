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
  targetDuration: number; // exact output length in seconds
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
  const { clips, width, height, crf, fps, perClipCap, targetDuration, music, onProgress } = opts;

  onProgress({ stage: "loading", progress: 4, message: "Loading video engine (ffmpeg.wasm)…" });
  const ff = await getFFmpeg();

  const usedClips: VideoClip[] = [];
  const normalized: string[] = [];
  let downloadFailures = 0;
  let encodeFailures = 0;
  let lastEncodeError = "";

  const FADE_IN = 0.6;
  const FADE_OUT = 1.0;
  let remaining = targetDuration;

  // Fill the timeline to EXACTLY targetDuration. The last needed clip is trimmed
  // to the remaining time; fade-in is baked into the first clip and fade-out into
  // the finishing clip — all inside the normalize pass, so no extra full re-encode.
  for (let i = 0; i < clips.length && remaining > 0.05; i++) {
    const clip = clips[i];
    const done = targetDuration - remaining;
    const base = 10 + (done / targetDuration) * 68;

    onProgress({
      stage: "downloading",
      progress: base,
      message: `Fetching footage… ${Math.round(done)}s / ${Math.round(targetDuration)}s`,
    });

    let data: Uint8Array;
    try {
      data = await fetchClip(clip.url);
    } catch (e) {
      downloadFailures++;
      pushLog(`download failed for clip ${clip.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const full = Math.min(clip.duration, perClipCap);
    const willFinish = full >= remaining - 1e-6;
    const len = Math.min(full, remaining);
    const isFirst = usedClips.length === 0;

    const src = `src${i}.mp4`;
    const out = `n${i}.mp4`;
    await ff.writeFile(src, data);

    onProgress({
      stage: "encoding",
      progress: base + (0.5 / clips.length) * 68,
      message: `Processing footage… ${Math.round(done)}s / ${Math.round(targetDuration)}s`,
    });

    let vf =
      `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,` +
      `crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p`;
    if (isFirst) {
      const fi = Math.min(FADE_IN, len * 0.5);
      vf += `,fade=t=in:st=0:d=${fi.toFixed(3)}`;
    }
    if (willFinish) {
      const fo = Math.min(FADE_OUT, len * 0.6);
      vf += `,fade=t=out:st=${Math.max(0, len - fo).toFixed(3)}:d=${fo.toFixed(3)}`;
    }

    try {
      await ff.exec([
        "-i", src,
        "-t", String(len),
        "-vf", vf,
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
      remaining -= len;
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
        `All ${downloadFailures} clip downloads were blocked (likely a network/CORS issue reaching the Pexels CDN). Try another theme or check your connection.`,
      );
    }
    throw new Error(
      `Could not process any clips (${encodeFailures} encode failures). ` +
        (lastEncodeError ? `Last ffmpeg error: ${lastEncodeError}` : "See console for the ffmpeg log."),
    );
  }

  const realDuration = targetDuration - Math.max(0, remaining);

  // Concatenate (identical codec params → stream copy, no re-encode). The result
  // is already exactly realDuration with baked fades.
  onProgress({ stage: "stitching", progress: 82, message: "Stitching clips together…" });
  const list = normalized.map((f) => `file '${f}'`).join("\n");
  await ff.writeFile("concat.txt", new TextEncoder().encode(list));
  await ff.exec([
    "-f", "concat", "-safe", "0", "-i", "concat.txt",
    "-c", "copy", "-movflags", "+faststart", "-y", "video.mp4",
  ]);

  let outputName = "video.mp4";

  // Mix background music (video stays copy — fast), trimmed to the exact length.
  if (music) {
    onProgress({ stage: "audio", progress: 92, message: "Mixing in background music…" });
    await ff.writeFile("music_in", music.bytes);
    const vol = Math.max(0, Math.min(2, music.volume));
    const fo = Math.min(FADE_OUT, realDuration * 0.6);
    const af = `volume=${vol},afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0, realDuration - fo).toFixed(3)}:d=${fo.toFixed(3)}`;
    try {
      const args = [
        "-i", "video.mp4",
        ...(music.loop ? ["-stream_loop", "-1"] : []),
        "-i", "music_in",
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-af", af, "-t", String(realDuration),
        "-movflags", "+faststart", "-y", "final.mp4",
      ];
      await ff.exec(args);
      outputName = "final.mp4";
    } catch (e) {
      pushLog(`music mix failed, exporting silent cut: ${e instanceof Error ? e.message : String(e)}`);
      outputName = "video.mp4";
    }
  }

  onProgress({ stage: "encoding", progress: 98, message: "Finalizing…" });
  const fileData = await ff.readFile(outputName);
  const bytes = fileData as Uint8Array;
  const blob = new Blob([new Uint8Array(bytes)], { type: "video/mp4" });

  for (const f of normalized) await ff.deleteFile(f).catch(() => {});
  await ff.deleteFile("concat.txt").catch(() => {});
  await ff.deleteFile("video.mp4").catch(() => {});
  await ff.deleteFile("music_in").catch(() => {});
  await ff.deleteFile("final.mp4").catch(() => {});

  onProgress({ stage: "complete", progress: 100, message: "Your video is ready!" });

  return { blob, duration: realDuration, usedClips };
}
