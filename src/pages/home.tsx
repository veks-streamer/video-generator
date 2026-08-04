import { useEffect, useRef, useState } from "react";
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
import { ActivityLog, type LogEntry, type LogLevel } from "@/components/activity-log";
import { Play, Plus, Sparkles, Video, Settings, AlertTriangle, Ratio, Gauge, Layers, Film, Cpu, Loader2, X, Maximize2 } from "lucide-react";
import {
  aspectRatios, qualities, framerates, encodingModes, fastStdSize, MODE_FAST,
  videoSources, VSOURCE_PIXABAY, themes, randomTheme, RANDOM_THEME_ID, formatElapsed,
  generativeGenres, jamendoGenres, MUSIC_NONE, MUSIC_JAMENDO, MUSIC_UPLOAD, MUSIC_RANDOM,
} from "@/lib/constants";
import type { ProgressUpdate, VideoResult, Theme } from "@/lib/constants";
import {
  hasPexelsKey, getPexelsKey, getUsedClipIds, addUsedClipIds, nextQueryPage,
  getJamendoKey, hasJamendoKey, getUsedTrackIds, addUsedTrackIds,
  getPixabayKey, hasPixabayKey,
} from "@/lib/storage";
import { searchVideos, selectClips } from "@/lib/pexels";
import { searchPixabay } from "@/lib/pixabay";
import { generateVideo, getRecentFfmpegLog } from "@/lib/video-generator";
import { generateMusic } from "@/lib/music";
import { searchJamendo, downloadAudio } from "@/lib/jamendo";
import { saveVideo, getAllVideos, clearVideos, estimateUsage, type StoredVideo } from "@/lib/idb";

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

const batchCounts = [
  { id: "1", label: "1 video", icon: Video },
  { id: "5", label: "5 videos", icon: Layers },
  { id: "10", label: "10 videos", icon: Layers },
  { id: "15", label: "15 videos", icon: Layers },
  { id: "20", label: "20 videos", icon: Layers },
];

const genLabel = (id: string) => generativeGenres.find((g) => g.id === id)?.label ?? id;

function notify(title: string, body: string) {
  try { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body }); } catch { /* */ }
}
function storedToResult(s: StoredVideo): VideoResult {
  return { id: s.id, url: URL.createObjectURL(s.blob), blob: s.blob, duration: s.duration,
    themeLabel: s.themeLabel, aspectLabel: s.aspectLabel, musicLabel: s.musicLabel, createdAt: s.createdAt, elapsedMs: s.elapsedMs };
}

interface Snap {
  themeId: string | null; customQuery: string;
  aspectId: string; qualityId: string; fpsId: string; mode: string; duration: number;
  videoSource: string; musicSource: string; genGenre: string; jamGenre: string;
  musicFile: File | null; musicVolume: number; count: number;
}
interface Job { id: string; label: string; snap: Snap }
interface RunFlags { jamendoFellBack: boolean; jamendoError: string }

