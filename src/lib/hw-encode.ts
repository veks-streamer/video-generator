// Hardware-accelerated video encoding via the WebCodecs API.
// Pipeline: mp4box demux → VideoDecoder → OffscreenCanvas (scale/crop + style +
// fades) → VideoEncoder (hardware H.264) → mp4-muxer. Produces a VIDEO-ONLY mp4;
// audio is muxed afterwards by ffmpeg (cheap copy). Falls back to ffmpeg.wasm on
// any failure. Experimental.

import MP4Box from "mp4box";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import type { VideoClip, ProgressUpdate } from "./constants";

export function hwSupported(): boolean {
  return (
    typeof (globalThis as any).VideoEncoder !== "undefined" &&
    typeof (globalThis as any).VideoDecoder !== "undefined" &&
    typeof (globalThis as any).OffscreenCanvas !== "undefined"
  );
}

interface Demuxed { codec: string; description: Uint8Array | undefined; chunks: EncodedVideoChunk[]; width: number; height: number }

function demux(buffer: ArrayBuffer): Promise<Demuxed> {
  return new Promise((resolve, reject) => {
    const file = (MP4Box as any).createFile();
    const chunks: EncodedVideoChunk[] = [];
    let codec = "", width = 0, height = 0, description: Uint8Array | undefined, nb = Infinity, done = false;
    const finish = () => { if (!done) { done = true; resolve({ codec, description, chunks, width, height }); } };
    file.onError = (e: any) => reject(new Error("mp4 demux: " + e));
    file.onReady = (info: any) => {
      const track = info.videoTracks[0];
      if (!track) { reject(new Error("no video track")); return; }
      codec = track.codec; width = track.video.width; height = track.video.height; nb = track.nb_samples;
      try {
        const trak = file.getTrackById(track.id);
        for (const entry of trak.mdia.minf.stbl.stsd.entries) {
          const box = entry.avcC || entry.hvcC || entry.vpcC;
          if (box) {
            const DS = (MP4Box as any).DataStream;
            const stream = new DS(undefined, 0, DS.BIG_ENDIAN);
            box.write(stream);
            description = new Uint8Array(stream.buffer, 8); // strip 8-byte box header
            break;
          }
        }
      } catch { /* description optional for some codecs */ }
      file.setExtractionOptions(track.id, null, { nbSamples: Infinity });
      file.start();
    };
    file.onSamples = (_id: number, _u: any, samples: any[]) => {
      for (const s of samples) {
        chunks.push(new EncodedVideoChunk({
          type: s.is_sync ? "key" : "delta",
          timestamp: (s.cts * 1e6) / s.timescale,
          duration: (s.duration * 1e6) / s.timescale,
          data: s.data,
        }));
      }
      if (chunks.length >= nb) finish();
    };
    (buffer as any).fileStart = 0;
    file.appendBuffer(buffer);
    file.flush();
    finish(); // samples are delivered synchronously during append/flush
  });
}

interface StyleCanvas { filter: string; vignette: boolean }
function styleCanvas(id: string): StyleCanvas {
  switch (id) {
    case "cinematic": return { filter: "contrast(1.08) saturate(0.92)", vignette: true };
    case "vibrant": return { filter: "contrast(1.12) saturate(1.5) brightness(1.02)", vignette: false };
    case "warm": return { filter: "saturate(1.1) sepia(0.15) brightness(1.02)", vignette: false };
    case "cool": return { filter: "saturate(1.05) hue-rotate(12deg)", vignette: false };
    case "vintage": return { filter: "sepia(0.4) contrast(1.05) saturate(0.8)", vignette: true };
    case "noir": return { filter: "grayscale(1) contrast(1.22)", vignette: true };
    default: return { filter: "none", vignette: false };
  }
}

const AVC_CODEC = "avc1.4d0028"; // Main profile, level 4.0 (covers 1080p)

export interface HwOptions {
  clips: VideoClip[];
  width: number;
  height: number;
  fps: number;
  targetDuration: number;
  perClipCap: number;
  varyCuts: boolean;
  styleId: string;
  onProgress: (p: ProgressUpdate) => void;
}

