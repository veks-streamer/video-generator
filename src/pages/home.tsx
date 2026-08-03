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
import { MusicPicker } from "@/components/music-picker";
import { ProgressPanel } from "@/components/progress-panel";
import { VideoPreview } from "@/components/video-preview";
import { Play, Sparkles, Video, Settings, AlertTriangle, Ratio, Gauge } from "lucide-react";
import { aspectRatios, qualities, themes } from "@/lib/constants";
import type { ProgressUpdate, VideoResult } from "@/lib/constants";
import { hasPexelsKey, getPexelsKey } from "@/lib/storage";
import { searchVideos, selectClips } from "@/lib/pexels";
import { generateVideo, getRecentFfmpegLog } from "@/lib/video-generator";

function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

export default function Home() {
  const { toast } = useToast();
  const [keyReady, setKeyReady] = useState(hasPexelsKey());

  const [themeId, setThemeId] = useState<string | null>("nature");
  const [customQuery, setCustomQuery] = useState("");
  const [aspectId, setAspectId] = useState("landscape");
  const [qualityId, setQualityId] = useState("balanced");
  const [duration, setDuration] = useState(30);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.7);

  const [showOverlay, setShowOverlay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [progress, setProgress] = useState<ProgressUpdate>({
    stage: "loading", progress: 0, message: "",
  });
  const [result, setResult] = useState<VideoResult | null>(null);

  useEffect(() => {
    const onFocus = () => setKeyReady(hasPexelsKey());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const query = customQuery.trim() || themes.find((t) => t.id === themeId)?.query || "";
  const canGenerate = keyReady && query.length > 0 && !isProcessing;
  const isHeavy = duration > 180 || qualityId === "hd";

  async function handleGenerate() {
    if (!canGenerate) return;
    setResult(null);
    setErrorDetails("");
    setShowOverlay(true);
    setIsProcessing(true);
    setProgress({ stage: "searching", progress: 2, message: "Searching Pexels for clips…" });

    try {
      const aspect = aspectRatios.find((a) => a.id === aspectId)!;
      const quality = qualities.find((q) => q.id === qualityId)!;
      const width = even(aspect.width * quality.scale);
      const height = even(aspect.height * quality.scale);
      // Fewer, longer clips for long videos keeps the browser's memory in check.
      const perClipCap = duration > 180 ? 12 : 6;

      const found = await searchVideos(query, getPexelsKey(), duration);
      const selected = selectClips(found, duration, perClipCap);
      if (selected.length === 0) throw new Error("No usable clips returned. Try another theme.");

      const themeLabel = customQuery.trim()
        ? customQuery.trim()
        : themes.find((t) => t.id === themeId)?.label ?? "Custom";

      const { blob, duration: outDur, usedClips } = await generateVideo({
        clips: selected,
        width,
        height,
        crf: quality.crf,
        perClipCap,
        musicFile,
        musicVolume,
        onProgress: setProgress,
      });

      const url = URL.createObjectURL(blob);
      setResult({
        url,
        blob,
        duration: outDur,
        clips: usedClips,
        themeLabel,
        aspectLabel: aspect.label,
        createdAt: new Date().toISOString(),
      });
      setIsProcessing(false);
      setShowOverlay(false);
      toast({ title: "Video ready", description: "Preview and download it on the right." });
    } catch (err) {
      // Surface the real cause: message in the panel, full detail in console.
      console.error("[generate] failed:", err);
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      const log = getRecentFfmpegLog();
      setErrorDetails(log ? `${message}\n\n— ffmpeg log —\n${log}` : message);
      setProgress({ stage: "error", progress: 0, message });
      setIsProcessing(false);
      // keep the overlay open so the error is readable
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  function handleDownload() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `video-${result.themeLabel.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleReset() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-semibold">Video Generator</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">runs entirely in your browser</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
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
              <Link href="/settings">
                <Button variant="outline" size="sm">Open Settings</Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" /> Create your video
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Pick a theme and settings — clips are fetched from Pexels and stitched together locally with ffmpeg.wasm.
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
                <OptionSelector
                  label="Aspect ratio"
                  labelIcon={Ratio}
                  items={aspectRatios}
                  value={aspectId}
                  onChange={setAspectId}
                />
                <Separator />
                <OptionSelector
                  label="Quality"
                  labelIcon={Gauge}
                  items={qualities.map((q) => ({ id: q.id, label: q.label, icon: Gauge }))}
                  value={qualityId}
                  onChange={setQualityId}
                />
                <Separator />
                <DurationSlider value={duration} onChange={setDuration} min={10} max={600} step={5} />
                <Separator />
                <MusicPicker file={musicFile} volume={musicVolume} onFile={setMusicFile} onVolume={setMusicVolume} />

                {isHeavy && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Long or 1080p videos can take several minutes to encode in the browser and use a lot of memory. Use a desktop browser and keep the tab open.
                  </p>
                )}

                <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full py-6 text-lg" size="lg">
                  <Play className="h-5 w-5 mr-2" /> Generate video
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Video className="h-5 w-5" /> Preview
            </h2>
            <VideoPreview result={result} onDownload={handleDownload} onReset={handleReset} />
          </div>
        </div>
      </main>

      <ProgressPanel
        progress={progress}
        visible={showOverlay}
        details={errorDetails}
        onClose={() => setShowOverlay(false)}
      />
    </div>
  );
}