export default function Home() {
  const { toast } = useToast();
  const [keyReady, setKeyReady] = useState(hasPexelsKey());
  const [jamReady, setJamReady] = useState(hasJamendoKey());
  const [pixReady, setPixReady] = useState(hasPixabayKey());

  // ---- defaults requested by the user ----
  const [themeId, setThemeId] = useState<string | null>(RANDOM_THEME_ID);
  const [customQuery, setCustomQuery] = useState("");
  const [aspectId, setAspectId] = useState("landscape");
  const [qualityId, setQualityId] = useState("hd");
  const [fpsId, setFpsId] = useState("30");
  const [mode, setMode] = useState(MODE_FAST);
  const [duration, setDuration] = useState(60);
  const [batch, setBatch] = useState("1");
  const [videoSource, setVideoSource] = useState("pexels");
  const [musicSource, setMusicSource] = useState(MUSIC_JAMENDO);
  const [genGenre, setGenGenre] = useState("uplifting");
  const [jamGenre, setJamGenre] = useState(MUSIC_RANDOM);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.8);

  const [showOverlay, setShowOverlay] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorDetails, setErrorDetails] = useState("");
  const [progress, setProgress] = useState<ProgressUpdate>({ stage: "loading", progress: 0, message: "" });
  const [results, setResults] = useState<VideoResult[]>([]);
  const [usage, setUsage] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [queueView, setQueueView] = useState<Job[]>([]);

  const queueRef = useRef<Job[]>([]);
  const runningRef = useRef(false);
  const addLog = (level: LogLevel, msg: string) => setLogs((prev) => [...prev, { t: Date.now(), level, msg }].slice(-500));
  const syncQueue = () => setQueueView([...queueRef.current]);
  const refreshUsage = () => estimateUsage().then(setUsage);

  useEffect(() => { getAllVideos().then((l) => setResults(l.map(storedToResult))).catch(() => {}); refreshUsage(); }, []);
  useEffect(() => {
    const onFocus = () => { setKeyReady(hasPexelsKey()); setJamReady(hasJamendoKey()); setPixReady(hasPixabayKey()); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  useEffect(() => {
    if (!processing) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [processing]);

  const usePixabay = videoSource === VSOURCE_PIXABAY;
  const sourceReady = usePixabay ? pixReady : keyReady;
  const hasTheme = customQuery.trim().length > 0 || !!themeId;
  const isFast = mode === MODE_FAST;
  const fastSquareBlocked = isFast && aspectId === "square";
  const canEnqueue = sourceReady && hasTheme;
  const count = parseInt(batch, 10) || 1;
  const isHeavy = !isFast && (duration > 180 || qualityId === "hd" || fpsId === "60" || count >= 10);

  function currentSnap(): Snap {
    return { themeId, customQuery, aspectId, qualityId, fpsId, mode, duration, videoSource, musicSource, genGenre, jamGenre, musicFile, musicVolume, count };
  }
  function describe(s: Snap): string {
    const t = s.customQuery.trim() || (s.themeId === RANDOM_THEME_ID ? "random" : s.themeId);
    const fps = framerates.find((f) => f.id === s.fpsId)?.fps ?? s.fpsId;
    return `${s.count}× ${t} · ${s.duration}s · ${fps}fps · ${s.qualityId} · ${s.mode}`;
  }
  function pickTheme(s: Snap): { query: string; label: string } {
    if (s.customQuery.trim()) return { query: s.customQuery.trim(), label: s.customQuery.trim() };
    if (s.themeId === RANDOM_THEME_ID) { const t = randomTheme(); return { query: t.query, label: t.label }; }
    const t = themes.find((x) => x.id === s.themeId) as Theme;
    return { query: t.query, label: t.label };
  }

  async function resolveMusic(
    s: Snap, index: number, targetLen: number,
    onProgress: (p: ProgressUpdate) => void, flags: RunFlags, jamCache: Map<string, any[]>,
  ): Promise<{ music: { bytes: Uint8Array; loop: boolean; volume: number } | null; label: string }> {
    const vol = s.musicVolume;
    if (s.musicSource === MUSIC_NONE) return { music: null, label: "No music" };

    if (s.musicSource === MUSIC_UPLOAD) {
      if (!s.musicFile) return { music: null, label: "No music" };
      const bytes = new Uint8Array(await s.musicFile.arrayBuffer());
      return { music: { bytes, loop: true, volume: vol }, label: s.musicFile.name };
    }

    if (s.musicSource === MUSIC_JAMENDO) {
      // STRICT Jamendo. Try the chosen genre first, then other genres, and
      // several tracks each, before giving up (never generates).
      if (!hasJamendoKey()) {
        flags.jamendoFellBack = true; flags.jamendoError = "No Jamendo Client ID set — add it in Settings.";
        addLog("warn", `Video ${index + 1}: Jamendo selected but no Client ID — no music.`);
        return { music: null, label: "No music (Jamendo not configured)" };
      }
      const all = jamendoGenres.filter((g) => g.id !== MUSIC_RANDOM).map((g) => g.id);
      const order = s.jamGenre === MUSIC_RANDOM
        ? shuffle(all)
        : [s.jamGenre, ...shuffle(all.filter((g) => g !== s.jamGenre))];
      const used = getUsedTrackIds();
      let lastErr = "";
      onProgress({ stage: "audio", progress: 3, message: "Finding a Jamendo track…" });
      for (const genre of order) {
        let tracks = jamCache.get(genre);
        if (tracks === undefined) {
          try { tracks = await searchJamendo(getJamendoKey(), genre, 200); }
          catch (e) { lastErr = e instanceof Error ? e.message : String(e); tracks = []; }
          jamCache.set(genre, tracks);
        }
        if (!tracks.length) continue;
        const candidates = [...tracks.filter((t: any) => !used.has(t.id)), ...tracks].sort(() => Math.random() - 0.5);
        for (let a = 0; a < Math.min(8, candidates.length); a++) {
          const t = candidates[a];
          onProgress({ stage: "audio", progress: 4, message: `Downloading “${t.name}”…` });
          for (const url of [t.audio, t.audiodownload].filter(Boolean) as string[]) {
            try {
              const bytes = await downloadAudio(url);
              addUsedTrackIds([t.id]);
              addLog("info", `Video ${index + 1}: Jamendo “${t.name}” — ${t.artist} [${genre}]`);
              return { music: { bytes, loop: true, volume: vol }, label: `${t.name} — ${t.artist}` };
            } catch (e) { lastErr = e instanceof Error ? e.message : String(e); }
          }
        }
      }
      flags.jamendoFellBack = true;
      flags.jamendoError = lastErr || "No commercial-licensed tracks available in any genre.";
      addLog("warn", `Video ${index + 1}: Jamendo — ${flags.jamendoError} (no music)`);
      return { music: null, label: "No music (Jamendo)" };
    }

    // Generated
    onProgress({ stage: "audio", progress: 3, message: "Composing background music…" });
    const seed = (Date.now() ^ (index * 2654435761) ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const { bytes, genreId } = await generateMusic(s.genGenre, seed, targetLen);
    return { music: { bytes, loop: false, volume: vol }, label: genLabel(genreId) };
  }

  async function generateOne(s: Snap, index: number, total: number, flags: RunFlags, jamCache: Map<string, any[]>): Promise<VideoResult> {
    const started = performance.now();
    const prefix = total > 1 ? `Video ${index + 1}/${total} — ` : "";
    const onProgress = (p: ProgressUpdate) => setProgress({ ...p, message: prefix + p.message });

    const aspect = aspectRatios.find((a) => a.id === s.aspectId)!;
    const quality = qualities.find((q) => q.id === s.qualityId)!;
    const fps = framerates.find((f) => f.id === s.fpsId)!.fps;
    const perClipCap = s.duration > 180 ? 12 : 6;
    const fast = s.mode === MODE_FAST;
    const pix = s.videoSource === VSOURCE_PIXABAY;

    let width: number, height: number, exact: boolean;
    if (fast) {
      const std = fastStdSize(s.aspectId, s.qualityId);
      if (!std) throw new Error("Fast mode doesn't support Square. Use Standard mode or another aspect ratio.");
      width = std.w; height = std.h; exact = true;
    } else {
      width = even(aspect.width * quality.scale); height = even(aspect.height * quality.scale); exact = false;
    }

    if (pix && fast) throw new Error("Pixabay works in Standard mode only. Use Pexels for Fast mode.");
    if (pix && !hasPixabayKey()) throw new Error("Add your Pixabay API key in Settings to use Pixabay.");

    const { query, label } = pickTheme(s);
    onProgress({ stage: "searching", progress: 2, message: `Searching ${pix ? "Pixabay" : "Pexels"} “${label}” (${width}×${height} @ ${fps}fps)…` });
    const page = nextQueryPage(query);
    const used = getUsedClipIds();
    const found = pix
      ? await searchPixabay(query, getPixabayKey(), s.duration, page, fps, width, height)
      : await searchVideos(query, getPexelsKey(), s.duration, page, fps, width, height, exact);
    const selected = selectClips(found, Math.ceil(s.duration * 1.7) + perClipCap, perClipCap, used);
    addLog("info", `Video ${index + 1}/${total}: “${label}” — ${found.length} found, using ${selected.length} (${width}×${height}@${fps}, ${pix ? "Pixabay" : "Pexels"}${fast ? ", fast" : ""})`);
    if (selected.length === 0) throw new Error(`No usable clips for “${label}”.`);

    const { music, label: musicLabel } = await resolveMusic(s, index, s.duration, onProgress, flags, jamCache);
    addLog("info", `Video ${index + 1}/${total}: music = ${musicLabel}`);

    const { blob, duration: outDur, usedClips } = await generateVideo({
      clips: selected, width, height, crf: quality.crf, fps, perClipCap, targetDuration: s.duration, fast, music, onProgress,
    });
    addUsedClipIds(usedClips.map((c) => c.id));
    addLog("info", `Video ${index + 1}/${total}: done — ${Math.round(outDur)}s in ${formatElapsed(performance.now() - started)}`);

    const result: VideoResult = {
      id: `${Date.now()}-${index}-${Math.floor(Math.random() * 1e4)}`,
      url: URL.createObjectURL(blob), blob, duration: outDur,
      themeLabel: label, aspectLabel: `${aspect.label} · ${fps}fps${fast ? " · fast" : ""}`,
      musicLabel, createdAt: new Date().toISOString(), elapsedMs: performance.now() - started,
    };
    await saveVideo({ id: result.id, blob, duration: outDur, themeLabel: result.themeLabel, aspectLabel: result.aspectLabel, musicLabel: result.musicLabel, createdAt: result.createdAt, elapsedMs: result.elapsedMs }).catch(() => {});
    return result;
  }

  async function processQueue() {
    if (runningRef.current) return;
    runningRef.current = true;
    setProcessing(true);
    setShowOverlay(true);
    setErrorDetails("");

    while (queueRef.current.length > 0) {
      const job = queueRef.current[0];
      const s = job.snap;
      const total = s.count;
      const flags: RunFlags = { jamendoFellBack: false, jamendoError: "" };
      const jamCache = new Map<string, any[]>();
      let made = 0; const failures: string[] = [];
      const jobStart = performance.now();
      addLog("info", `Starting job: ${job.label}`);

      for (let i = 0; i < total; i++) {
        try {
          const r = await generateOne(s, i, total, flags, jamCache);
          made++; setResults((prev) => [r, ...prev]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
          failures.push(`Video ${i + 1}: ${msg}`);
          addLog("error", `Video ${i + 1}/${total} FAILED: ${msg}`);
          const flog = getRecentFfmpegLog();
          if (flog) addLog("error", `ffmpeg: ${flog.split("\\n").slice(-3).join(" | ")}`);
        }
      }

      const jobMs = performance.now() - jobStart;
      addLog(failures.length ? "warn" : "info", `Job done: ${made}/${total} ok${failures.length ? `, ${failures.length} failed` : ""} in ${formatElapsed(jobMs)}`);
      refreshUsage();
      if (made > 0) {
        toast({ title: `${made} video${made > 1 ? "s" : ""} ready`, description: `${describe(s)} · ${formatElapsed(jobMs)}${failures.length ? ` · ${failures.length} failed` : ""}` });
        notify("Your videos are ready", `${made} video${made > 1 ? "s" : ""} in ${formatElapsed(jobMs)}.`);
      } else {
        toast({ title: "Job failed", description: failures[0] ?? "See the activity log.", variant: "destructive" });
        notify("Video Generator", "A job failed — check the activity log.");
      }
      if (flags.jamendoFellBack) toast({ title: "Jamendo note", description: `${flags.jamendoError} Affected videos were exported without music.`, variant: "destructive" });

      queueRef.current.shift();
      syncQueue();
    }

    runningRef.current = false;
    setProcessing(false);
    setShowOverlay(false);
    setMinimized(false);
  }

  function handleGenerate() {
    if (!canEnqueue) return;
    if (fastSquareBlocked) {
      toast({ title: "Fast mode + Square", description: "Fast mode can't do Square. Pick another aspect ratio or use Standard mode.", variant: "destructive" });
      return;
    }
    (async () => { try { if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch { /* */ } })();

    const snap = currentSnap();
    const job: Job = { id: `job-${Date.now()}`, label: describe(snap), snap };
    queueRef.current.push(job);
    syncQueue();

    if (runningRef.current) {
      addLog("info", `Queued: ${job.label}`);
      toast({ title: "Added to queue", description: job.label });
    } else {
      processQueue();
    }
  }

  function removeJob(id: string) {
    // don't remove the job that's currently running (index 0 while processing)
    queueRef.current = queueRef.current.filter((j, idx) => !(j.id === id && !(idx === 0 && runningRef.current)));
    syncQueue();
  }

  function downloadResult(r: VideoResult) {
    const a = document.createElement("a");
    a.href = r.url; a.download = `video-${r.themeLabel.replace(/\s+/g, "-").toLowerCase()}-${r.id}.mp4`;
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function downloadAll() { for (const r of results) { downloadResult(r); await new Promise((res) => setTimeout(res, 600)); } }
  async function clearResults() {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setResults([]); await clearVideos().catch(() => {}); refreshUsage();
    toast({ title: "Cleared", description: "Saved videos removed from this browser." });
  }

  const pendingAfterCurrent = Math.max(0, queueView.length - (processing ? 1 : 0));

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
        {!sourceReady && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Add your {usePixabay ? "Pixabay" : "Pexels"} API key</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>A free {usePixabay ? "Pixabay" : "Pexels"} API key is needed to fetch clips. It's stored only in your browser.</span>
              <Link href="/settings"><Button variant="outline" size="sm">Open Settings</Button></Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Create your video{count > 1 ? "s" : ""}</CardTitle>
                <p className="text-muted-foreground text-sm">Clips are fetched from Pexels/Pixabay and assembled locally. Queue as many jobs as you like — they run one after another.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <ThemeSelector themeId={themeId} customQuery={customQuery} onSelectTheme={(id) => { setThemeId(id); setCustomQuery(""); }} onCustomQuery={setCustomQuery} />
                <Separator />
                <OptionSelector label="How many videos" labelIcon={Layers} items={batchCounts} value={batch} onChange={setBatch} />
                <Separator />
                <OptionSelector label="Aspect ratio" labelIcon={Ratio} items={aspectRatios} value={aspectId} onChange={setAspectId} />
                <Separator />
                <OptionSelector label="Quality" labelIcon={Gauge} items={qualities.map((q) => ({ id: q.id, label: q.label, icon: Gauge }))} value={qualityId} onChange={setQualityId} />
                <Separator />
                <OptionSelector label="Framerate" labelIcon={Film} items={framerates} value={fpsId} onChange={setFpsId} />
                <Separator />
                <OptionSelector label="Video source" labelIcon={Video} items={videoSources} value={videoSource} onChange={setVideoSource} />
                {usePixabay && (<p className="text-xs text-muted-foreground -mt-4">Pixabay is royalty-free for commercial use (no attribution). It doesn't expose framerate, so it runs in <strong>Standard mode only</strong>. For native fps / Fast mode, use Pexels.</p>)}
                <Separator />
                <OptionSelector label="Mode" labelIcon={Cpu} items={encodingModes} value={mode} onChange={setMode} />
                {isFast && (<p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5 -mt-4"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />Fast mode joins same-size clips without re-encoding — much faster. Length is approximate. (Square not supported.)</p>)}
                <Separator />
                <DurationSlider value={duration} onChange={setDuration} min={10} max={600} step={5} />
                <Separator />
                <MusicSelector source={musicSource} genGenre={genGenre} jamGenre={jamGenre} jamendoReady={jamReady} file={musicFile} volume={musicVolume} onSource={setMusicSource} onGenGenre={setGenGenre} onJamGenre={setJamGenre} onFile={setMusicFile} onVolume={setMusicVolume} />

                {isHeavy && (<p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />Big/long/1080p/60fps jobs take a while. Try <strong>Fast mode</strong>. You can queue more and switch tabs — you'll get a notification. Don't close the tab.</p>)}

                <Button onClick={handleGenerate} disabled={!canEnqueue} className="w-full py-6 text-lg" size="lg">
                  {processing ? <><Plus className="h-5 w-5 mr-2" /> Add to queue ({count > 1 ? `${count} videos` : "1 video"})</> : <><Play className="h-5 w-5 mr-2" /> Generate {count > 1 ? `${count} videos` : "video"}</>}
                </Button>

                {queueView.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Queue ({queueView.length})</p>
                    {queueView.map((j, idx) => {
                      const running = idx === 0 && processing;
                      return (
                        <div key={j.id} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs">
                          <span className="truncate flex items-center gap-1.5">
                            {running ? <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" /> : <span className="opacity-50">#{idx + 1}</span>}
                            {j.label}
                          </span>
                          {!running && (
                            <button onClick={() => removeJob(j.id)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Remove from queue"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Video className="h-5 w-5" /> Results</h2>
            <ResultsGallery results={results} usage={usage} onDownload={downloadResult} onDownloadAll={downloadAll} onClear={clearResults} />
          </div>
        </div>

        <ActivityLog logs={logs} onClear={() => setLogs([])} />
      </main>

      <ProgressPanel progress={progress} visible={showOverlay && !minimized} details={errorDetails} queueCount={pendingAfterCurrent} onClose={() => setShowOverlay(false)} onMinimize={() => setMinimized(true)} />

      {processing && minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border bg-card shadow-lg px-4 py-3 text-left hover-elevate max-w-[90vw]"
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{Math.round(progress.progress)}% · {progress.message}</p>
            <p className="text-[11px] text-muted-foreground">{pendingAfterCurrent > 0 ? `${pendingAfterCurrent} more queued · ` : ""}tap to expand</p>
          </div>
          <Maximize2 className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      )}
    </div>
  );
}
