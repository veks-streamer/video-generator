import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { DurationSlider } from "@/components/duration-slider";
import { ThemeSelector } from "@/components/theme-selector";
import { OptionSelector } from "@/components/option-selector";
import { MusicSelector } from "@/components/music-selector";
import { ProgressPanel } from "@/components/progress-panel";
import { ResultsGallery } from "@/components/results-gallery";
import { Play, Sparkles, Video, Settings, AlertTriangle, Ratio, Gauge, Layers, Film } from "lucide-react";
import {
  aspectRatios, qualities, framerates, themes, randomTheme, RANDOM_THEME_ID, formatElapsed,
  generativeGenres, jamendoGenres, MUSIC_NONE, MUSIC_GENERATED, MUSIC_JAMENDO,
  MUSIC_UPLOAD, MUSIC_RANDOM,
} from "@/lib/constants";
import type { ProgressUpdate, VideoResult, Theme } from "@/lib/constants";
import {
  hasPexelsKey, getPexelsKey, getUsedClipIds, addUsedClipIds, nextQueryPage,
  getJamendoKey, hasJamendoKey, getUsedTrackIds, addUsedTrackIds,
} from "@/lib/storage";
import { searchVideos, selectClips } from "@/lib/pexels";
import { generateVideo, getRecentFfmpegLog } from "@/lib/video-generator";
import { generateMusic } from "@/lib/music";
import { searchJamendo, downloadAudio } from "@/lib/jamendo";

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

const batchCounts = [
  { id: "1", label: "1 video", icon: Video },
  { id: "5", label: "5 videos", icon: Layers },
  { id: "10", label: "10 videos", icon: Layers },
  { id: "15", label: "15 videos", icon: Layers },
  { id: "20", label: "20 videos", icon: Layers },
];

function genLabel(id: string) {
  return generativeGenres.find((g) => g.id === id)?.label ?? id;
}
function notify(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch { /* */ }
}

