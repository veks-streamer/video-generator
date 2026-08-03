import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { themes } from "@/lib/constants";
import { Film, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  themeId: string | null;
  customQuery: string;
  onSelectTheme: (id: string, query: string) => void;
  onCustomQuery: (q: string) => void;
}

export function ThemeSelector({ themeId, customQuery, onSelectTheme, onCustomQuery }: Props) {
  const [local, setLocal] = useState(customQuery);

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium uppercase tracking-wide flex items-center gap-2">
        <Film className="h-4 w-4" /> Theme
      </Label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {themes.map((t) => {
          const Icon = t.icon;
          const selected = themeId === t.id && !customQuery;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setLocal(""); onSelectTheme(t.id, t.query); }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all hover-elevate active-elevate-2",
                selected ? "border-primary bg-primary/10" : "border-transparent bg-muted/50",
              )}
            >
              <Icon className={cn("h-6 w-6", selected ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium", selected ? "text-foreground" : "text-muted-foreground")}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="theme-search"
          name="theme-search"
          type="search"
          aria-label="Custom search term"
          value={local}
          placeholder="…or type your own search term (e.g. northern lights)"
          className="pl-9"
          onChange={(e) => { setLocal(e.target.value); onCustomQuery(e.target.value); }}
        />
      </div>
    </div>
  );
}
