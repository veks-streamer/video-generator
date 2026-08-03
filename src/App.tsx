import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/lib/theme-provider";
import Home from "@/pages/home";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vg-theme">
      <TooltipProvider>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
