import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Film, Clock, RotateCcw, Users } from "lucide-react";
import type { VideoResult } from "@/lib/constants";

interface Props {
  result: VideoResult | null;
  onDownload: () => void;
  onReset: () => void;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VideoPreview({ result, onDownload, onReset }: Props) {
  if (!result) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-muted/30">
        <CardContent className="flex flex-col items-center gap-4 text-center p-8">
          <div className="p-6 rounded-full bg-muted/50">
            <Film className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No video yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Pick a theme and settings, then hit Generate. Everything runs right here in your browser.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const credits = Array.from(new Set(result.clips.map((c) => c.videographer))).slice(0, 6);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-black relative">
          <video src={result.url} controls autoPlay loop className="w-full max-h-[70vh] object-contain" />
        </div>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Film className="h-3 w-3" /> {result.themeLabel}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              {result.aspectLabel}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {fmt(result.duration)}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {result.clips.length} clips
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Clips via Pexels. Credit: {credits.join(", ")}
            {result.clips.length > credits.length ? " and others" : ""}.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" /> Download MP4
            </Button>
            <Button variant="outline" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-2" /> New video
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
