import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Key, CheckCircle2, XCircle, ExternalLink, Loader2, Shield, Save, Radio, Camera, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getPexelsKey, setPexelsKey, getJamendoKey, setJamendoKey, getPixabayKey, setPixabayKey } from "@/lib/storage";
import { searchVideos } from "@/lib/pexels";
import { searchPixabay } from "@/lib/pixabay";
import { searchJamendo } from "@/lib/jamendo";

export default function Settings() {
  const { toast } = useToast();
  const [key, setKey] = useState(getPexelsKey());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"unknown" | "ok" | "bad">(
    getPexelsKey() ? "unknown" : "bad",
  );

  const [jamKey, setJamKey] = useState(getJamendoKey());
  const [jamTesting, setJamTesting] = useState(false);
  const [jamStatus, setJamStatus] = useState<"unknown" | "ok" | "bad">(
    getJamendoKey() ? "unknown" : "bad",
  );

  function saveJam() {
    setJamendoKey(jamKey);
    setJamStatus(jamKey ? "unknown" : "bad");
    toast({ title: "Saved", description: "Your Jamendo client id is stored in this browser." });
  }
  async function testJam() {
    if (!jamKey.trim()) return;
    setJamTesting(true);
    try {
      setJamendoKey(jamKey);
      const tracks = await searchJamendo(jamKey.trim(), "electronic", 1);
      if (tracks.length === 0) throw new Error("No tracks returned (client id may be invalid).");
      setJamStatus("ok");
      toast({ title: "Jamendo works", description: "Client id accepted." });
    } catch (e) {
      setJamStatus("bad");
      toast({ title: "Jamendo test failed", description: e instanceof Error ? e.message : "Could not reach Jamendo.", variant: "destructive" });
    } finally {
      setJamTesting(false);
    }
  }

  const [pixKey, setPixKey] = useState(getPixabayKey());
  const [pixTesting, setPixTesting] = useState(false);
  const [pixStatus, setPixStatus] = useState<"unknown" | "ok" | "bad">(getPixabayKey() ? "unknown" : "bad");
  function savePix() {
    setPixabayKey(pixKey);
    setPixStatus(pixKey ? "unknown" : "bad");
    toast({ title: "Saved", description: "Your Pixabay API key is stored in this browser." });
  }
  async function testPix() {
    if (!pixKey.trim()) return;
    setPixTesting(true);
    try {
      setPixabayKey(pixKey);
      await searchPixabay("nature", pixKey.trim(), 10, 1, 30, 1280, 720);
      setPixStatus("ok");
      toast({ title: "Pixabay works", description: "API key accepted." });
    } catch (e) {
      setPixStatus("bad");
      toast({ title: "Pixabay test failed", description: e instanceof Error ? e.message : "Could not reach Pixabay.", variant: "destructive" });
    } finally {
      setPixTesting(false);
    }
  }

  const [turbo, setTurbo] = useState(() => { try { return localStorage.getItem("vg.turbo") === "1"; } catch { return false; } });
  const isolated = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated === true;
  async function toggleTurbo(v: boolean) {
    setTurbo(v);
    try { if (v) localStorage.setItem("vg.turbo", "1"); else localStorage.removeItem("vg.turbo"); } catch { /* */ }
    // Fully remove the COOP/COEP service worker when turning Turbo off.
    if (!v && navigator.serviceWorker) {
      try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); } catch { /* */ }
    }
    toast({ title: v ? "Turbo enabling…" : "Turbo disabling…", description: "Reloading to apply." });
    setTimeout(() => window.location.reload(), 800);
  }

  function save() {
    setPexelsKey(key);
    setStatus(key ? "unknown" : "bad");
    toast({ title: "Saved", description: "Your Pexels API key is stored in this browser." });
  }

  async function test() {
    if (!key.trim()) return;
    setTesting(true);
    try {
      setPexelsKey(key);
      await searchVideos("nature", key.trim(), 10);
      setStatus("ok");
      toast({ title: "Key works", description: "Pexels accepted your API key." });
    } catch (e) {
      setStatus("bad");
      toast({
        title: "Key test failed",
        description: e instanceof Error ? e.message : "Could not reach Pexels.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> Pexels API key
              {status === "ok" && (
                <Badge className="bg-green-600 dark:bg-green-700 ml-1">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Working
                </Badge>
              )}
              {status === "bad" && (
                <Badge variant="destructive" className="ml-1">
                  <XCircle className="h-3 w-3 mr-1" /> Not set
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Required to fetch stock video clips. It's saved only in your browser (localStorage) and sent
              directly to Pexels — never to any server of ours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pexels">API key</Label>
              <Input
                id="pexels"
                type="password"
                placeholder="Paste your Pexels API key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
              <Button variant="outline" onClick={test} disabled={!key.trim() || testing}>
                {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Test key
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Get a free key at{" "}
              <a
                href="https://www.pexels.com/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                pexels.com/api <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Pixabay API key
              {pixStatus === "ok" && (<Badge className="bg-green-600 dark:bg-green-700 ml-1"><CheckCircle2 className="h-3 w-3 mr-1" /> Working</Badge>)}
              {pixStatus === "bad" && (<Badge variant="secondary" className="ml-1"><XCircle className="h-3 w-3 mr-1" /> Not set</Badge>)}
            </CardTitle>
            <CardDescription>
              Optional second video source. Pixabay clips are royalty-free for commercial use with no attribution.
              (Framerate isn't provided by Pixabay, so its clips run in Standard mode and are re-encoded to your chosen fps.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pixabay">API key</Label>
              <Input id="pixabay" type="password" placeholder="Paste your Pixabay API key" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={savePix}><Save className="h-4 w-4 mr-2" /> Save</Button>
              <Button variant="outline" onClick={testPix} disabled={!pixKey.trim() || pixTesting}>
                {pixTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Test key
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Get a free key at{" "}
              <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                pixabay.com/api <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" /> Jamendo client id
              {jamStatus === "ok" && (
                <Badge className="bg-green-600 dark:bg-green-700 ml-1">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Working
                </Badge>
              )}
              {jamStatus === "bad" && (
                <Badge variant="secondary" className="ml-1">
                  <XCircle className="h-3 w-3 mr-1" /> Not set
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Optional. Enables real royalty-free (Creative Commons) instrumental music by genre, downloaded
              in your browser and cut to the video length. Without it, the built-in generated music is used.
              Only the <strong>Client ID</strong> is needed here — not the Client Secret.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jamendo">Client id</Label>
              <Input
                id="jamendo"
                type="password"
                placeholder="Paste your Jamendo client id"
                value={jamKey}
                onChange={(e) => setJamKey(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveJam}><Save className="h-4 w-4 mr-2" /> Save</Button>
              <Button variant="outline" onClick={testJam} disabled={!jamKey.trim() || jamTesting}>
                {jamTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Test id
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Get a free client id at{" "}
              <a href="https://devportal.jamendo.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                devportal.jamendo.com <ExternalLink className="h-3 w-3" />
              </a>. Only commercially-usable licenses (CC-BY / CC-BY-SA) are selected — still credit the artists when you publish.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" /> Turbo mode (multi-threaded)
              {turbo && isolated && (<Badge className="bg-green-600 dark:bg-green-700 ml-1"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>)}
              {turbo && !isolated && (<Badge variant="secondary" className="ml-1">Enabling…</Badge>)}
            </CardTitle>
            <CardDescription>
              Uses the multi-threaded video engine for faster encoding. It registers a small service worker to
              enable the required browser isolation. Experimental — if clips or music ever fail to load, turn it off.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <p className="font-medium">Enable Turbo</p>
                <p className="text-muted-foreground text-xs">The page reloads when you toggle this. Status: {turbo ? (isolated ? "active" : "waiting for reload") : "off"}.</p>
              </div>
              <Switch checked={turbo} onCheckedChange={toggleTurbo} aria-label="Toggle Turbo mode" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> How this works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This app is 100% client-side. There is no backend: clips are fetched from Pexels and the video is
              assembled in your browser using ffmpeg compiled to WebAssembly.
            </p>
            <p>
              Because everything runs locally, your API key and generated videos never leave your device. The first
              generation downloads the ffmpeg engine (~30&nbsp;MB) once, then it's cached.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
