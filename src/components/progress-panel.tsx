import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, X, Minimize2 } from "lucide-react";
import type { ProgressUpdate } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  progress: ProgressUpdate;
  visible: boolean;
  details?: string;
  queueCount?: number;
  onClose?: () => void;
  onMinimize?: () => void;
}

export function ProgressPanel({ progress, visible, details, queueCount = 0, onClose, onMinimize }: Props) {
  if (!visible) return null;
  const isError = progress.stage === "error";
  const isDone = progress.stage === "complete";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md relative">
        {!isError && onMinimize && (
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onMinimize} title="Minimize (keep generating)">
            <Minimize2 className="h-4 w-4" />
          </Button>
        )}
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={cn("p-4 rounded-full", isError ? "bg-destructive/10" : "bg-primary/10")}>
              {isDone ? (
                <CheckCircle className="h-10 w-10 text-primary" />
              ) : isError ? (
                <AlertCircle className="h-10 w-10 text-destructive" />
              ) : (
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {isError ? "Something went wrong" : isDone ? "Done!" : "Building your video…"}
              </h3>
              <p className="text-sm text-muted-foreground break-words">{progress.message}</p>
            </div>
          </div>

          {isError && details && (
            <pre className="text-[11px] leading-snug bg-muted/60 rounded-md p-3 max-h-40 overflow-auto whitespace-pre-wrap text-muted-foreground">
              {details}
            </pre>
          )}

          {!isError && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-bold tabular-nums">{Math.round(progress.progress)}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
              {progress.currentStep && progress.totalSteps && (
                <p className="text-xs text-center text-muted-foreground">
                  Clip {progress.currentStep} of {progress.totalSteps}
                </p>
              )}
              {queueCount > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {queueCount} more job{queueCount > 1 ? "s" : ""} queued
                </p>
              )}
            </div>
          )}

          {isError && onClose && (
            <Button variant="outline" className="w-full" onClick={onClose}>
              <X className="h-4 w-4 mr-2" /> Close
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
