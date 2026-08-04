import type { LucideIcon } from "lucide-react";
import {
  Mountain, Users, Building2, Dumbbell, UtensilsCrossed, Laptop, Plane, Dog,
  Briefcase, Waves, Cloud, Sparkles, Trees, Sunset, Snowflake, CloudRain,
  Rocket, Flower2, Coffee, Camera, Palette, Car, Fish, Bird, Moon, Sun,
  Leaf, Tractor, Bike, Tent, Landmark, Wind, Flame, Gem, Globe, Baby,
  RectangleHorizontal, RectangleVertical, Square, Shuffle, Music, Music2,
  Radio, Piano, Waves as WavesIcon, Zap, Activity, Guitar, Film,
} from "lucide-react";

/** Preset themes. `query` is what we send to the Pexels search API. All SFW. */
export interface Theme {
  id: string;
  label: string;
  query: string;
  alts?: string[]; // alternate search queries — rotated per video for more variety
  icon: LucideIcon;
}

export const RANDOM_THEME_ID = "random";

export const themes: Theme[] = [
  { id: "nature", label: "Nature", query: "nature landscape", alts: ["mountain river", "green valley", "wilderness scenery", "sunrise landscape"], icon: Mountain },
  { id: "forest", label: "Forest", query: "forest woods", alts: ["pine forest", "misty forest", "jungle trees", "forest path"], icon: Trees },
  { id: "ocean", label: "Ocean", query: "ocean waves", alts: ["sea coast", "beach waves", "tropical sea", "crashing waves"], icon: Waves },
  { id: "underwater", label: "Underwater", query: "underwater sea life", alts: ["coral reef", "scuba diving", "fish underwater", "deep sea"], icon: Fish },
  { id: "mountains", label: "Mountains", query: "mountains peaks", alts: ["snowy mountains", "alps landscape", "mountain range", "hiking mountains"], icon: Mountain },
  { id: "sunset", label: "Sunset", query: "sunset sky", alts: ["golden hour", "sunset beach", "orange sunset", "dusk horizon"], icon: Sunset },
  { id: "sky", label: "Sky", query: "sky clouds timelapse", alts: ["blue sky clouds", "clouds moving", "cloudscape", "dramatic sky"], icon: Cloud },
  { id: "winter", label: "Winter", query: "winter snow", alts: ["snow falling", "snowy landscape", "frozen winter", "snow forest"], icon: Snowflake },
  { id: "rain", label: "Rain", query: "rain drops", alts: ["rainy window", "rain city", "storm rain", "raindrops closeup"], icon: CloudRain },
  { id: "flowers", label: "Flowers", query: "flowers blooming", alts: ["flower field", "spring flowers", "rose closeup", "wildflowers"], icon: Flower2 },
  { id: "autumn", label: "Autumn", query: "autumn leaves", alts: ["fall foliage", "autumn forest", "golden leaves", "autumn park"], icon: Leaf },
  { id: "animals", label: "Animals", query: "wild animals", alts: ["wildlife safari", "animals nature", "birds wildlife", "deer forest"], icon: Dog },
  { id: "birds", label: "Birds", query: "birds flying", alts: ["birds sky", "flock of birds", "eagle flying", "birds nature"], icon: Bird },
  { id: "city", label: "City", query: "city street", alts: ["city skyline", "urban downtown", "city traffic", "modern city"], icon: Building2 },
  { id: "nightcity", label: "Night city", query: "city night lights", alts: ["neon city night", "night traffic", "city lights bokeh", "downtown night"], icon: Moon },
  { id: "travel", label: "Travel", query: "travel destination", alts: ["tourist landmarks", "vacation travel", "exploring city", "travel adventure"], icon: Plane },
  { id: "space", label: "Space", query: "space stars galaxy", alts: ["milky way", "starry night sky", "nebula space", "cosmos stars"], icon: Rocket },
  { id: "technology", label: "Technology", query: "technology computer", alts: ["data server", "coding screen", "circuit board", "futuristic tech"], icon: Laptop },
  { id: "business", label: "Business", query: "business office", alts: ["team meeting", "office work", "handshake business", "corporate office"], icon: Briefcase },
  { id: "people", label: "People", query: "people lifestyle", alts: ["friends together", "people walking", "diverse people", "happy people"], icon: Users },
  { id: "sport", label: "Sport", query: "sport fitness", alts: ["running athlete", "gym workout", "football sport", "cycling sport"], icon: Dumbbell },
  { id: "yoga", label: "Yoga", query: "yoga meditation", alts: ["yoga pose", "meditation calm", "pilates workout", "stretching wellness"], icon: Bike },
  { id: "food", label: "Food", query: "food cooking", alts: ["chef cooking", "delicious food", "restaurant food", "food preparation"], icon: UtensilsCrossed },
  { id: "coffee", label: "Coffee", query: "coffee cafe", alts: ["coffee pouring", "barista latte", "coffee cup closeup", "cozy cafe"], icon: Coffee },
  { id: "farm", label: "Farm", query: "farm agriculture field", alts: ["tractor field", "harvest farm", "countryside farm", "farming crops"], icon: Tractor },
  { id: "cars", label: "Cars", query: "cars driving", alts: ["sports car", "highway driving", "luxury car", "car city road"], icon: Car },
  { id: "aerial", label: "Aerial", query: "aerial drone landscape", alts: ["drone footage nature", "aerial city", "birds eye view", "drone coastline"], icon: Wind },
  { id: "camping", label: "Camping", query: "camping outdoor", alts: ["campfire night", "tent nature", "hiking camp", "adventure outdoors"], icon: Tent },
  { id: "architecture", label: "Architecture", query: "architecture building", alts: ["modern architecture", "historic building", "skyscraper facade", "interior design"], icon: Landmark },
  { id: "art", label: "Art", query: "art painting creative", alts: ["artist painting", "abstract art", "street art", "creative studio"], icon: Palette },
  { id: "photography", label: "Photography", query: "camera photography", alts: ["photographer shooting", "vintage camera", "photo studio", "lens closeup"], icon: Camera },
  { id: "fire", label: "Fire", query: "fire flames bonfire", alts: ["campfire flames", "burning fire", "fireplace cozy", "fire sparks"], icon: Flame },
  { id: "abstract", label: "Abstract", query: "abstract motion background", alts: ["colorful abstract", "particles motion", "liquid abstract", "geometric loop"], icon: Sparkles },
  { id: "luxury", label: "Luxury", query: "luxury lifestyle", alts: ["luxury yacht", "elegant interior", "luxury fashion", "premium lifestyle"], icon: Gem },
  { id: "world", label: "World", query: "world famous landmarks", alts: ["europe travel", "asia landmarks", "famous monuments", "cultural landmarks"], icon: Globe },
  { id: "family", label: "Family", query: "happy family outdoors", alts: ["family fun", "parents children", "family home", "family picnic"], icon: Baby },
  { id: "sunny", label: "Sunny", query: "sunny summer day", alts: ["summer beach", "sunshine nature", "bright summer", "summer vibes"], icon: Sun },
];

