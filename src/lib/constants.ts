import type { LucideIcon } from "lucide-react";
import {
  Mountain, Users, Building2, Dumbbell, UtensilsCrossed, Laptop, Plane, Dog,
  Briefcase, Waves, Cloud, Sparkles, Trees, Sunset, Snowflake, CloudRain,
  Rocket, Flower2, Coffee, Camera, Palette, Car, Fish, Bird, Moon, Sun,
  Leaf, Tractor, Bike, Tent, Landmark, Wind, Flame, Gem, Globe, Baby,
  RectangleHorizontal, RectangleVertical, Square, Shuffle, Music, Music2,
  Radio, Piano, Waves as WavesIcon,
} from "lucide-react";

/** Preset themes. `query` is what we send to the Pexels search API. All SFW. */
export interface Theme {
  id: string;
  label: string;
  query: string;
  icon: LucideIcon;
}

export const RANDOM_THEME_ID = "random";

export const themes: Theme[] = [
  { id: "nature", label: "Nature", query: "nature landscape", icon: Mountain },
  { id: "forest", label: "Forest", query: "forest woods", icon: Trees },
  { id: "ocean", label: "Ocean", query: "ocean waves", icon: Waves },
  { id: "underwater", label: "Underwater", query: "underwater sea life", icon: Fish },
  { id: "mountains", label: "Mountains", query: "mountains peaks", icon: Mountain },
  { id: "sunset", label: "Sunset", query: "sunset sky", icon: Sunset },
  { id: "sky", label: "Sky", query: "sky clouds timelapse", icon: Cloud },
  { id: "winter", label: "Winter", query: "winter snow", icon: Snowflake },
  { id: "rain", label: "Rain", query: "rain drops", icon: CloudRain },
  { id: "flowers", label: "Flowers", query: "flowers blooming", icon: Flower2 },
  { id: "autumn", label: "Autumn", query: "autumn leaves", icon: Leaf },
  { id: "animals", label: "Animals", query: "wild animals", icon: Dog },
  { id: "birds", label: "Birds", query: "birds flying", icon: Bird },
  { id: "city", label: "City", query: "city street", icon: Building2 },
  { id: "nightcity", label: "Night city", query: "city night lights", icon: Moon },
  { id: "travel", label: "Travel", query: "travel destination", icon: Plane },
  { id: "space", label: "Space", query: "space stars galaxy", icon: Rocket },
  { id: "technology", label: "Technology", query: "technology computer", icon: Laptop },
  { id: "business", label: "Business", query: "business office", icon: Briefcase },
  { id: "people", label: "People", query: "people lifestyle", icon: Users },
  { id: "sport", label: "Sport", query: "sport fitness", icon: Dumbbell },
  { id: "yoga", label: "Yoga", query: "yoga meditation", icon: Bike },
  { id: "food", label: "Food", query: "food cooking", icon: UtensilsCrossed },
  { id: "coffee", label: "Coffee", query: "coffee cafe", icon: Coffee },
  { id: "farm", label: "Farm", query: "farm agriculture field", icon: Tractor },
  { id: "cars", label: "Cars", query: "cars driving", icon: Car },
  { id: "aerial", label: "Aerial", query: "aerial drone landscape", icon: Wind },
  { id: "camping", label: "Camping", query: "camping outdoor", icon: Tent },
  { id: "architecture", label: "Architecture", query: "architecture building", icon: Landmark },
  { id: "art", label: "Art", query: "art painting creative", icon: Palette },
  { id: "photography", label: "Photography", query: "camera photography", icon: Camera },
  { id: "fire", label: "Fire", query: "fire flames bonfire", icon: Flame },
  { id: "abstract", label: "Abstract", query: "abstract motion background", icon: Sparkles },
  { id: "luxury", label: "Luxury", query: "luxury elegant", icon: Gem },
  { id: "world", label: "World", query: "world famous landmarks", icon: Globe },
  { id: "family", label: "Family", query: "happy family outdoors", icon: Baby },
  { id: "sunny", label: "Sunny", query: "sunny summer day", icon: Sun },
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

// ---- Background music (generated in-browser) ----
export interface MusicMood {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const MUSIC_NONE = "none";
export const MUSIC_UPLOAD = "upload";
export const MUSIC_RANDOM = "random";

/** Selectable moods (the actual synthesis presets live in music.ts). */
export const musicMoods: MusicMood[] = [
  { id: "ambient", label: "Ambient", icon: WavesIcon },
  { id: "calm", label: "Calm", icon: Music },
  { id: "uplifting", label: "Uplifting", icon: Sun },
  { id: "cinematic", label: "Cinematic", icon: Radio },
  { id: "lofi", label: "Lo-fi", icon: Music2 },
  { id: "deep", label: "Deep", icon: Piano },
];

export const generativeMoodIds = musicMoods.map((m) => m.id);

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
  url: string;
  thumbnail: string;
  videographer: string;
}

export interface VideoResult {
  id: string;
  url: string;
  blob: Blob;
  duration: number;
  clips: VideoClip[];
  themeLabel: string;
  aspectLabel: string;
  musicLabel: string;
  createdAt: string;
}