export default function Home() {
  const { toast } = useToast();
  const [keyReady, setKeyReady] = useState(hasPexelsKey());
  const [jamReady, setJamReady] = useState(hasJamendoKey());

  const [themeId, setThemeId] = useState<string | null>("nature");
  const [customQuery, setCustomQuery] = useState("");
  const [aspectId, setAspectId] = useState("landscape");
  const [qualityId, setQualityId] = useState("balanced");
  const [fpsId, setFpsId] = useState("30");
  const [duration, setDuration] = useState(30);
  const [batch, setBatch] = useState("1");

  const [musicSource, setMusicSource] = useState(MUSIC_GENERATED);
  const [genGenre, setGenGenre] = useState("uplifting");
  const [jamGenre, setJamGenre] = useState("electronic");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.8);

  const [showOverlay, setShowOverlay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorDetails, setErrorDetails] = useState("");
  const [progress, setProgress] = useState<ProgressUpdate>({ stage: "loading", progress: 0, message: "" });
  const [results, setResults] = useState<VideoResult[]>([]);

  useEffect(() => {
    const onFocus = () => { setKeyReady(hasPexelsKey()); setJamReady(hasJamendoKey()); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Warn before leaving while a generation is running.
  useEffect(() => {
    if (!isProcessing) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isProcessing]);

  const isRandomTheme = themeId === RANDOM_THEME_ID && !customQuery.trim();
  const hasTheme = customQuery.trim().length > 0 || !!themeId;
  const canGenerate = keyReady && hasTheme && !isProcessing;
  const count = parseInt(batch, 10) || 1;
  const isHeavy = duration > 180 || qualityId === "hd" || fpsId === "60" || count >= 10;

  function pickTheme(): { query: string; label: string } {
    if (customQuery.trim()) return { query: customQuery.trim(), label: customQuery.trim() };
    if (isRandomTheme) { const t = randomTheme(); return { query: t.query, label: t.label }; }
    const t = themes.find((x) => x.id === themeId) as Theme;
    return { query: t.query, label: t.label };
  }

  async function resolveMusic(
    index: number,
    targetLen: number,
    onProgress: (p: ProgressUpdate) => void,
    flags: { jamendoFellBack: boolean },
  ): Promise<{ music: { bytes: Uint8Array; loop: boolean; volume: number } | null; label: string }> {
    const vol = musicVolume;

    if (musicSource === MUSIC_NONE) return { music: null, label: "No music" };

    if (musicSource === MUSIC_UPLOAD) {
      if (!musicFile) return { music: null, label: "No music" };
      const bytes = new Uint8Array(await musicFile.arrayBuffer());
      return { music: { bytes, loop: true, volume: vol }, label: musicFile.name };
    }

    if (musicSource === MUSIC_JAMENDO && hasJamendoKey()) {
      try {
        onProgress({ stage: "audio", progress: 3, message: "Finding a Jamendo track…" });
        let genre = jamGenre;
        if (genre === MUSIC_RANDOM) {
          const pool = jamendoGenres.filter((g) => g.id !== MUSIC_RANDOM);
          genre = pool[Math.floor(Math.random() * pool.length)].id;
        }
        const used = getUsedTrackIds();
        const tracks = await searchJamendo(getJamendoKey(), genre, 60);
        const fresh = tracks.filter((t) => !used.has(t.id));
        const chosen = (fresh.length ? fresh : tracks).sort(() => Math.random() - 0.5)[0];
        if (!chosen) throw new Error("No Jamendo tracks found for this genre.");
        onProgress({ stage: "audio", progress: 4, message: `Downloading “${chosen.name}”…` });
        const bytes = await downloadAudio(chosen.audio);
        addUsedTrackIds([chosen.id]);
        return { music: { bytes, loop: true, volume: vol }, label: `${chosen.name} — ${chosen.artist}` };
      } catch (e) {
        // Fall back to generated so the video still has audio.
        onProgress({ stage: "audio", progress: 3, message: "Jamendo unavailable — composing music…" });
        const seed = (Date.now() ^ (index * 2654435761)) >>> 0;
        flags.jamendoFellBack = true;
        const { bytes, genreId } = await generateMusic("random", seed, targetLen);
        return { music: { bytes, loop: false, volume: vol }, label: `${genLabel(genreId)} (generated)` };
      }
    }

    // Generated
    onProgress({ stage: "audio", progress: 3, message: "Composing background music…" });
    const seed = (Date.now() ^ (index * 2654435761) ^ (Math.floor(Math.random() * 1e9))) >>> 0;
    const { bytes, genreId } = await generateMusic(genGenre, seed, targetLen);
    return { music: { bytes, loop: false, volume: vol }, label: genLabel(genreId) };
  }

  async function generateOne(index: number, total: number, flags: { jamendoFellBack: boolean }): Promise<VideoResult> {
    const started = performance.now();
    const prefix = total > 1 ? `Video ${index + 1}/${total} — ` : "";
    const onProgress = (p: ProgressUpdate) => setProgress({ ...p, message: prefix + p.message });

    const aspect = aspectRatios.find((a) => a.id === aspectId)!;
    const quality = qualities.find((q) => q.id === qualityId)!;
    const fps = framerates.find((f) => f.id === fpsId)!.fps;
    const width = even(aspect.width * quality.scale);
    const height = even(aspect.height * quality.scale);
    const perClipCap = duration > 180 ? 12 : 6;

    const { query, label } = pickTheme();

    onProgress({ stage: "searching", progress: 2, message: `Searching “${label}” (${fps}fps)…` });
    const page = nextQueryPage(query);
    const used = getUsedClipIds();
    const found = await searchVideos(query, getPexelsKey(), duration, page, fps, width, height);
    // Select extra footage (buffer) so failed downloads don't shorten the video.
    const selected = selectClips(found, Math.ceil(duration * 1.7) + perClipCap, perClipCap, used);
    if (selected.length === 0) throw new Error(`No usable clips for “${label}”.`);

    const { music, label: musicLabel } = await resolveMusic(index, duration, onProgress, flags);

    const { blob, duration: outDur, usedClips } = await generateVideo({
      clips: selected, width, height, crf: quality.crf, fps, perClipCap,
      targetDuration: duration, music, onProgress,
    });

    addUsedClipIds(usedClips.map((c) => c.id));

    return {
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(blob),
      blob,
      duration: outDur,
      clips: usedClips,
      themeLabel: label,
      aspectLabel: `${aspect.label} · ${fps}fps`,
      musicLabel,
      createdAt: new Date().toISOString(),
      elapsedMs: performance.now() - started,
    };
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch { /* */ }

    setErrorDetails("");
    setShowOverlay(true);
    setIsProcessing(true);

    const total = count;
    const failures: string[] = [];
    const flags = { jamendoFellBack: false };
    let made = 0;
    const batchStart = performance.now();

    for (let i = 0; i < total; i++) {
      try {
        const r = await generateOne(i, total, flags);
        made++;
        setResults((prev) => [r, ...prev]);
      } catch (err) {
        console.error(`[generate] video ${i + 1} failed:`, err);
        const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
        failures.push(`Video ${i + 1}: ${msg}`);
      }
    }

    setIsProcessing(false);

    if (made === 0) {
      const log = getRecentFfmpegLog();
      setProgress({ stage: "error", progress: 0, message: failures[0] ?? "Generation failed." });
      setErrorDetails((failures.join("\n") + (log ? `\n\n— ffmpeg log —\n${log}` : "")).trim());
      toast({ title: "Generation failed", description: failures[0] ?? "See details.", variant: "destructive" });
      notify("Video Generator", "Generation failed — open the tab for details.");
    } else {
      setShowOverlay(false);
      const totalMs = performance.now() - batchStart;
      const avgMs = totalMs / made;
      const timeStr = total > 1
        ? `${formatElapsed(totalMs)} total (~${formatElapsed(avgMs)}/video)`
        : `in ${formatElapsed(totalMs)}`;
      const desc = failures.length
        ? `${failures.length} failed; the rest are below. Took ${formatElapsed(totalMs)}.`
        : `Done ${timeStr}.`;
      toast({ title: `${made} video${made > 1 ? "s" : ""} ready`, description: desc });
      notify("Your videos are ready", `${made} video${made > 1 ? "s" : ""} in ${formatElapsed(totalMs)} — waiting for download.`);
      if (flags.jamendoFellBack) {
        toast({
          title: "Jamendo unavailable",
          description: "Couldn't fetch Jamendo tracks (check the client id in Settings, or CORS). Used generated music instead.",
          variant: "destructive",
        });
      }
    }
  }

  function downloadResult(r: VideoResult) {
    const a = document.createElement("a");
    a.href = r.url;
    a.download = `video-${r.themeLabel.replace(/\s+/g, "-").toLowerCase()}-${r.id}.mp4`;
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function downloadAll() {
    for (const r of results) { downloadResult(r); await new Promise((res) => setTimeout(res, 600)); }
  }
  function clearResults() {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setResults([]);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10"><Video className="h-5 w-5 text-primary" /></div>
            <div className="leading-tight">
              <h1 className="text-lg font-semibold">Video Generator</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">runs entirely in your browser</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings"><Button variant="ghost" size="icon" aria-label="Settings"><Settings className="h-5 w-5" /></Button></Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        {!keyReady && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Add your Pexels API key</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>A free Pexels API key is needed to fetch clips. It's stored only in your browser.</span>
              <Link href="/settings"><Button variant="outline" size="sm">Open Settings</Button></Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" /> Create your video{count > 1 ? "s" : ""}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Clips are fetched from Pexels and stitched locally with ffmpeg.wasm. Batch mode makes several unique videos in a row.
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                <ThemeSelector
                  themeId={themeId}
                  customQuery={customQuery}
                  onSelectTheme={(id) => { setThemeId(id); setCustomQuery(""); }}
                  onCustomQuery={setCustomQuery}
                />
                <Separator />
                <OptionSelector label="How many videos" labelIcon={Layers} items={batchCounts} value={batch} onChange={setBatch} />
                <Separator />
                <OptionSelector label="Aspect ratio" labelIcon={Ratio} items={aspectRatios} value={aspectId} onChange={setAspectId} />
                <Separator />
                <OptionSelector label="Quality" labelIcon={Gauge} items={qualities.map((q) => ({ id: q.id, label: q.label, icon: Gauge }))} value={qualityId} onChange={setQualityId} />
                <Separator />
                <OptionSelector label="Framerate" labelIcon={Film} items={framerates} value={fpsId} onChange={setFpsId} />
                <Separator />
                <DurationSlider value={duration} onChange={setDuration} min={10} max={600} step={5} />
                <Separator />
                <MusicSelector
                  source={musicSource}
                  genGenre={genGenre}
                  jamGenre={jamGenre}
                  jamendoReady={jamReady}
                  file={musicFile}
                  volume={musicVolume}
                  onSource={setMusicSource}
                  onGenGenre={setGenGenre}
                  onJamGenre={setJamGenre}
                  onFile={setMusicFile}
                  onVolume={setMusicVolume}
                />

                {isHeavy && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Big batches, long durations, 60fps or 1080p take a while to encode in the browser and use a lot of memory. You can switch tabs — you'll get a notification when it's done. Don't close the tab.
                  </p>
                )}

                <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full py-6 text-lg" size="lg">
                  <Play className="h-5 w-5 mr-2" /> Generate {count > 1 ? `${count} videos` : "video"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Video className="h-5 w-5" /> Results</h2>
            <ResultsGallery results={results} onDownload={downloadResult} onDownloadAll={downloadAll} onClear={clearResults} />
          </div>
        </div>
      </main>

      <ProgressPanel progress={progress} visible={showOverlay} details={errorDetails} onClose={() => setShowOverlay(false)} />
    </div>
  );
}
