// Generative background music, synthesized entirely in the browser with the
// Web Audio API. No external files, no API keys, always royalty-free & SFW,
// and unique per seed so tracks never repeat across a batch.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

type Wave = OscillatorType;

interface Preset {
  root: number;          // MIDI root note
  scale: number[];       // semitone offsets
  progression: number[]; // scale-degree indices for chord roots
  chordDur: number;      // seconds per chord
  cutoff: number;        // low-pass cutoff (brightness)
  wave: Wave;            // pad timbre
  arp: boolean;
  arpSteps: number;
  arpDensity: number;
  arpWave: Wave;
  delay: number;         // echo time
  padGain: number;
}

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentaMajor: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const PRESETS: Record<string, Preset> = {
  ambient:   { root: 48, scale: SCALES.minor,      progression: [0, 5, 3, 4], chordDur: 6, cutoff: 1200, wave: "sine",     arp: false, arpSteps: 8, arpDensity: 0,    arpWave: "triangle", delay: 0.5,  padGain: 0.13 },
  calm:      { root: 50, scale: SCALES.pentaMajor, progression: [0, 3, 1, 4], chordDur: 5, cutoff: 1700, wave: "sine",     arp: true,  arpSteps: 8, arpDensity: 0.4,  arpWave: "triangle", delay: 0.45, padGain: 0.12 },
  uplifting: { root: 52, scale: SCALES.major,      progression: [0, 4, 5, 3], chordDur: 4, cutoff: 2400, wave: "triangle", arp: true,  arpSteps: 8, arpDensity: 0.6,  arpWave: "triangle", delay: 0.35, padGain: 0.11 },
  cinematic: { root: 45, scale: SCALES.minor,      progression: [0, 5, 3, 4], chordDur: 7, cutoff: 1400, wave: "sine",     arp: false, arpSteps: 8, arpDensity: 0,    arpWave: "triangle", delay: 0.6,  padGain: 0.14 },
  lofi:      { root: 48, scale: SCALES.dorian,     progression: [0, 3, 4, 1], chordDur: 5, cutoff: 1100, wave: "triangle", arp: true,  arpSteps: 8, arpDensity: 0.35, arpWave: "sine",     delay: 0.5,  padGain: 0.12 },
  deep:      { root: 40, scale: SCALES.minor,      progression: [0, 0, 3, 4], chordDur: 8, cutoff: 800,  wave: "sine",     arp: false, arpSteps: 8, arpDensity: 0,    arpWave: "sine",     delay: 0.7,  padGain: 0.15 },
};

function audioBufferToWav(buffer: AudioBuffer): Uint8Array {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const frames = buffer.length;
  const blockAlign = numCh * 2;
  const dataSize = frames * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * blockAlign, true); view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, dataSize, true);
  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Uint8Array(buf);
}

/** Resolve a possibly-random mood id to a concrete generative preset id. */
export function resolveMood(moodId: string, rng: () => number = Math.random): string {
  if (PRESETS[moodId]) return moodId;
  const ids = Object.keys(PRESETS);
  return ids[Math.floor(rng() * ids.length)];
}

/**
 * Synthesize a short seamless-ish loop for the given mood/seed and return it as
 * WAV bytes. ffmpeg then loops/trims it to the exact video length.
 */
export async function generateMusicLoop(
  moodId: string,
  seed: number,
  seconds = 40,
): Promise<{ bytes: Uint8Array; moodId: string }> {
  const rng = mulberry32(seed);
  const resolved = resolveMood(moodId, rng);
  const p = PRESETS[resolved];
  const sr = 44100;

  const OAC: typeof OfflineAudioContext =
    (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const ctx = new OAC(2, Math.ceil(seconds * sr), sr);

  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);

  // simple stereo echo for space
  const delay = ctx.createDelay(1.5);
  delay.delayTime.value = p.delay;
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(master);

  function note(freq: number, start: number, dur: number, type: Wave, gainVal: number, pan: number) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    const a = Math.min(0.5, dur * 0.35);
    const r = Math.min(1.6, dur * 0.5);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gainVal, start + a);
    g.gain.setValueAtTime(gainVal, start + Math.max(a, dur - r));
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = p.cutoff;
    o.connect(g);
    g.connect(lp);
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    lp.connect(panner);
    panner.connect(master);
    panner.connect(delay);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  let t = 0;
  let ci = 0;
  while (t < seconds) {
    const deg = p.progression[ci % p.progression.length];
    const sl = p.scale.length;
    const chord = [0, 2, 4].map((step) => {
      const idx = deg + step;
      return p.scale[idx % sl] + 12 * Math.floor(idx / sl);
    });
    chord.forEach((semi, i) => note(midi(p.root + semi), t, p.chordDur, p.wave, p.padGain, (rng() * 2 - 1) * 0.5 * (i ? 1 : 0.3)));
    // bass
    note(midi(p.root + p.scale[deg % sl] - 12), t, p.chordDur, "sine", 0.2, 0);
    // arpeggio / melody
    if (p.arp) {
      const stepDur = p.chordDur / p.arpSteps;
      for (let s = 0; s < p.arpSteps; s++) {
        if (rng() < p.arpDensity) {
          const semi = p.scale[Math.floor(rng() * sl)] + 12;
          note(midi(p.root + semi), t + s * stepDur, stepDur * 0.9, p.arpWave, 0.08, (rng() * 2 - 1) * 0.7);
        }
      }
    }
    t += p.chordDur;
    ci++;
  }

  const rendered = await ctx.startRendering();
  return { bytes: audioBufferToWav(rendered), moodId: resolved };
}
