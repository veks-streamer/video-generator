import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Item {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  label: string;
  labelIcon: LucideIcon;
  items: Item[];
  value: string;
  onChange: (id: string) => void;
}

export function OptionSelector({ label, labelIcon: LabelIcon, items, value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium uppercase tracking-wide flex items-center gap-2">
        <LabelIcon className="h-4 w-4" /> {label}
      </Label>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => {
          const Icon = it.icon;
          const selected = value === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all hover-elevate active-elevate-2",
                selected ? "border-primary bg-primary/10" : "border-transparent bg-muted/50",
              )}
            >
              <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium text-center leading-tight", selected ? "text-foreground" : "text-muted-foreground")}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
