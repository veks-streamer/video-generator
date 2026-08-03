// Generative background music, synthesized in the browser with the Web Audio
// API. No external files or keys, always royalty-free & SFW. The seed drives
// key, tempo, progression and note choices so every track is clearly different.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const pick = <T,>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length)];

type Wave = OscillatorType;
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  penta: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

interface Cfg {
  scale: number[]; root: number; bpm: [number, number];
  drums: "none" | "ambient" | "four" | "backbeat" | "rock";
  bass: { type: Wave; pattern: "sustain" | "root" | "eighths" | "offbeat"; gain: number } | null;
  lead: { type: Wave; density: number; octave: number; gain: number } | null;
  pad: { type: Wave; gain: number } | null;
  cutoff: number;
  progs: number[][];
}

const GENRES: Record<string, Cfg> = {
  ambient:   { scale: SCALES.minor,  root: 48, bpm: [60, 70],  drums: "none",     bass: { type: "sine", pattern: "sustain", gain: 0.5 }, lead: null, pad: { type: "sine", gain: 0.5 }, cutoff: 1200, progs: [[0,5,3,4],[0,3,4,3]] },
  calm:      { scale: SCALES.penta,  root: 50, bpm: [70, 84],  drums: "none",     bass: { type: "sine", pattern: "sustain", gain: 0.5 }, lead: { type: "triangle", density: 0.35, octave: 1, gain: 0.4 }, pad: { type: "sine", gain: 0.45 }, cutoff: 1900, progs: [[0,3,1,4],[0,4,5,3]] },
  uplifting: { scale: SCALES.major,  root: 52, bpm: [102, 120],drums: "backbeat", bass: { type: "triangle", pattern: "eighths", gain: 0.55 }, lead: { type: "triangle", density: 0.6, octave: 1, gain: 0.45 }, pad: { type: "triangle", gain: 0.4 }, cutoff: 2800, progs: [[0,4,5,3],[0,5,3,4],[3,4,0,5]] },
  cinematic: { scale: SCALES.minor,  root: 45, bpm: [70, 92],  drums: "ambient",  bass: { type: "sine", pattern: "sustain", gain: 0.6 }, lead: null, pad: { type: "sine", gain: 0.5 }, cutoff: 1500, progs: [[0,5,3,4],[0,3,5,4]] },
  lofi:      { scale: SCALES.dorian, root: 48, bpm: [72, 86],  drums: "backbeat", bass: { type: "triangle", pattern: "offbeat", gain: 0.5 }, lead: { type: "sine", density: 0.35, octave: 1, gain: 0.35 }, pad: { type: "triangle", gain: 0.4 }, cutoff: 1200, progs: [[0,3,4,1],[0,4,3,5]] },
  electronic:{ scale: SCALES.minor,  root: 48, bpm: [118, 126],drums: "four",     bass: { type: "sawtooth", pattern: "offbeat", gain: 0.5 }, lead: { type: "sawtooth", density: 0.6, octave: 1, gain: 0.4 }, pad: { type: "sawtooth", gain: 0.25 }, cutoff: 2600, progs: [[0,0,5,3],[0,3,4,4]] },
  techno:    { scale: SCALES.minor,  root: 45, bpm: [126, 132],drums: "four",     bass: { type: "sawtooth", pattern: "root", gain: 0.55 }, lead: { type: "square", density: 0.5, octave: 1, gain: 0.32 }, pad: null, cutoff: 2200, progs: [[0,0,0,3],[0,0,5,5]] },
  pop:       { scale: SCALES.major,  root: 50, bpm: [100, 116],drums: "backbeat", bass: { type: "triangle", pattern: "eighths", gain: 0.55 }, lead: { type: "triangle", density: 0.6, octave: 1, gain: 0.45 }, pad: { type: "triangle", gain: 0.4 }, cutoff: 2700, progs: [[0,4,5,3],[5,3,0,4]] },
  rock:      { scale: SCALES.minor,  root: 40, bpm: [120, 140],drums: "rock",     bass: { type: "square", pattern: "eighths", gain: 0.5 }, lead: { type: "square", density: 0.4, octave: 1, gain: 0.3 }, pad: { type: "square", gain: 0.22 }, cutoff: 2000, progs: [[0,0,3,4],[0,5,3,4]] },
  classical: { scale: SCALES.major,  root: 52, bpm: [80, 100], drums: "none",     bass: { type: "triangle", pattern: "root", gain: 0.45 }, lead: { type: "triangle", density: 0.85, octave: 1, gain: 0.4 }, pad: { type: "triangle", gain: 0.35 }, cutoff: 2400, progs: [[0,4,5,3],[0,3,4,5]] },
  deep:      { scale: SCALES.minor,  root: 38, bpm: [60, 72],  drums: "none",     bass: { type: "sine", pattern: "sustain", gain: 0.6 }, lead: null, pad: { type: "sine", gain: 0.5 }, cutoff: 800, progs: [[0,0,3,4]] },
};

