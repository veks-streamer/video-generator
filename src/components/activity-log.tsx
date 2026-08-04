import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type LogLevel = "info" | "warn" | "error" | "debug";
export interface LogEntry { t: number; level: LogLevel; msg: string }

interface Props {
  logs: LogEntry[];
  debug: boolean;
  onToggleDebug: (v: boolean) => void;
  onClear: () => void;
}

const color: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  warn: "text-amber-600 dark:text-amber-500",
  error: "text-destructive",
  debug: "text-muted-foreground/60",
};

export function ActivityLog({ logs, debug, onToggleDebug, onClear }: Props) {
  const [open, setOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const errors = logs.filter((l) => l.level === "error").length;
  const warns = logs.filter((l) => l.level === "warn").length;

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [logs, open]);

  const copy = () => {
    const text = logs.map((l) => `[${new Date(l.t).toLocaleTimeString()}] ${l.level.toUpperCase()} ${l.msg}`).join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <Card className="mt-8">
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <button className="flex items-center gap-2 text-sm font-medium" onClick={() => setOpen((o) => !o)}>
          <Terminal className="h-4 w-4" /> Activity log
          {errors > 0 && <Badge variant="destructive" className="text-[10px]">{errors} error{errors > 1 ? "s" : ""}</Badge>}
          {warns > 0 && <Badge variant="secondary" className="text-[10px]">{warns} warning{warns > 1 ? "s" : ""}</Badge>}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleDebug(!debug)}
            title="Debug mode — log every ffmpeg command and engine line"
            className={cn("text-[11px] px-2 py-1 rounded-md border mr-1", debug ? "bg-primary/15 border-primary/40 text-primary" : "text-muted-foreground")}
          >
            Debug {debug ? "on" : "off"}
          </button>
          <Button size="sm" variant="ghost" onClick={copy} title="Copy log"><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={onClear} title="Clear log"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      {open && (
        <CardContent className="p-0">
          <div ref={bodyRef} className="max-h-64 overflow-auto p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">No activity yet. Generate a video to see detailed steps and any errors here.</p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className={cn("whitespace-pre-wrap break-words", color[l.level])}>
                  <span className="opacity-60">{new Date(l.t).toLocaleTimeString()} </span>
                  {l.msg}
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
