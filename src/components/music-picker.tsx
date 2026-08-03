import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Music, Upload, X } from "lucide-react";

interface Props {
  file: File | null;
  volume: number;
  onFile: (f: File | null) => void;
  onVolume: (v: number) => void;
}

export function MusicPicker({ file, volume, onFile, onVolume }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium uppercase tracking-wide flex items-center gap-2">
        <Music className="h-4 w-4" /> Background music
        <span className="ml-1 text-xs font-normal normal-case text-muted-foreground">(optional)</span>
      </Label>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {!file ? (
        <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" /> Upload an audio track
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <span className="text-sm truncate">{file.name}</span>
            <Button variant="ghost" size="icon" onClick={() => onFile(null)} aria-label="Remove track">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16">Volume</span>
            <Slider value={[volume]} onValueChange={([v]) => onVolume(v)} min={0} max={1} step={0.05} />
            <span className="text-xs tabular-nums w-10 text-right">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        No track? The montage is exported without audio (stock B-roll is usually silent).
      </p>
    </div>
  );
}