export function randomTheme(exclude?: Set<string>): Theme {
  const pool = exclude && exclude.size < themes.length
    ? themes.filter((t) => !exclude.has(t.id))
    : themes;
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface AspectRatio {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: LucideIcon;
}

export const aspectRatios: AspectRatio[] = [
  { id: "landscape", label: "Landscape 16:9", width: 1280, height: 720, icon: RectangleHorizontal },
  { id: "portrait", label: "Portrait 9:16", width: 720, height: 1280, icon: RectangleVertical },
  { id: "square", label: "Square 1:1", width: 1080, height: 1080, icon: Square },
];

export interface Quality {
  id: string;
  label: string;
  scale: number;
  crf: number;
}

export const qualities: Quality[] = [
  { id: "fast", label: "Fast (480p)", scale: 2 / 3, crf: 28 },
  { id: "balanced", label: "Balanced (720p)", scale: 1, crf: 25 },
  { id: "hd", label: "Full HD (1080p)", scale: 1.5, crf: 23 },
];

export interface Framerate {
  id: string;
  label: string;
  fps: number;
  icon: LucideIcon;
}

export const framerates: Framerate[] = [
  { id: "24", label: "24 fps", fps: 24, icon: Film },
  { id: "25", label: "25 fps", fps: 25, icon: Film },
  { id: "30", label: "30 fps", fps: 30, icon: Film },
  { id: "50", label: "50 fps", fps: 50, icon: Film },
  { id: "60", label: "60 fps", fps: 60, icon: Film },
];

export interface EncodingMode { id: string; label: string; icon: LucideIcon; }
export const MODE_STANDARD = "standard";
export const MODE_FAST = "fast";
export const encodingModes: EncodingMode[] = [
  { id: MODE_STANDARD, label: "Standard", icon: Sparkles },
  { id: MODE_FAST, label: "Fast (raw)", icon: Zap },
];

export interface VideoSource { id: string; label: string; icon: LucideIcon; }
export const VSOURCE_PEXELS = "pexels";
export const VSOURCE_PIXABAY = "pixabay";
export const videoSources: VideoSource[] = [
  { id: VSOURCE_PEXELS, label: "Pexels", icon: Film },
  { id: VSOURCE_PIXABAY, label: "Pixabay", icon: Camera },
];

// ---- Look / color-grade styles (applied in Standard mode) ----
export interface VideoStyle { id: string; label: string; icon: LucideIcon; vf?: string; }
export const STYLE_NONE = "none";
export const STYLE_AUTO = "auto";
export const videoStyles: VideoStyle[] = [
  { id: "none", label: "None", icon: Palette },
  { id: "auto", label: "Auto (random)", icon: Shuffle },
  { id: "cinematic", label: "Cinematic", icon: Film, vf: "eq=contrast=1.08:saturation=0.92,colorbalance=rs=0.04:bs=-0.04,vignette=PI/5" },
  { id: "vibrant", label: "Vibrant", icon: Sparkles, vf: "eq=contrast=1.12:saturation=1.5:brightness=0.02" },
  { id: "warm", label: "Warm", icon: Sun, vf: "colorbalance=rs=0.12:gs=0.03:bs=-0.10,eq=saturation=1.10" },
  { id: "cool", label: "Cool", icon: Snowflake, vf: "colorbalance=rs=-0.10:gs=0.0:bs=0.12,eq=saturation=1.05" },
  { id: "vintage", label: "Vintage", icon: Camera, vf: "colorbalance=rs=0.10:bs=-0.12,eq=saturation=0.80:contrast=1.05,noise=alls=7:allf=t,vignette=PI/4.5" },
  { id: "noir", label: "Noir B&W", icon: Moon, vf: "hue=s=0,eq=contrast=1.22:brightness=0.02,vignette=PI/5" },
];

/** Resolve a style id to an ffmpeg -vf fragment (Auto picks a random look). */
export function styleVf(id: string): string | null {
  if (id === STYLE_NONE) return null;
  let st = videoStyles.find((v) => v.id === id);
  if (id === STYLE_AUTO) { const pool = videoStyles.filter((v) => v.vf); st = pool[Math.floor(Math.random() * pool.length)]; }
  return st?.vf ?? null;
}

/**
 * Fast mode joins clips WITHOUT re-encoding, so every clip must share the exact
 * same dimensions. Snap the quality+aspect to a real Pexels render size. Returns
 * null for square (Pexels has no native square render → needs re-encoding).
 */
export function fastStdSize(aspectId: string, qualityId: string): { w: number; h: number } | null {
  const land: Record<string, [number, number]> = {
    fast: [960, 540], balanced: [1280, 720], hd: [1920, 1080],
  };
  const port: Record<string, [number, number]> = {
    fast: [540, 960], balanced: [720, 1280], hd: [1080, 1920],
  };
  if (aspectId === "landscape") { const d = land[qualityId] ?? land.balanced; return { w: d[0], h: d[1] }; }
  if (aspectId === "portrait") { const d = port[qualityId] ?? port.balanced; return { w: d[0], h: d[1] }; }
  return null; // square unsupported in fast mode
}

// ---- Background music ----
export interface MusicGenre {
  id: string;
  label: string;
  icon: LucideIcon;
}

// Music sources
export const MUSIC_NONE = "none";
export const MUSIC_GENERATED = "generated";
export const MUSIC_JAMENDO = "jamendo";
export const MUSIC_UPLOAD = "upload";
export const MUSIC_RANDOM = "random";

/** In-browser synthesized genres (presets live in music.ts). */
export const generativeGenres: MusicGenre[] = [
  { id: "ambient", label: "Ambient", icon: WavesIcon },
  { id: "calm", label: "Calm", icon: Music },
  { id: "uplifting", label: "Uplifting", icon: Sun },
  { id: "cinematic", label: "Cinematic", icon: Radio },
  { id: "lofi", label: "Lo-fi", icon: Music2 },
  { id: "electronic", label: "Electronic", icon: Zap },
  { id: "techno", label: "Techno", icon: Activity },
  { id: "pop", label: "Pop", icon: Sparkles },
  { id: "rock", label: "Rock", icon: Guitar },
  { id: "classical", label: "Classical", icon: Piano },
  { id: "deep", label: "Deep", icon: Piano },
  { id: MUSIC_RANDOM, label: "Random", icon: Shuffle },
];

/** Jamendo tags (real royalty-free tracks, requires a free client id). */
export const jamendoGenres: MusicGenre[] = [
  { id: "electronic", label: "Electronic", icon: Zap },
  { id: "techno", label: "Techno", icon: Activity },
  { id: "house", label: "House", icon: Activity },
  { id: "rock", label: "Rock", icon: Guitar },
  { id: "pop", label: "Pop", icon: Sparkles },
  { id: "classical", label: "Classical", icon: Piano },
  { id: "jazz", label: "Jazz", icon: Music2 },
  { id: "ambient", label: "Ambient", icon: WavesIcon },
  { id: "hiphop", label: "Hip-hop", icon: Radio },
  { id: "cinematic", label: "Cinematic", icon: Radio },
  { id: MUSIC_RANDOM, label: "Random", icon: Shuffle },
];

export type ProgressStage =
  | "loading" | "searching" | "downloading" | "encoding"
  | "stitching" | "audio" | "complete" | "error";

export interface ProgressUpdate {
  stage: ProgressStage;
  progress: number;
  message: string;
  currentStep?: number;
  totalSteps?: number;
}

export interface VideoClip {
  id: number;
  duration: number;
  width: number;
  height: number;
  fps: number;        // fps of the chosen file
  nativeFps: boolean; // true if the file already matches the requested fps
  url: string;
  thumbnail: string;
  videographer: string;
}

export interface VideoResult {
  id: string;
  url: string;
  blob: Blob;
  duration: number;
  themeLabel: string;
  aspectLabel: string;
  musicLabel: string;
  createdAt: string;
  elapsedMs: number;
}

/** Human-friendly elapsed time, e.g. "42s" or "3m 05s". */
export function formatElapsed(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
}
