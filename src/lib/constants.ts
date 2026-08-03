import type { LucideIcon } from "lucide-react";
import {
  Mountain, Users, Building2, Dumbbell, UtensilsCrossed,
  Laptop, Plane, Dog, Briefcase, Waves, Cloud, Sparkles,
  RectangleHorizontal, RectangleVertical, Square,
} from "lucide-react";

/** Preset themes. `query` is what we send to the Pexels search API. */
export interface Theme {
  id: string;
  label: string;
  query: string;
  icon: LucideIcon;
}

export const themes: Theme[] = [
  { id: "nature", label: "Nature", query: "nature landscape", icon: Mountain },
  { id: "people", label: "People", query: "people lifestyle", icon: Users },
  { id: "city", label: "City", query: "city street", icon: Building2 },
  { id: "sport", label: "Sport", query: "sport fitness", icon: Dumbbell },
  { id: "food", label: "Food", query: "food cooking", icon: UtensilsCrossed },
  { id: "technology", label: "Technology", query: "technology computer", icon: Laptop },
  { id: "travel", label: "Travel", query: "travel destination", icon: Plane },
  { id: "animals", label: "Animals", query: "wild animals", icon: Dog },
  { id: "business", label: "Business", query: "business office", icon: Briefcase },
  { id: "ocean", label: "Ocean", query: "ocean waves", icon: Waves },
  { id: "sky", label: "Sky", query: "sky clouds", icon: Cloud },
  { id: "abstract", label: "Abstract", query: "abstract motion", icon: Sparkles },
];

export interface AspectRatio {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: LucideIcon;
}

/** Output dimensions per aspect ratio, at 720p-class sizing. */
export const aspectRatios: AspectRatio[] = [
  { id: "landscape", label: "Landscape 16:9", width: 1280, height: 720, icon: RectangleHorizontal },
  { id: "portrait", label: "Portrait 9:16", width: 720, height: 1280, icon: RectangleVertical },
  { id: "square", label: "Square 1:1", width: 1080, height: 1080, icon: Square },
];

export interface Quality {
  id: string;
  label: string;
  /** scale factor applied to the aspect ratio's base dimensions */
  scale: number;
  crf: number;
}

export const qualities: Quality[] = [
  { id: "fast", label: "Fast (480p)", scale: 2 / 3, crf: 28 },
  { id: "balanced", label: "Balanced (720p)", scale: 1, crf: 25 },
  { id: "hd", label: "Full HD (1080p)", scale: 1.5, crf: 23 },
];

export type ProgressStage =
  | "loading"
  | "searching"
  | "downloading"
  | "encoding"
  | "stitching"
  | "audio"
  | "complete"
  | "error";

export interface ProgressUpdate {
  stage: ProgressStage;
  progress: number; // 0-100
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
  url: string;
  blob: Blob;
  duration: number;
  clips: VideoClip[];
  themeLabel: string;
  aspectLabel: string;
  createdAt: string;
}
