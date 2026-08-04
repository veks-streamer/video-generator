import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, DownloadCloud, Trash2, Film, Clock, Music, Timer, MonitorPlay } from "lucide-react";
import type { VideoResult } from "@/lib/constants";
import { formatElapsed } from "@/lib/constants";

interface Props {
  results: VideoResult[];
  usage?: string;
  onDownload: (r: VideoResult) => void;
  onDownloadAll: () => void;
  onClear: () => void;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function ResultsGallery({ results, usage, onDownload, onDownloadAll, onClear }: Props) {
  if (results.length === 0) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-muted/30">
        <CardContent className="flex flex-col items-center gap-4 text-center p-8">
          <div className="p-6 rounded-full bg-muted/50">
            <Film className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No videos yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Choose your settings and hit Generate. Batch results show up here, each one unique.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {results.length} video{results.length > 1 ? "s" : ""}
          {" · "}
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {formatElapsed(results.reduce((a, r) => a + r.elapsedMs, 0))} total
          </span>
          {usage ? <span className="ml-1">· {usage} stored</span> : null}
        </span>
        <div className="flex gap-2">
          <Button size="sm" onClick={onDownloadAll}>
            <DownloadCloud className="h-4 w-4 mr-2" /> Download all
          </Button>
          <Button size="sm" variant="outline" onClick={onClear} title="Delete all saved videos from this browser to free space">
            <Trash2 className="h-4 w-4 mr-2" /> Clear cache
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        <Timer className="h-3 w-3 inline mr-1" />
        Times show how long each video took to <strong>generate</strong> — not the video's length.
        Videos are saved in this browser and stay here across visits until you press <strong>Clear cache</strong>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {results.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            <div className="bg-black">
              <video src={r.url} controls loop className="w-full aspect-video object-contain" />
            </div>
            <CardContent className="p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="flex items-center gap-1 text-[11px]">
                  <Film className="h-3 w-3" /> {r.themeLabel}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-[11px]">
                  <MonitorPlay className="h-3 w-3" /> {r.aspectLabel}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-[11px]">
                  <Clock className="h-3 w-3" /> {fmt(r.duration)}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-[11px]">
                  <Music className="h-3 w-3" /> {r.musicLabel}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1 text-[11px]" title="Time it took to generate this video">
                  <Timer className="h-3 w-3" /> {formatElapsed(r.elapsedMs)} to make
                </Badge>
              </div>
              <Button size="sm" className="w-full" onClick={() => onDownload(r)}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
