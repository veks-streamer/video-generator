// Generative background music, synthesized in the browser with the Web Audio
// API. Royalty-free & SFW, unique per seed. A soft-limiter guarantees a
// consistent, audible level (no more "just noise"), and a motif + phrase
// structure make each track more musical and varied.

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
  cutoff: number; swing: number;
  progs: number[][];
}

const GENRES: Record<string, Cfg> = {
  ambient:   { scale: SCALES.minor,  root: 48, bpm: [60, 72],  drums: "none",     bass: { type: "sine", pattern: "sustain", gain: 0.62 }, lead: { type: "sine", density: 0.25, octave: 1, gain: 0.3 }, pad: { type: "sine", gain: 0.5 }, cutoff: 1300, swing: 0, progs: [[0,5,3,4],[0,3,4,3],[0,4,5,3],[5,3,4,0]] },
  calm:      { scale: SCALES.penta,  root: 50, bpm: [72, 88],  drums: "none",     bass: { type: "sine", pattern: "sustain", gain: 0.62 }, lead: { type: "triangle", density: 0.45, octave: 1, gain: 0.42 }, pad: { type: "sine", gain: 0.45 }, cutoff: 2000, swing: 0.1, progs: [[0,3,1,4],[0,4,3,1],[0,2,4,3],[3,4,0,2]] },
  uplifting: { scale: SCALES.major,  root: 52, bpm: [104, 124],drums: "backbeat", bass: { type: "triangle", pattern: "eighths", gain: 0.62 }, lead: { type: "triangle", density: 0.7, octave: 1, gain: 0.5 }, pad: { type: "triangle", gain: 0.4 }, cutoff: 2500, swing: 0, progs: [[0,4,5,3],[0,5,3,4],[3,4,0,5],[0,3,4,5],[5,4,0,3]] },
  cinematic: { scale: SCALES.minor,  root: 45, bpm: [72, 96],  drums: "ambient",  bass: { type: "sine", pattern: "sustain", gain: 0.6 }, lead: { type: "triangle", density: 0.35, octave: 1, gain: 0.35 }, pad: { type: "sine", gain: 0.5 }, cutoff: 1600, swing: 0, progs: [[0,5,3,4],[0,3,5,4],[0,6,5,4],[5,3,0,4]] },
  lofi:      { scale: SCALES.dorian, root: 48, bpm: [72, 88],  drums: "backbeat", bass: { type: "triangle", pattern: "offbeat", gain: 0.5 }, lead: { type: "sine", density: 0.5, octave: 1, gain: 0.38 }, pad: { type: "triangle", gain: 0.4 }, cutoff: 1300, swing: 0.28, progs: [[0,3,4,1],[0,4,3,5],[1,4,0,3],[0,3,1,4]] },
  electronic:{ scale: SCALES.minor,  root: 48, bpm: [118, 128],drums: "four",     bass: { type: "sawtooth", pattern: "offbeat", gain: 0.6 }, lead: { type: "sawtooth", density: 0.7, octave: 1, gain: 0.4 }, pad: { type: "sawtooth", gain: 0.24 }, cutoff: 2300, swing: 0, progs: [[0,0,5,3],[0,3,4,4],[0,5,3,0],[0,0,3,5]] },
  techno:    { scale: SCALES.minor,  root: 45, bpm: [126, 134],drums: "four",     bass: { type: "sawtooth", pattern: "root", gain: 0.62 }, lead: { type: "square", density: 0.55, octave: 1, gain: 0.32 }, pad: null, cutoff: 2000, swing: 0, progs: [[0,0,0,3],[0,0,5,5],[0,0,0,0],[0,3,0,5]] },
  pop:       { scale: SCALES.major,  root: 50, bpm: [100, 118],drums: "backbeat", bass: { type: "triangle", pattern: "eighths", gain: 0.62 }, lead: { type: "triangle", density: 0.72, octave: 1, gain: 0.48 }, pad: { type: "triangle", gain: 0.4 }, cutoff: 2400, swing: 0, progs: [[0,4,5,3],[5,3,0,4],[0,3,4,5],[4,5,3,0]] },
  rock:      { scale: SCALES.minor,  root: 40, bpm: [120, 142],drums: "rock",     bass: { type: "square", pattern: "eighths", gain: 0.5 }, lead: { type: "square", density: 0.5, octave: 1, gain: 0.3 }, pad: { type: "square", gain: 0.22 }, cutoff: 1850, swing: 0, progs: [[0,0,3,4],[0,5,3,4],[0,3,4,0],[0,4,3,5]] },
  classical: { scale: SCALES.major,  root: 52, bpm: [82, 104], drums: "none",     bass: { type: "triangle", pattern: "root", gain: 0.45 }, lead: { type: "triangle", density: 0.9, octave: 1, gain: 0.42 }, pad: { type: "triangle", gain: 0.35 }, cutoff: 2200, swing: 0, progs: [[0,4,5,3],[0,3,4,5],[0,5,3,4],[3,0,4,5]] },
  deep:      { scale: SCALES.minor,  root: 38, bpm: [60, 74],  drums: "none",     bass: { type: "sine", pattern: "sustain", gain: 0.6 }, lead: { type: "sine", density: 0.2, octave: 1, gain: 0.28 }, pad: { type: "sine", gain: 0.5 }, cutoff: 900, swing: 0, progs: [[0,0,3,4],[0,3,0,5],[0,5,3,0]] },
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

/**
 * Soft-limit to a consistent loudness. Uses RMS (not a single peak, which a
 * stray spike could otherwise crush to near-silence) and a tanh soft-clip so
 * the result is always clearly audible and never harshly distorted.
 */
function softLimit(buffer: AudioBuffer, targetRms = 0.17) {
  let sq = 0, n = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) { sq += d[i] * d[i]; n++; }
  }
  const rms = Math.sqrt(sq / Math.max(1, n)) || 1e-6;
  const g = Math.max(0.5, Math.min(28, targetRms / rms));
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * g) * 0.95;
  }
}

