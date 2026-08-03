import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return sec === 0 ? `${m}m` : `${m}m ${sec}s`;
}

export function DurationSlider({ value, onChange, min = 10, max = 120 }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium uppercase tracking-wide flex items-center gap-2">
          <Clock className="h-4 w-4" /> Duration
        </Label>
        <span className="text-3xl font-bold tabular-nums font-mono">{fmt(value)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={5}
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
