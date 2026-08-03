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
import { generateVideo } from "@/lib/video-generator";

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

  const [isProcessing, setIsProcessing] = useState(false);
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

  async function handleGenerate() {
    if (!canGenerate) return;
    setResult(null);
    setIsProcessing(true);
    setProgress({ stage: "searching", progress: 2, message: "Searching Pexels for clips…" });

    try {
      const aspect = aspectRatios.find((a) => a.id === aspectId)!;
      const quality = qualities.find((q) => q.id === qualityId)!;
      const width = even(aspect.width * quality.scale);
      const height = even(aspect.height * quality.scale);

      const found = await searchVideos(query, getPexelsKey(), duration);
      const selected = selectClips(found, duration, 6);
      if (selected.length === 0) throw new Error("No usable clips returned. Try another theme.");

      const themeLabel = customQuery.trim()
        ? customQuery.trim()
        : themes.find((t) => t.id === themeId)?.label ?? "Custom";

      const { blob, duration: outDur, usedClips } = await generateVideo({
        clips: selected,
        width,
        height,
        crf: quality.crf,
        perClipCap: 6,
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
      toast({ title: "Video ready", description: "Preview and download it on the right." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Video generation failed.";
      setProgress({ stage: "error", progress: 0, message });
      setIsProcessing(false);
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
                <DurationSlider value={duration} onChange={setDuration} />
                <Separator />
                <MusicPicker file={musicFile} volume={musicVolume} onFile={setMusicFile} onVolume={setMusicVolume} />

                <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full py-6 text-lg" size="lg">
                  <Play className="h-5 w-5 mr-2" /> Generate video
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Tip: longer or higher-quality videos take more time to encode in the browser.
                </p>
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

      <ProgressPanel progress={progress} visible={isProcessing} />
    </div>
  );
}
