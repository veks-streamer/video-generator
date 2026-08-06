// Shared debug logger used by both the ffmpeg and WebCodecs paths.
let fn: ((msg: string) => void) | null = null;
export function setDebugLogger(f: ((msg: string) => void) | null) { fn = f; }
export function dbg(msg: string) { try { fn?.(msg); } catch { /* */ } }
