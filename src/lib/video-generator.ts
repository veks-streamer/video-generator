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

/**
 * Tear down the current ffmpeg instance so the next call starts with a fresh
 * WASM heap + MEMFS. ffmpeg.wasm has a bounded heap and a crash ("Aborted()" /
 * "memory access out of bounds") leaves the instance permanently dead, so we
 * recreate it per video to isolate memory and recover from any crash.
 */
export async function resetFFmpeg(): Promise<void> {
  try { if (ffmpeg) ffmpeg.terminate(); } catch { /* */ }
  ffmpeg = null;
  loadPromise = null;
}

export interface GenerateOptions {
  clips: VideoClip[];
  width: number;
  height: number;
  crf: number;
  fps: number;
  perClipCap: number;
  targetDuration: number; // exact output length in seconds
  fast: boolean;          // fast mode = join without re-encoding
  music: { parts: Uint8Array[]; loop: boolean; volume: number } | null;
  onProgress: (p: ProgressUpdate) => void;
}

export interface GenerateOutput {
  blob: Blob;
  duration: number;
  usedClips: VideoClip[];
}

const FADE_IN = 0.6;
const FADE_OUT = 1.0;

async function fetchClip(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Write the background music to MEMFS. If several tracks are supplied they are
 * concatenated (resampled to a common format) into one track, so long videos
 * get a sequence of songs instead of one looped song. Returns the MEMFS
 * filename to use, or null.
 */
async function writeMusic(ff: FFmpeg, parts: Uint8Array[]): Promise<string | null> {
  if (!parts.length) return null;
  if (parts.length === 1) { await ff.writeFile("music_in", parts[0]); return "music_in"; }
  const names: string[] = [];
  for (let i = 0; i < parts.length; i++) { const n = `m${i}`; await ff.writeFile(n, parts[i]); names.push(n); }
  const inputs = names.flatMap((n) => ["-i", n]);
  const pre = names.map((_, i) => `[${i}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`).join(";");
  const chain = names.map((_, i) => `[a${i}]`).join("");
  const fc = `${pre};${chain}concat=n=${names.length}:v=0:a=1[a]`;
  try {
    await ff.exec([...inputs, "-filter_complex", fc, "-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-y", "music_cat.m4a"]);
    for (const n of names) await ff.deleteFile(n).catch(() => {});
    return "music_cat.m4a";
  } catch (e) {
    pushLog(`music concat failed, using first track: ${e instanceof Error ? e.message : String(e)}`);
    await ff.writeFile("music_in", parts[0]);
    for (const n of names) await ff.deleteFile(n).catch(() => {});
    return "music_in";
  }
}

async function muxMusic(
  ff: FFmpeg, videoFile: string, music: { parts: Uint8Array[]; loop: boolean; volume: number },
  realDuration: number,
): Promise<string> {
  const mfile = await writeMusic(ff, music.parts);
  if (!mfile) return videoFile;
  const vol = Math.max(0, Math.min(2, music.volume));
  const fo = Math.min(FADE_OUT, realDuration * 0.6);
  const af = `volume=${vol},afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0, realDuration - fo).toFixed(3)}:d=${fo.toFixed(3)}`;
  try {
    await ff.exec([
      "-i", videoFile,
      ...(music.loop ? ["-stream_loop", "-1"] : []),
      "-i", mfile,
      "-map", "0:v", "-map", "1:a",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-af", af, "-t", String(realDuration),
      "-movflags", "+faststart", "-y", "final.mp4",
    ]);
    return "final.mp4";
  } catch (e) {
    pushLog(`music mix failed, exporting silent cut: ${e instanceof Error ? e.message : String(e)}`);
    return videoFile;
  }
}

export async function generateVideo(opts: GenerateOptions): Promise<GenerateOutput> {
  const { clips, width, height, crf, fps, perClipCap, targetDuration, fast, music, onProgress } = opts;

  onProgress({ stage: "loading", progress: 4, message: "Loading video engine (ffmpeg.wasm)…" });
  await resetFFmpeg(); // fresh heap per video — prevents cross-video OOM cascades
  const ff = await getFFmpeg();

  if (fast) return generateFast(ff, opts);

  // ---- Standard mode: normalize unique clips, then fill EXACTLY to target,
  // repeating clips if there isn't enough unique footage. ----
  interface Seg { file: string; len: number }
  const segs: Seg[] = [];
  const usedClips: VideoClip[] = [];
  let uniqueLen = 0;
  let downloadFailures = 0, encodeFailures = 0, lastErr = "";

  for (let i = 0; i < clips.length && uniqueLen < targetDuration; i++) {
    const clip = clips[i];
    onProgress({ stage: "downloading", progress: 10 + (uniqueLen / targetDuration) * 60, message: `Fetching footage… ${Math.round(uniqueLen)}s / ${Math.round(targetDuration)}s` });
    let data: Uint8Array;
    try { data = await fetchClip(clip.url); } catch (e) { downloadFailures++; pushLog(`download failed ${clip.id}: ${e instanceof Error ? e.message : String(e)}`); continue; }
    const src = `s${i}.mp4`, out = `n${i}.mp4`;
    const len = Math.min(clip.duration, perClipCap);
    // Random window inside the clip so the same footage looks different each run.
    const off = (Math.random() * Math.max(0, clip.duration - len)).toFixed(2);
    await ff.writeFile(src, data);
    onProgress({ stage: "encoding", progress: 10 + (uniqueLen / targetDuration) * 60, message: `Processing footage… ${Math.round(uniqueLen)}s / ${Math.round(targetDuration)}s` });
    try {
      await ff.exec([
        "-ss", off, "-i", src, "-t", String(len),
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p`,
        "-an", "-r", String(fps), "-c:v", "libx264", "-preset", "veryfast", "-crf", String(crf), "-pix_fmt", "yuv420p", "-y", out,
      ]);
      segs.push({ file: out, len }); usedClips.push(clip); uniqueLen += len;
    } catch (e) { encodeFailures++; lastErr = e instanceof Error ? e.message : String(e); }
    finally { await ff.deleteFile(src).catch(() => {}); }
  }

  if (segs.length === 0) {
    throw new Error(downloadFailures > 0 && encodeFailures === 0
      ? `All ${downloadFailures} clip downloads were blocked (network/CORS). Try another theme.`
      : `Could not process any clips (${encodeFailures} encode failures). ${lastErr}`);
  }

  // play order, cycling clips to fill exactly targetDuration
  interface Ord { file: string; clipIdx: number; len: number; last: boolean }
  const order: Ord[] = [];
  let acc = 0, k = 0;
  while (acc < targetDuration - 1e-3 && k < 100000) {
    const idx = k % segs.length, seg = segs[idx], remaining = targetDuration - acc;
    if (seg.len <= remaining + 1e-3) { order.push({ file: seg.file, clipIdx: idx, len: seg.len, last: false }); acc += seg.len; }
    else { order.push({ file: seg.file, clipIdx: idx, len: remaining, last: true }); acc = targetDuration; }
    k++;
  }
  const realDuration = acc;
  order[order.length - 1].last = true;

  // Re-encode the first + last segment to bake fade-in / fade-out (+ trim last).
  const reencode = async (srcFile: string, len: number, name: string, fin: boolean, fout: boolean) => {
    const parts = ["fps=" + fps, "format=yuv420p"];
    const filters: string[] = [];
    if (fin) filters.push(`fade=t=in:st=0:d=${Math.min(FADE_IN, len * 0.5).toFixed(3)}`);
    if (fout) { const fo = Math.min(FADE_OUT, len * 0.6); filters.push(`fade=t=out:st=${Math.max(0, len - fo).toFixed(3)}:d=${fo.toFixed(3)}`); }
    const vf = [...filters, ...parts].join(",");
    await ff.exec(["-i", srcFile, "-t", String(len), "-vf", vf, "-an", "-r", String(fps), "-c:v", "libx264", "-preset", "veryfast", "-crf", String(crf), "-pix_fmt", "yuv420p", "-y", name]);
    return name;
  };

  onProgress({ stage: "stitching", progress: 82, message: "Assembling…" });
  const firstOrd = order[0], lastOrd = order[order.length - 1];
  if (order.length === 1) {
    firstOrd.file = await reencode(segs[firstOrd.clipIdx].file, firstOrd.len, "first.mp4", true, true);
  } else {
    firstOrd.file = await reencode(segs[firstOrd.clipIdx].file, firstOrd.len, "first.mp4", true, false);
    lastOrd.file = await reencode(segs[lastOrd.clipIdx].file, lastOrd.len, "last.mp4", false, true);
  }

  const list = order.map((o) => `file '${o.file}'`).join("\n");
  await ff.writeFile("concat.txt", new TextEncoder().encode(list));
  await ff.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "-movflags", "+faststart", "-y", "video.mp4"]);

  let outputName = "video.mp4";
  if (music) { onProgress({ stage: "audio", progress: 92, message: "Mixing music…" }); outputName = await muxMusic(ff, "video.mp4", music, realDuration); }

  onProgress({ stage: "encoding", progress: 98, message: "Finalizing…" });
  const data = (await ff.readFile(outputName)) as Uint8Array;
  const blob = new Blob([new Uint8Array(data)], { type: "video/mp4" });
  for (const seg of segs) await ff.deleteFile(seg.file).catch(() => {});
  await ff.deleteFile("first.mp4").catch(() => {}); await ff.deleteFile("last.mp4").catch(() => {});
  await ff.deleteFile("concat.txt").catch(() => {}); await ff.deleteFile("video.mp4").catch(() => {});
  await ff.deleteFile("final.mp4").catch(() => {}); await ff.deleteFile("music_in").catch(() => {}); await ff.deleteFile("music_cat.m4a").catch(() => {});

  onProgress({ stage: "complete", progress: 100, message: "Your video is ready!" });
  return { blob, duration: realDuration, usedClips };
}

// Fast mode: remux clips to MPEG-TS (no re-encode) and concat with continuous
// timestamps. Clips are cycled to fill EXACTLY the target duration.
async function generateFast(ff: FFmpeg, opts: GenerateOptions): Promise<GenerateOutput> {
  const { clips, targetDuration, music, onProgress } = opts;
  const usedClips: VideoClip[] = [];
  const parts: { ts: string; len: number }[] = [];
  let uniqueLen = 0, downloadFailures = 0, remuxFailures = 0;

  for (let i = 0; i < clips.length && uniqueLen < targetDuration; i++) {
    const clip = clips[i];
    onProgress({ stage: "downloading", progress: 8 + Math.min(78, (uniqueLen / targetDuration) * 78), message: `Fast mode — fetching footage… ${Math.round(uniqueLen)}s / ${Math.round(targetDuration)}s` });
    const mp4 = `f${i}.mp4`, ts = `f${i}.ts`;
    try { await ff.writeFile(mp4, await fetchClip(clip.url)); }
    catch (e) { downloadFailures++; pushLog(`fast download failed ${clip.id}: ${e instanceof Error ? e.message : String(e)}`); continue; }
    // Random keyframe start so repeated footage differs between videos. Input -ss
    // with copy snaps to a keyframe, so the segment stays clean.
    const off = (Math.random() * Math.max(0, Math.min(clip.duration * 0.4, clip.duration - 3))).toFixed(2);
    const segLen = Math.max(1, clip.duration - Number(off));
    try {
      await ff.exec(["-ss", off, "-i", mp4, "-map", "0:v:0", "-c", "copy", "-bsf:v", "h264_mp4toannexb", "-f", "mpegts", "-y", ts]);
      parts.push({ ts, len: segLen }); usedClips.push(clip); uniqueLen += segLen;
    } catch (e) { remuxFailures++; pushLog(`fast remux failed ${clip.id}: ${e instanceof Error ? e.message : String(e)}`); }
    finally { await ff.deleteFile(mp4).catch(() => {}); }
  }

  if (parts.length === 0) {
    throw new Error(`Fast mode couldn't prepare any clips (${downloadFailures} download, ${remuxFailures} remux failures). Try Standard mode.`);
  }

  // cycle clips to reach targetDuration (repeat if not enough unique footage)
  const order: string[] = [];
  let acc = 0, k = 0;
  while (acc < targetDuration - 1e-3 && k < 100000) { const p = parts[k % parts.length]; order.push(p.ts); acc += p.len; k++; }
  const realDuration = Math.min(targetDuration, acc);

  onProgress({ stage: "stitching", progress: 88, message: "Fast mode — joining clips…" });
  const list = order.map((f) => `file '${f}'`).join("\n");
  await ff.writeFile("concat.txt", new TextEncoder().encode(list));
  try {
    await ff.exec(["-fflags", "+genpts", "-f", "concat", "-safe", "0", "-i", "concat.txt", "-t", String(realDuration), "-c", "copy", "-avoid_negative_ts", "make_zero", "-movflags", "+faststart", "-y", "video.mp4"]);
  } catch (e) {
    throw new Error("Fast mode couldn't join these clips (incompatible H.264 parameters). Try Standard mode.");
  }

  let outputName = "video.mp4";
  if (music) { onProgress({ stage: "audio", progress: 94, message: "Fast mode — adding music…" }); outputName = await muxMusic(ff, "video.mp4", music, realDuration); }

  const data = (await ff.readFile(outputName)) as Uint8Array;
  const blob = new Blob([new Uint8Array(data)], { type: "video/mp4" });
  for (const p of parts) await ff.deleteFile(p.ts).catch(() => {});
  await ff.deleteFile("concat.txt").catch(() => {}); await ff.deleteFile("video.mp4").catch(() => {});
  await ff.deleteFile("final.mp4").catch(() => {}); await ff.deleteFile("music_in").catch(() => {}); await ff.deleteFile("music_cat.m4a").catch(() => {});

  onProgress({ stage: "complete", progress: 100, message: "Your video is ready!" });
  return { blob, duration: realDuration, usedClips };
}
