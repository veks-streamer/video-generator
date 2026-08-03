# Video Generator

Create short video montages **entirely in your browser** from royalty-free
[Pexels](https://www.pexels.com/) clips. There is no backend — clips are fetched
client-side and stitched together with [ffmpeg.wasm](https://ffmpegwasm.netlify.app/),
so the whole thing runs as a static site on GitHub Pages.

**Live app:** https://veks-streamer.github.io/video-generator/

## Features

- 🎬 Theme presets **plus** a free-text search box (any Pexels query)
- 📐 Aspect ratios: Landscape 16:9, Portrait 9:16, Square 1:1
- ⚙️ Quality toggle (480p / 720p) to trade speed for sharpness
- ⏱️ Duration slider (10s–2min)
- 🎵 Optional background music (upload your own track, with volume + fade-out)
- 🌗 Dark / light theme
- 🔒 100% client-side — your Pexels key and videos never leave your device

## Setup

1. Grab a free API key at [pexels.com/api](https://www.pexels.com/api/).
2. Open the app, go to **Settings**, paste the key, and hit **Test key**.
3. Pick a theme, ratio, quality, duration → **Generate video** → **Download MP4**.

The first generation downloads the ffmpeg engine (~30 MB) once; it's cached afterwards.

## Local development

```bash
npm install
npm run dev      # start Vite dev server
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## How it's deployed

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the
Vite app and publishes `dist/` to GitHub Pages automatically.

## Tech

React + TypeScript · Vite · Tailwind CSS · Radix UI · wouter · ffmpeg.wasm · Pexels API

## Credits

Video clips provided by [Pexels](https://www.pexels.com/) and their contributors.
