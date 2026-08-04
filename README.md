# 🎬 Video Generator

Create video montages **entirely in your browser** from royalty-free stock clips —
with real or generated background music, batch mode, and full control over
resolution and framerate. There is **no backend**: clips are fetched client-side
and assembled with [ffmpeg.wasm](https://ffmpegwasm.netlify.app/), so the whole
thing runs as a static site on GitHub Pages.

**▶ Live app:** https://veks-streamer.github.io/video-generator/

The exact deployed build (commit + run #) is shown on a ribbon at the top of the app.

---

## ✨ Features

### Video
- **Two sources, both royalty-free for commercial use:** **Pexels** (framerate-accurate) and **Pixabay** (Standard mode).
- **37 SFW themes** plus a **free-text search box** for any query.
- **Random theme** — in a batch it varies **per video**.
- **Aspect ratios:** Landscape 16:9, Portrait 9:16, Square 1:1.
- **Quality:** 480p / 720p / 1080p — higher-res source clips are **downscaled cleanly (lanczos)**, never upscaled.
- **Framerate:** 24 / 25 / 30 / 50 / 60 fps. On Pexels, clips are chosen to **match the chosen fps natively** (no fps conversion) and are encoded at exactly that rate.
- **Exact duration** — output is trimmed to precisely the length you set, with **fade in/out** (buffered footage means a failed download never shortens the video).
- **No repeated footage** across a batch (used-clip memory + page rotation).

### Two modes
- **Standard** — clean downscale + exact duration + fades (re-encoded, smooth).
- **Fast (raw)** — pulls clips at the exact selected resolution+fps and joins them via **MPEG-TS concat with no video re-encoding** — dramatically faster, with continuous timestamps and clean boundaries. Ideal when the output will be re-encoded later. (Square not supported.)

### Batch
- Generate **1 / 5 / 10 / 15 / 20** videos in a row — each unique.
- **Results gallery** with per-video preview, individual download, and **Download all**.
- **Generation time** shown per video and as a batch total (clearly labelled as *generation* time, not clip length).

### Music
- **Generated (in-browser):** ambient, calm, uplifting, cinematic, lo-fi, electronic, techno, pop, rock, classical + **Random** — real genres with drums & bass, a per-seed melodic motif, phrase structure & fills, and a soft-limiter for consistent, audible loudness. Unique per video, always royalty-free.
- **Jamendo (real music):** optional client id → Creative-Commons instrumental tracks by genre, **filtered to commercially-usable licenses (CC-BY / CC-BY-SA)**, downloaded and cut to length, non-repeating. When selected it is used **strictly** (never silently swapped for generated).
- **Upload your own** track. Per-source **volume**; music mixed to the exact length with a fade-out.

### Quality-of-life
- **Job queue** — keep adding jobs (different durations, themes, settings) while others run; they process one after another without interrupting.
- **Minimizable progress** — shrink the progress popup to a corner pill and keep watching the activity log while videos generate.
- **Persistent library** — generated videos are saved in your browser (IndexedDB) and survive navigation, reloads and sessions. **Clear cache** button frees space; storage usage is shown.
- **Activity log** at the bottom — detailed step-by-step events and the exact reason for any failure (including the last ffmpeg lines), copyable.
- **Desktop notification** when a batch finishes; **warns before closing the tab** mid-generation.
- **Dark / light** theme. 100% client-side — API keys and videos never leave your device.

---

## 🚀 Setup

1. Grab a free API key at [pexels.com/api](https://www.pexels.com/api/) (and optionally [pixabay.com/api](https://pixabay.com/api/docs/)).
2. Open the app → **Settings** → paste the key → **Test key**.
3. *(Optional)* For real music, add a free **Jamendo Client ID** from [devportal.jamendo.com](https://devportal.jamendo.com/) — only the Client ID is needed, not the Secret.
4. Pick theme, ratio, quality, framerate, mode, duration & music → **Generate** → **Download**.

> The first generation downloads the ffmpeg engine (~30 MB) once, then it's cached.
> Long/large/1080p/60fps jobs take a while — try **Fast mode** for a big speed-up. You can switch tabs; you'll get a notification when done (don't close the tab).

## 🛠️ Local development

```bash
npm install
npm run dev       # Vite dev server
npm run typecheck # tsc --noEmit
npm run build     # production build into dist/
```

## 📦 Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, building the Vite app and
publishing `dist/` to GitHub Pages. Pages **Source** must be set to **GitHub Actions** once.

## 🧱 Tech

React + TypeScript · Vite · Tailwind CSS · Radix UI · wouter · ffmpeg.wasm ·
Web Audio API · IndexedDB · Pexels API · Pixabay API · Jamendo API

## 📄 Credits & licensing

- Video: [Pexels](https://www.pexels.com/) and [Pixabay](https://pixabay.com/) — royalty-free for commercial use, no attribution required.
- Jamendo tracks: **commercially-usable Creative Commons** (CC-BY / CC-BY-SA) — credit the artists when you publish.
- Generated music: synthesized locally, royalty-free.