async function fetchClip(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

export async function hwEncodeVideo(opts: HwOptions): Promise<{ bytes: Uint8Array; duration: number; usedClips: VideoClip[] }> {
  const { clips, width, height, fps, targetDuration, perClipCap, varyCuts, styleId, onProgress } = opts;
  const totalFrames = Math.max(1, Math.round(targetDuration * fps));
  const frameDurUs = 1e6 / fps;
  const style = styleCanvas(styleId);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  // pre-render vignette overlay
  let vignette: OffscreenCanvas | null = null;
  if (style.vignette) {
    vignette = new OffscreenCanvas(width, height);
    const vg = vignette.getContext("2d")!;
    const grad = vg.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.55)");
    vg.fillStyle = grad;
    vg.fillRect(0, 0, width, height);
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });
  let encoderError: any = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encoderError = e; },
  });
  const bitrate = Math.round(width * height * fps * 0.09);
  encoder.configure({
    codec: AVC_CODEC,
    width, height,
    bitrate,
    framerate: fps,
    hardwareAcceleration: "prefer-hardware",
    latencyMode: "quality",
  } as VideoEncoderConfig);

  const usedClips: VideoClip[] = [];
  let outIndex = 0;
  const fadeIn = Math.round(Math.min(0.6, targetDuration * 0.2) * fps);
  const fadeOut = Math.round(Math.min(1.0, targetDuration * 0.25) * fps);

  const drawAndEncode = (frame: VideoFrame) => {
    // cover/crop into target
    const sw = frame.displayWidth || frame.codedWidth;
    const sh = frame.displayHeight || frame.codedHeight;
    const scale = Math.max(width / sw, height / sh);
    const dw = sw * scale, dh = sh * scale;
    ctx.filter = style.filter;
    ctx.drawImage(frame, (width - dw) / 2, (height - dh) / 2, dw, dh);
    ctx.filter = "none";
    if (vignette) ctx.drawImage(vignette, 0, 0);
    // fades
    let a = 0;
    if (outIndex < fadeIn) a = 1 - outIndex / fadeIn;
    else if (outIndex > totalFrames - fadeOut) a = 1 - (totalFrames - outIndex) / fadeOut;
    if (a > 0.001) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; ctx.fillRect(0, 0, width, height); }

    const vf = new VideoFrame(canvas, { timestamp: Math.round(outIndex * frameDurUs), duration: Math.round(frameDurUs) });
    encoder.encode(vf, { keyFrame: outIndex % 150 === 0 });
    vf.close();
    outIndex++;
  };

  const processClip = (bytes: ArrayBuffer, offset: number, len: number) => new Promise<void>((resolve, reject) => {
    let d: Demuxed;
    demux(bytes).then((dm) => {
      d = dm;
      const skip = Math.round(offset * fps);
      const want = Math.min(Math.round(len * fps), totalFrames - outIndex);
      if (want <= 0) { resolve(); return; }
      let clipIdx = 0, kept = 0;
      const decoder = new VideoDecoder({
        output: (frame) => {
          try {
            if (clipIdx >= skip && kept < want && outIndex < totalFrames) { drawAndEncode(frame); kept++; }
          } finally { frame.close(); clipIdx++; }
        },
        error: (e) => reject(new Error("decode: " + e)),
      });
      decoder.configure({ codec: d.codec, codedWidth: d.width, codedHeight: d.height, description: d.description } as VideoDecoderConfig);
      for (const c of d.chunks) decoder.decode(c);
      decoder.flush().then(() => { try { decoder.close(); } catch { /* */ } resolve(); }).catch(reject);
    }).catch(reject);
  });

  // cycle clips to fill exactly targetDuration
  let ci = 0, downloadFailures = 0;
  while (outIndex < totalFrames && ci < clips.length * 40) {
    const clip = clips[ci % clips.length];
    ci++;
    let buf: ArrayBuffer;
    try { buf = await fetchClip(clip.url); }
    catch { downloadFailures++; if (downloadFailures > clips.length + 4) break; continue; }
    const full = Math.min(clip.duration, perClipCap);
    const cut = varyCuts ? 2.5 + Math.random() * Math.max(0.5, perClipCap - 2.5) : full;
    const len = Math.min(full, cut);
    const off = Math.random() * Math.max(0, clip.duration - len);
    try { await processClip(buf, off, len); } catch (e) { if (encoderError) throw encoderError; throw e; }
    if (!usedClips.some((c) => c.id === clip.id)) usedClips.push(clip);
    onProgress({ stage: "encoding", progress: 8 + (outIndex / totalFrames) * 86, message: `HW encoding… ${Math.round(outIndex / fps)}s / ${Math.round(targetDuration)}s` });
  }

  if (outIndex === 0) throw new Error("HW encode produced no frames");
  await encoder.flush();
  encoder.close();
  if (encoderError) throw encoderError;
  muxer.finalize();
  const { buffer } = muxer.target as ArrayBufferTarget;
  return { bytes: new Uint8Array(buffer), duration: outIndex / fps, usedClips };
}