function makeIR(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return ir;
}

export async function generateMusic(
  genreId: string, seed: number, seconds: number,
): Promise<{ bytes: Uint8Array; genreId: string }> {
  const rng = mulberry32(seed);
  const resolved = resolveGenre(genreId, rng);
  const cfg = GENRES[resolved];
  const sr = 44100;
  const dur = Math.max(2, Math.min(600, seconds));

  const OAC: typeof OfflineAudioContext =
    (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const ctx = new OAC(2, Math.ceil(dur * sr), sr);

  // Master chain: bus -> gentle low-pass + high-shelf cut (tames harsh/8-bit
  // highs) -> compressor -> out.
  const master = ctx.createGain(); master.gain.value = 0.5;
  const toneLp = ctx.createBiquadFilter(); toneLp.type = "lowpass"; toneLp.frequency.value = 8500; toneLp.Q.value = 0.5;
  const hshelf = ctx.createBiquadFilter(); hshelf.type = "highshelf"; hshelf.frequency.value = 4500; hshelf.gain.value = -5;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.28;
  master.connect(toneLp); toneLp.connect(hshelf); hshelf.connect(comp); comp.connect(ctx.destination);

  // Convolution reverb send for space & warmth.
  const reverb = ctx.createConvolver(); reverb.buffer = makeIR(ctx, 2.2, 3.2);
  const revReturn = ctx.createGain(); revReturn.gain.value = 0.9;
  reverb.connect(revReturn); revReturn.connect(master);

  // Subtle tempo echo.
  const delay = ctx.createDelay(1.5);
  const fb = ctx.createGain(); fb.gain.value = 0.18;
  const wet = ctx.createGain(); wet.gain.value = 0.09;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);

  const noiseBuf = ctx.createBuffer(1, sr, sr);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rng() * 2 - 1;

  // per-seed variation
  const root = cfg.root + (Math.floor(rng() * 10) - 4);
  const bpm = cfg.bpm[0] + Math.floor(rng() * (cfg.bpm[1] - cfg.bpm[0] + 1));
  const prog = pick(rng, cfg.progs);
  const beat = 60 / bpm, bar = beat * 4, sl = cfg.scale.length;
  delay.delayTime.value = beat / 2;
  const swing = cfg.swing * (beat / 2);

  // a short melodic motif reused (with variation) so the lead feels intentional
  const motifLen = 3 + Math.floor(rng() * 4);
  const motif = Array.from({ length: motifLen }, () => Math.floor(rng() * sl) + (rng() < 0.25 ? sl : 0));

  const tone = (freq: number, start: number, len: number, type: Wave, gain: number, pan: number, rev = 0.25) => {
    const g = ctx.createGain();
    const a = Math.min(0.6, Math.max(0.02, len * 0.22));
    const r = Math.min(2.2, len * 0.55);
    const gv = Math.max(0.0004, gain);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gv, start + a);
    g.gain.setValueAtTime(gv, start + Math.max(a, len - r));
    g.gain.exponentialRampToValueAtTime(0.0001, start + len);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cfg.cutoff; lp.Q.value = 0.7;
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    // Unison: layered, slightly detuned voices for a warmer, richer timbre.
    const voices = type === "sine" ? [0] : [-6, 6];
    for (const dt of voices) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = dt;
      o.connect(g); o.start(start); o.stop(start + len + 0.1);
    }
    g.connect(lp); lp.connect(p); p.connect(master);
    if (rev > 0) { const rs = ctx.createGain(); rs.gain.value = rev; p.connect(rs); rs.connect(reverb); }
    const es = ctx.createGain(); es.gain.value = 0.1; p.connect(es); es.connect(delay);
  };
  const kick = (t: number, gain = 0.85) => {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2500;
    o.connect(g); g.connect(lp); lp.connect(master); o.start(t); o.stop(t + 0.24);
  };
  const noiseHit = (t: number, len: number, hp: number, gain: number) => {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(master);
    const rs = ctx.createGain(); rs.gain.value = 0.08; g.connect(rs); rs.connect(reverb);
    src.start(t); src.stop(t + len + 0.02);
  };
  const hat = (t: number, gain = 0.10) => noiseHit(t, 0.045, 8000, gain);
  const snare = (t: number, gain = 0.28) => noiseHit(t, 0.16, 1600, gain);

  const note = (deg: number, oct: number) => {
    const idx = ((deg % sl) + sl) % sl;
    return root + cfg.scale[idx] + 12 * (oct + Math.floor(deg / sl));
  };

  const bars = Math.ceil(dur / bar);
  let motifPos = 0;
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar;
    const deg = prog[b % prog.length];
    const phrase = b % 4;
    const breather = b > 0 && b % 8 === 7 && rng() < 0.5; // occasional drop-out bar

    // pad chord (with a gentle velocity swell per bar)
    if (cfg.pad) {
      const vel = 0.85 + rng() * 0.25;
      [0, 2, 4].forEach((st, i) => tone(midi(note(deg + st, 0)), t0, bar, cfg.pad!.type, cfg.pad!.gain * 0.4 * vel, (i - 1) * 0.4, 0.3));
      // low root for warmth/body
      tone(midi(note(deg, -1)), t0, bar, "sine", cfg.pad!.gain * 0.5 * vel, 0, 0.15);
    }
    // bass
    if (cfg.bass) {
      const bp = cfg.bass;
      if (bp.pattern === "sustain") tone(midi(note(deg, -2)), t0, bar, bp.type, bp.gain, 0, 0.05);
      else for (let bt = 0; bt < 4; bt++) {
        const t = t0 + bt * beat;
        const walk = rng() < 0.2 ? 4 : 0;
        if (bp.pattern === "root") tone(midi(note(deg + walk, -2)), t, beat * 0.9, bp.type, bp.gain, 0, 0.05);
        if (bp.pattern === "eighths") { tone(midi(note(deg, -2)), t, beat * 0.45, bp.type, bp.gain, 0, 0.05); tone(midi(note(deg + 4, -2)), t + beat / 2, beat * 0.45, bp.type, bp.gain * 0.8, 0, 0.05); }
        if (bp.pattern === "offbeat") tone(midi(note(deg + walk, -2)), t + beat / 2, beat * 0.4, bp.type, bp.gain, 0, 0.05);
      }
    }
    // lead: play the motif over the current chord, with rests + octave jumps
    if (cfg.lead) {
      const steps = 8, stepDur = bar / steps;
      for (let s = 0; s < steps; s++) {
        const swingOff = s % 2 === 1 ? swing : 0;
        if (rng() < cfg.lead.density * 0.85) {
          const m = motif[motifPos % motif.length]; motifPos++;
          const oct = (cfg.lead.octave - 1) + (rng() < 0.18 ? 1 : 0); // an octave lower = warmer, less piercing
          const vel = 0.7 + rng() * 0.35;
          tone(midi(note(deg + m, oct)), t0 + s * stepDur + swingOff, stepDur * 0.9, cfg.lead.type, cfg.lead.gain * 0.85 * vel, (rng() * 2 - 1) * 0.6, 0.35);
        } else {
          motifPos++; // advance so the motif still moves through rests
        }
      }
    }
    // drums with phrase dynamics + fills
    if (!breather) {
      if (cfg.drums === "four") { for (let bt = 0; bt < 4; bt++) kick(t0 + bt * beat); for (let h = 0; h < 8; h++) hat(t0 + h * (beat / 2) + (h % 2 ? swing : 0), h % 2 ? 0.08 : 0.13); }
      else if (cfg.drums === "backbeat") { kick(t0); kick(t0 + 2 * beat); snare(t0 + beat); snare(t0 + 3 * beat); for (let h = 0; h < 8; h++) hat(t0 + h * (beat / 2) + (h % 2 ? swing : 0), h % 2 ? 0.08 : 0.12); }
      else if (cfg.drums === "rock") { kick(t0); kick(t0 + 2 * beat); kick(t0 + 2.5 * beat); snare(t0 + beat); snare(t0 + 3 * beat); for (let h = 0; h < 8; h++) hat(t0 + h * (beat / 2), 0.13); }
      else if (cfg.drums === "ambient") { if (b % 2 === 0) kick(t0, 0.6); }
      // fill on the last bar of a phrase
      if (phrase === 3 && cfg.drums !== "none" && cfg.drums !== "ambient") {
        snare(t0 + 3 * beat + beat / 2, 0.28); snare(t0 + 3.5 * beat + beat / 4, 0.32);
      }
    }
  }

  const rendered = await ctx.startRendering();
  softLimit(rendered);
  return { bytes: wav(rendered), genreId: resolved };
}
