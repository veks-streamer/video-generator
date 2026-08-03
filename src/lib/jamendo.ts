// Jamendo: real royalty-free (Creative Commons) music, fetched with the user's
// own free client id. Instrumental tracks, picked by genre and downloaded so
// ffmpeg can cut them to the video length. Falls back handled by the caller.

export interface JamendoTrack {
  id: string;
  name: string;
  artist: string;
  duration: number;
  audio: string; // streamable mp3 url
}

const BASE = "https://api.jamendo.com/v3.0/tracks";

export async function searchJamendo(
  clientId: string,
  tag: string,
  limit = 60,
): Promise<JamendoTrack[]> {
  const params = new URLSearchParams({
    client_id: clientId,
    format: "json",
    limit: String(limit),
    audioformat: "mp32",
    include: "musicinfo",
    groupby: "artist_id",
    order: "popularity_month",
    vocalinstrumental: "instrumental",
    fuzzytags: tag,
  });
  const res = await fetch(`${BASE}/?${params.toString()}`);
  if (res.status === 401 || res.status === 403) {
    throw new Error("Jamendo rejected the client id. Check it in Settings.");
  }
  if (!res.ok) throw new Error(`Jamendo API error: ${res.status}`);
  const data = await res.json();
  if (data?.headers?.status && data.headers.status !== "success") {
    throw new Error(`Jamendo: ${data.headers.error_message || "request failed"}`);
  }
  const results = (data?.results ?? []) as any[];
  return results
    .filter((t) => t.audio)
    .map((t) => ({
      id: String(t.id),
      name: t.name ?? "Track",
      artist: t.artist_name ?? "Unknown",
      duration: Number(t.duration) || 0,
      audio: t.audio as string,
    }));
}

export async function downloadAudio(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Audio download failed: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
