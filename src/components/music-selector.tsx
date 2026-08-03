import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { musicMoods, MUSIC_NONE, MUSIC_UPLOAD, MUSIC_RANDOM } from "@/lib/constants";
import { Music, Ban, Shuffle, Upload, X } from "lucide-react";

interface Props {
  musicId: string;
  file: File | null;
  volume: number;
  onMusicId: (id: string) => void;
  onFile: (f: File | null) => void;
  onVolume: (v: number) => void;
}

export function MusicSelector({ musicId, file, volume, onMusicId, onFile, onVolume }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const options = [
    { id: MUSIC_NONE, label: "None", icon: Ban },
    ...musicMoods,
    { id: MUSIC_RANDOM, label: "Random", icon: Shuffle },
    { id: MUSIC_UPLOAD, label: "Upload", icon: Upload },
  ];

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium uppercase tracking-wide flex items-center gap-2">
        <Music className="h-4 w-4" /> Background music
      </Label>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {options.map((o) => {
          const Icon = o.icon;
          const selected = musicId === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onMusicId(o.id);
                if (o.id === MUSIC_UPLOAD) setTimeout(() => inputRef.current?.click(), 0);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all hover-elevate active-elevate-2",
                selected ? "border-primary bg-primary/10" : "border-transparent bg-muted/50",
              )}
            >
              <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[11px] font-medium", selected ? "text-foreground" : "text-muted-foreground")}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>

      <input
        ref={inputRef}
        id="music-file"
        name="music-file"
        aria-label="Background music file"
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {musicId === MUSIC_UPLOAD && file && (
        <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
          <span className="text-sm truncate">{file.name}</span>
          <button onClick={() => onFile(null)} aria-label="Remove track" className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {musicId !== MUSIC_NONE && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">Volume</span>
          <Slider value={[volume]} onValueChange={([v]) => onVolume(v)} min={0} max={1} step={0.05} />
          <span className="text-xs tabular-nums w-10 text-right">{Math.round(volume * 100)}%</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {musicId === MUSIC_UPLOAD
          ? "Your track is looped/trimmed to the video length with a fade-out."
          : musicId === MUSIC_NONE
          ? "The montage is exported without audio."
          : "Music is generated in your browser — unique every time, royalty-free. For a batch, “Random” varies the mood per video."}
      </p>
    </div>
  );
}
