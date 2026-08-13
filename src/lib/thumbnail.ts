// Build a representative thumbnail from a generated video blob — entirely in the
// browser, no server, no ffmpeg re-run. We sample several frames spread across
// the clip, score each for sharpness + colourfulness + good exposure, and render
// the highest-scoring one as a JPEG. This tends to pick a crisp, colourful,
// well-lit frame rather than a black/blurred/washed-out one.

function once(el: HTMLMediaElement, ev: string, ms = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => { cleanup(); reject(new Error(`${ev} timeout`)); }, ms);
    const ok = () => { cleanup(); resolve(); };
    const bad = () => { cleanup(); reject(new Error("video error")); };
    const cleanup = () => {
      clearTimeout(to);
      el.removeEventListener(ev, ok);
      el.removeEventListener("error", bad);
    };
    el.addEventListener(ev, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}

function seek(video: HTMLVideoElement, t: number, ms = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => { cleanup(); reject(new Error("seek timeout")); }, ms);
    const onSeeked = () => { cleanup(); resolve(); };
    const cleanup = () => { clearTimeout(to); video.removeEventListener("seeked", onSeeked); };
    video.addEventListener("seeked", onSeeked, { once: true });
    try { video.currentTime = Math.max(0, t); } catch (e) { cleanup(); reject(e as Error); }
  });
}

/** Score a downscaled frame: higher = crisper, more colourful, better exposed. */
function scoreFrame(data: ImageData, w: number, h: number): number {
  const px = data.data;
  const n = w * h;
  const luma = new Float32Array(n);
  let sumL = 0;
  let sRg = 0, sRg2 = 0, sYb = 0, sYb2 = 0; // Hasler-Susstrunk colourfulness
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = px[p], g = px[p + 1], b = px[p + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    luma[i] = l; sumL += l;
    const rg = r - g;
    const yb = 0.5 * (r + g) - b;
    sRg += rg; sRg2 += rg * rg;
    sYb += yb; sYb2 += yb * yb;
  }
  const meanL = sumL / n;
  const varRg = Math.max(0, sRg2 / n - (sRg / n) ** 2);
  const varYb = Math.max(0, sYb2 / n - (sYb / n) ** 2);
  const meanRg = sRg / n, meanYb = sYb / n;
  const colourfulness =
    Math.sqrt(varRg + varYb) + 0.3 * Math.sqrt(meanRg * meanRg + meanYb * meanYb);

  let grad = 0; // sharpness: mean luma gradient magnitude (edge energy)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const dx = luma[i + 1] - luma[i - 1];
      const dy = luma[i + w] - luma[i - w];
      grad += Math.abs(dx) + Math.abs(dy);
    }
  }
  const sharp = grad / n;

  let exposure = 1; // prefer mid-tones; punish near-black / blown-out frames
  if (meanL < 40) exposure = meanL / 40;
  else if (meanL > 220) exposure = (255 - meanL) / 35;
  exposure = Math.max(0.05, Math.min(1, exposure));

  const sharpN = Math.min(1, sharp / 40);
  const colourN = Math.min(1, colourfulness / 80);
  return (0.55 * sharpN + 0.30 * colourN + 0.15) * exposure;
}

/**
 * Generate a JPEG thumbnail Blob from a video blob. Returns null if the frame
 * can't be read (e.g. a tainted canvas — shouldn't happen for same-origin blobs).
 */
export async function makeThumbnail(videoBlob: Blob, maxW = 0): Promise<Blob | null> {
  const url = URL.createObjectURL(videoBlob);
  const video = document.createElement("video");
  video.muted = true;
  (video as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await once(video, "loadedmetadata");
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;
    const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

    const N = dur > 0 ? 9 : 1; // skip first/last 10% (fades / black frames)
    const times = dur > 0
      ? Array.from({ length: N }, (_, i) => dur * (0.10 + 0.80 * (i / (N - 1))))
      : [0];

    const sw = 128, sh = Math.max(1, Math.round((sw * vh) / vw));
    const sc = document.createElement("canvas"); sc.width = sw; sc.height = sh;
    const sctx = sc.getContext("2d", { willReadFrequently: true });
    if (!sctx) return null;

    let best = { t: times[0], score: -1 };
    for (const t of times) {
      try { await seek(video, t); } catch { continue; }
      sctx.drawImage(video, 0, 0, sw, sh);
      let frame: ImageData;
      try { frame = sctx.getImageData(0, 0, sw, sh); } catch { return null; }
      const score = scoreFrame(frame, sw, sh);
      if (score > best.score) best = { t, score };
    }

    try { await seek(video, best.t); } catch { /* keep current frame */ }
    // Render at the video's NATIVE resolution by default (maxW = 0), high quality.
    const ow = maxW > 0 ? Math.min(maxW, vw) : vw;
    const oh = Math.max(1, Math.round((ow * vh) / vw));
    const oc = document.createElement("canvas"); oc.width = ow; oc.height = oh;
    const octx = oc.getContext("2d");
    if (!octx) return null;
    octx.drawImage(video, 0, 0, ow, oh);
    return await new Promise<Blob | null>((res) => oc.toBlob(res, "image/jpeg", 0.9));
  } finally {
    video.pause?.();
    video.removeAttribute("src");
    try { video.load(); } catch { /* */ }
    URL.revokeObjectURL(url);
  }
}

/**
 * Grab the frame currently shown in a <video> element (at its current playback
 * position) at the video's native resolution, as a high-quality JPEG. Returns
 * null if no decoded frame is available yet (play or seek the video first).
 */
export function captureFrame(video: HTMLVideoElement, quality = 0.92): Promise<Blob | null> {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return Promise.resolve(null);
  const c = document.createElement("canvas"); c.width = vw; c.height = vh;
  const ctx = c.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  try { ctx.drawImage(video, 0, 0, vw, vh); } catch { return Promise.resolve(null); }
  return new Promise((res) => c.toBlob(res, "image/jpeg", quality));
}
