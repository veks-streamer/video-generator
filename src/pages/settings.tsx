import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Key, CheckCircle2, XCircle, ExternalLink, Loader2, Shield, Save, Radio } from "lucide-react";
import { getPexelsKey, setPexelsKey, getJamendoKey, setJamendoKey } from "@/lib/storage";
import { searchVideos } from "@/lib/pexels";
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
              </a>. Tracks are Creative Commons — credit the artists when you publish.
            </p>
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
