import { useRef } from "react";
import { Link } from "wouter";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  generativeGenres, jamendoGenres,
  MUSIC_NONE, MUSIC_GENERATED, MUSIC_JAMENDO, MUSIC_UPLOAD,
} from "@/lib/constants";
import { Music, Ban, Sparkles, Radio, Upload, X, AlertTriangle } from "lucide-react";

interface Props {
  source: string;
  genGenre: string;
  jamGenre: string;
  jamendoReady: boolean;
  file: File | null;
  volume: number;
  onSource: (s: string) => void;
  onGenGenre: (g: string) => void;
  onJamGenre: (g: string) => void;
  onFile: (f: File | null) => void;
  onVolume: (v: number) => void;
}

export function MusicSelector(p: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const sources = [
    { id: MUSIC_NONE, label: "None", icon: Ban },
    { id: MUSIC_GENERATED, label: "Generated", icon: Sparkles },
    { id: MUSIC_JAMENDO, label: "Jamendo", icon: Radio },
    { id: MUSIC_UPLOAD, label: "Upload", icon: Upload },
  ];

  const grid = (items: { id: string; label: string; icon: any }[], value: string, onChange: (v: string) => void) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
      {items.map((o) => {
        const Icon = o.icon;
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 transition-all hover-elevate active-elevate-2",
              selected ? "border-primary bg-primary/10" : "border-transparent bg-muted/50",
            )}
          >
            <Icon className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[11px] font-medium", selected ? "text-foreground" : "text-muted-foreground")}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium uppercase tracking-wide flex items-center gap-2">
        <Music className="h-4 w-4" /> Background music
      </Label>

      <div className="grid grid-cols-4 gap-2.5">
        {sources.map((o) => {
          const Icon = o.icon;
          const selected = p.source === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                p.onSource(o.id);
                if (o.id === MUSIC_UPLOAD) setTimeout(() => inputRef.current?.click(), 0);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 transition-all hover-elevate active-elevate-2",
                selected ? "border-primary bg-primary/10" : "border-transparent bg-muted/50",
              )}
            >
              <Icon className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[11px] font-medium", selected ? "text-foreground" : "text-muted-foreground")}>{o.label}</span>
            </button>
          );
        })}
      </div>

      {p.source === MUSIC_GENERATED && (
        <>
          <p className="text-xs text-muted-foreground">Pick a style (Random varies it per video in a batch):</p>
          {grid(generativeGenres, p.genGenre, p.onGenGenre)}
        </>
      )}

      {p.source === MUSIC_JAMENDO && (
        <>
          {!p.jamendoReady && (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500 rounded-lg border border-amber-500/30 p-2.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Jamendo needs a free client id.{" "}
                <Link href="/settings" className="underline">Add it in Settings</Link>. Until then, Generated music is used as a fallback.
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Genre (instrumental, cut to video length; Random varies per video):</p>
          {grid(jamendoGenres, p.jamGenre, p.onJamGenre)}
        </>
      )}

      <input
        ref={inputRef}
        id="music-file"
        name="music-file"
        aria-label="Background music file"
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => p.onFile(e.target.files?.[0] ?? null)}
      />
      {p.source === MUSIC_UPLOAD && p.file && (
        <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
          <span className="text-sm truncate">{p.file.name}</span>
          <button onClick={() => p.onFile(null)} aria-label="Remove track" className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {p.source !== MUSIC_NONE && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">Volume</span>
          <Slider value={[p.volume]} onValueChange={([v]) => p.onVolume(v)} min={0} max={1} step={0.05} />
          <span className="text-xs tabular-nums w-10 text-right">{Math.round(p.volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}