export function resolveGenre(id: string, rng: () => number = Math.random): string {
  if (GENRES[id]) return id;
  const ids = Object.keys(GENRES);
  return ids[Math.floor(rng() * ids.length)];
}

function wav(buffer: AudioBuffer): Uint8Array {
  const numCh = buffer.numberOfChannels, sr = buffer.sampleRate, frames = buffer.length;
  const blockAlign = numCh * 2, dataSize = frames * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize), view = new DataView(buf);
  const str = (o: number, x: string) => { for (let i = 0; i < x.length; i++) view.setUint8(o + i, x.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * blockAlign, true); view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, dataSize, true);
  const ch: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) ch.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, ch[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2;
    }
  return new Uint8Array(buf);
}

/** Peak-normalize every channel in place to ~-1 dBFS so output is always audible. */
function normalize(buffer: AudioBuffer) {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
  }
  if (peak < 1e-4) return;
  const g = Math.min(6, 0.89 / peak);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] *= g;
  }
}

/** Synthesize an exact-length track for the given genre/seed and return WAV bytes. */
export async function generateMusic(
  genreId: string,
  seed: number,
  seconds: number,
): Promise<{ bytes: Uint8Array; genreId: string }> {
  const rng = mulberry32(seed);
  const resolved = resolveGenre(genreId, rng);
  const cfg = GENRES[resolved];
  const sr = 44100;
  const dur = Math.max(2, Math.min(600, seconds));

  const OAC: typeof OfflineAudioContext =
    (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const ctx = new OAC(2, Math.ceil(dur * sr), sr);

  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3;
  master.connect(comp); comp.connect(ctx.destination);

  // echo send
  const delay = ctx.createDelay(1.5); delay.delayTime.value = 60 / 240;
  const fb = ctx.createGain(); fb.gain.value = 0.24;
  const wet = ctx.createGain(); wet.gain.value = 0.18;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);

  // shared noise buffer for drums
  const noiseBuf = ctx.createBuffer(1, sr, sr);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rng() * 2 - 1;

  // per-seed musical variation
  const rootOffset = Math.floor(rng() * 10) - 4;
  const root = cfg.root + rootOffset;
  const bpm = cfg.bpm[0] + Math.floor(rng() * (cfg.bpm[1] - cfg.bpm[0] + 1));
  const prog = pick(rng, cfg.progs);
  const beat = 60 / bpm, bar = beat * 4, sl = cfg.scale.length;
  delay.delayTime.value = beat / 2;

  const tone = (freq: number, start: number, len: number, type: Wave, gain: number, pan: number, send = 0.2) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    const a = Math.min(0.4, len * 0.25), r = Math.min(1.2, len * 0.4);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + a);
    g.gain.setValueAtTime(gain, start + Math.max(a, len - r));
    g.gain.linearRampToValueAtTime(0.0001, start + len);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cfg.cutoff;
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    o.connect(g); g.connect(lp); lp.connect(p); p.connect(master);
    if (send > 0) { const s = ctx.createGain(); s.gain.value = send; p.connect(s); s.connect(delay); }
    o.start(start); o.stop(start + len + 0.05);
  };

  const kick = (start: number) => {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(140, start);
    o.frequency.exponentialRampToValueAtTime(48, start + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    o.connect(g); g.connect(master); o.start(start); o.stop(start + 0.2);
  };
  const noiseHit = (start: number, len: number, hp: number, gain: number) => {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + len);
    src.connect(f); f.connect(g); g.connect(master); src.start(start); src.stop(start + len + 0.02);
  };
  const hat = (t: number) => noiseHit(t, 0.05, 7000, 0.14);
  const snare = (t: number) => { noiseHit(t, 0.18, 1800, 0.3); };

  const scaleNote = (deg: number, oct: number) => {
    const idx = ((deg % sl) + sl) % sl;
    return root + cfg.scale[idx] + 12 * (oct + Math.floor(deg / sl));
  };

  const bars = Math.ceil(dur / bar);
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar;
    const deg = prog[b % prog.length];

    // pad chord
    if (cfg.pad) {
      [0, 2, 4].forEach((st, i) =>
        tone(midi(scaleNote(deg + st, 0)), t0, bar, cfg.pad!.type, cfg.pad!.gain * 0.4, (i - 1) * 0.4, 0.3));
    }
    // bass
    if (cfg.bass) {
      const bp = cfg.bass;
      if (bp.pattern === "sustain") tone(midi(scaleNote(deg, -2)), t0, bar, bp.type, bp.gain, 0, 0.05);
      else {
        for (let bt = 0; bt < 4; bt++) {
          const t = t0 + bt * beat;
          if (bp.pattern === "root") tone(midi(scaleNote(deg, -2)), t, beat * 0.9, bp.type, bp.gain, 0, 0.05);
          if (bp.pattern === "eighths") { tone(midi(scaleNote(deg, -2)), t, beat * 0.45, bp.type, bp.gain, 0, 0.05); tone(midi(scaleNote(deg + 4, -2)), t + beat / 2, beat * 0.45, bp.type, bp.gain * 0.8, 0, 0.05); }
          if (bp.pattern === "offbeat") tone(midi(scaleNote(deg, -2)), t + beat / 2, beat * 0.4, bp.type, bp.gain, 0, 0.05);
        }
      }
    }
    // lead / arp
    if (cfg.lead) {
      const steps = 8, stepDur = bar / steps;
      const chordTones = [0, 2, 4, 6];
      for (let s = 0; s < steps; s++) {
        if (rng() < cfg.lead.density) {
          const useChord = rng() < 0.6;
          const d = useChord ? deg + pick(rng, chordTones) : deg + Math.floor(rng() * sl);
          tone(midi(scaleNote(d, cfg.lead.octave)), t0 + s * stepDur, stepDur * 0.9, cfg.lead.type, cfg.lead.gain, (rng() * 2 - 1) * 0.6, 0.3);
        }
      }
    }
    // drums
    if (cfg.drums === "four") { for (let bt = 0; bt < 4; bt++) kick(t0 + bt * beat); for (let h = 0; h < 8; h++) hat(t0 + h * (beat / 2)); }
    else if (cfg.drums === "backbeat") { kick(t0); kick(t0 + 2 * beat); snare(t0 + beat); snare(t0 + 3 * beat); for (let h = 0; h < 8; h++) hat(t0 + h * (beat / 2)); }
    else if (cfg.drums === "rock") { kick(t0); kick(t0 + 2 * beat); kick(t0 + 2.5 * beat); snare(t0 + beat); snare(t0 + 3 * beat); for (let h = 0; h < 8; h++) hat(t0 + h * (beat / 2)); }
    else if (cfg.drums === "ambient") { if (b % 2 === 0) kick(t0); }
  }

  const rendered = await ctx.startRendering();
  normalize(rendered);
  return { bytes: wav(rendered), genreId: resolved };
}
