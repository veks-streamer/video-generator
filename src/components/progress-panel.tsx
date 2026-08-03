import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import type { ProgressUpdate } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  progress: ProgressUpdate;
  visible: boolean;
}

export function ProgressPanel({ progress, visible }: Props) {
  if (!visible) return null;
  const isError = progress.stage === "error";
  const isDone = progress.stage === "complete";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
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
              <p className="text-sm text-muted-foreground">{progress.message}</p>
            </div>
          </div>

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
