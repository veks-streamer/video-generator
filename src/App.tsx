import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/lib/theme-provider";
import { BUILD_LABEL } from "@/version";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vg-theme">
      <TooltipProvider>
        <div className="w-full text-center text-[11px] font-mono py-1 px-2 bg-primary/10 text-primary border-b border-primary/20 tabular-nums">
          {BUILD_LABEL}
        </div>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={Home} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
