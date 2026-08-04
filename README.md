# 🎬 Video Generator

Create video montages **entirely in your browser** from royalty-free
[Pexels](https://www.pexels.com/) clips — with real background music, batch mode,
and full control over resolution and framerate. There is **no backend**: clips are
fetched client-side and stitched together with
[ffmpeg.wasm](https://ffmpegwasm.netlify.app/), so the whole thing runs as a static
site on GitHub Pages.

**▶ Live app:** https://veks-streamer.github.io/video-generator/

The exact deployed build (commit + run #) is shown on a ribbon at the top of the app.

---

## ✨ Features

### Video
- **Two video sources:** Pexels (native-fps accurate) and Pixabay (Standard mode) — both royalty-free for commercial use.
- **37 SFW themes** (nature, ocean, city, space, forest, sunset, travel, food, sport…) **plus a free-text search box**.
- **Random theme** — picks one for you; in a batch it varies **per video**.
- **Aspect ratios:** Landscape 16:9, Portrait 9:16, Square 1:1.
- **Quality:** 480p / 720p / 1080p. Higher-resolution source clips are pulled and **downscaled cleanly (lanczos)** — never upscaled.
- **Framerate:** 24 / 25 / 30 / 50 / 60 fps. Clips are selected to **match the chosen fps natively** (no fps conversion), then encoded at exactly that rate for smooth, consistent output.
- **Duration:** 10 s – 10 min.
- **No repeated footage** — used clip ids are remembered and Pexels pages rotate, so every video (and every clip within a batch) is unique.

### Batch
- Generate **1 / 5 / 10 / 15 / 20** videos in a row — each unique (different clips, theme if Random, and music).
- **Results gallery** with per-video preview, individual download, and **Download all**.
- **Generation time** is shown per video and as a batch total, so you can estimate how long future batches will take.

### Music
- **Generated (in-browser):** ambient, calm, uplifting, cinematic, lo-fi, electronic, techno, pop, rock, classical + **Random** — real genres with drums & bass, synthesized with the Web Audio API. Unique per video (seed drives key, tempo, progression & notes), royalty-free, and peak-normalized so it's actually audible.
- **Jamendo (real music):** optional — add a free Jamendo client id in Settings to pull **Creative-Commons instrumental tracks by genre**, downloaded and cut to the video length, non-repeating. Falls back to generated music if unavailable.
- **Upload your own** track (looped/trimmed to length with a fade-out).
- Per-source **volume** control. Music is always mixed to the **exact video length**.

### Quality-of-life
- **Desktop notification** when a batch finishes — start it, switch tabs, get pinged when it's ready.
- **Warns before you close the tab** while a generation is running.
- **Dark / light** theme.
- **100% client-side** — your API keys and generated videos never leave your device.

---

## 🚀 Setup

1. Grab a free API key at [pexels.com/api](https://www.pexels.com/api/).
2. Open the app → **Settings** → paste the key → **Test key**.
3. *(Optional)* For real music, add a free **Jamendo client id** from [devportal.jamendo.com](https://devportal.jamendo.com/) in Settings.
4. Pick a theme, ratio, quality, framerate, duration & music → **Generate** → **Download**.

> The first generation downloads the ffmpeg engine (~30 MB) once; it's cached afterwards.
> Big batches, long durations, 60 fps or 1080p take longer to encode in the browser and use more memory — keep the tab open (you'll get a notification when done).

---

## 🛠️ Local development

```bash
npm install
npm run dev       # Vite dev server
npm run typecheck # tsc --noEmit
npm run build     # production build into dist/
npm run preview   # preview the production build
```

## 📦 Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the Vite
app and publishes `dist/` to GitHub Pages automatically. Pages **Source** must be set
to **GitHub Actions** once in the repo settings.

## 🧱 Tech

React + TypeScript · Vite · Tailwind CSS · Radix UI · wouter · ffmpeg.wasm ·
Web Audio API · Pexels API · Pixabay API · Jamendo API

## 📄 Credits & licensing

- Video clips: [Pexels](https://www.pexels.com/) and [Pixabay](https://pixabay.com/) — royalty-free for commercial use (no attribution required).
- Jamendo tracks are **Creative Commons** — credit the artists when you publish.
- Generated music is synthesized locally and royalty-free.
