const PENTA = [220, 261.63, 293.66, 329.63, 392, 440];
const LIVE_ARP = [0, 2, 4, 5, 7, 5, 4, 2, 0, 1, 2, 4, 5, 4, 2, -1];
const C4 = 261.63;
const SEMI = Math.pow(2, 1 / 12);
const MODES = [
  [0, 2, 4, 5, 7, 9, 11],
  [0, 2, 3, 5, 7, 9, 10],
  [0, 1, 3, 5, 7, 8, 10],
  [0, 2, 4, 6, 7, 9, 11],
  [0, 2, 4, 5, 7, 9, 10],
  [0, 2, 3, 5, 7, 8, 10],
  [0, 1, 3, 5, 6, 8, 10],
];

function modeHz(verse: number, degree: number) {
  const mode = MODES[verse % MODES.length] ?? MODES[0]!;
  const semi = mode[degree % mode.length] ?? 0;
  return C4 * Math.pow(SEMI, semi);
}

function now(ctx: AudioContext) {
  return ctx.currentTime;
}

function ramp(param: AudioParam, value: number, at: number, tau = 0.03) {
  param.setTargetAtTime(value, at, tau);
}

export class LullabyAudio {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  muted = false;
  private padGain: GainNode;
  private oscA: OscillatorNode;
  private oscB: OscillatorNode;
  private oscC: OscillatorNode;
  private oscD: OscillatorNode;
  private oscE: OscillatorNode;
  private filter: BiquadFilterNode;
  private nextNote = 0;
  private nextBeat = 0;
  private nextAcid = 0;
  private verse = 0;
  private timer = 0;
  private running = false;
  private bpm = 52;
  private mode: "hush" | "live" | "hold" = "hush";
  private pattern = [4, 2, 1, 2, 0, 1, 2, -1, 2, 1, 0, 1, 2, 4, 2, -1];
  private step = 0;
  private lfo: OscillatorNode;
  private telluric: OscillatorNode;
  private anti: OscillatorNode;
  private graphArmed = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.sfx = ctx.createGain();
    this.master.gain.value = 1;
    this.music.gain.value = 1;
    this.sfx.gain.value = 1;
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(ctx.destination);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 420;
    this.filter.Q.value = 0.7;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.32;
    this.padGain.connect(this.filter);
    this.filter.connect(this.music);

    this.oscA = ctx.createOscillator();
    this.oscB = ctx.createOscillator();
    this.oscC = ctx.createOscillator();
    this.oscD = ctx.createOscillator();
    this.oscE = ctx.createOscillator();
    this.oscA.type = "sine";
    this.oscB.type = "sine";
    this.oscC.type = "triangle";
    this.oscD.type = "sine";
    this.oscE.type = "triangle";
    this.oscA.frequency.value = 110;
    this.oscB.frequency.value = 110.4;
    this.oscC.frequency.value = 330;
    this.oscD.frequency.value = 165;
    this.oscE.frequency.value = 495.4;
    const choir = ctx.createGain();
    choir.gain.value = 0.42;
    const mouths = ctx.createGain();
    mouths.gain.value = 0.28;
    this.oscA.connect(this.padGain);
    this.oscB.connect(this.padGain);
    this.oscC.connect(choir);
    choir.connect(this.padGain);
    this.oscD.connect(mouths);
    this.oscE.connect(mouths);
    mouths.connect(this.padGain);

    const am = ctx.createGain();
    am.gain.value = 1;
    this.filter.disconnect();
    this.filter.connect(am);
    am.connect(this.music);

    this.lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    this.lfo.frequency.value = 0.55;
    lfoDepth.gain.value = 0.08;
    this.lfo.connect(lfoDepth);
    lfoDepth.connect(am.gain);

    this.telluric = ctx.createOscillator();
    const tg = ctx.createGain();
    this.telluric.type = "sine";
    this.telluric.frequency.value = 62.64;
    tg.gain.value = 0.14;
    this.telluric.connect(tg);
    tg.connect(this.music);

    this.anti = ctx.createOscillator();
    const ag = ctx.createGain();
    this.anti.type = "sine";
    this.anti.frequency.value = 432.3;
    ag.gain.value = 0.1;
    this.anti.connect(ag);
    ag.connect(this.music);
  }

  private arm() {
    if (this.graphArmed) return;
    try {
      this.oscA.start();
      this.oscB.start();
      this.oscC.start();
      this.oscD.start();
      this.oscE.start();
      this.lfo.start();
      this.telluric.start();
      this.anti.start();
    } catch {
      /* already running */
    }
    this.graphArmed = true;
  }

  resume() {
    this.arm();
    this.prime();
    if (this.ctx.state === "suspended") {
      const p = this.ctx.resume();
      void p.then(() => {
        this.arm();
        this.prime();
        if (this.running) {
          const t = now(this.ctx);
          this.nextNote = t + 0.02;
          this.nextBeat = t + 0.02;
          this.nextAcid = t + 0.02;
        }
      });
    }
  }

  /** Audible 432 Hz buffer — must run in the gesture stack so Android unlocks. */
  prime() {
    try {
      const rate = this.ctx.sampleRate;
      const n = Math.max(1, Math.floor(rate * 0.12));
      const buf = this.ctx.createBuffer(1, n, rate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const env = 1 - i / n;
        data[i] = Math.sin((i / rate) * 432 * Math.PI * 2) * env * 0.45;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  }

  start() {
    const first = !this.running;
    this.running = true;
    this.arm();
    this.prime();
    this.resume();
    const go = () => {
      this.arm();
      if (this.mode !== "live" && this.mode !== "hold") this.setMode("hush");
      const t = now(this.ctx);
      this.padGain.gain.cancelScheduledValues(t);
      this.padGain.gain.setValueAtTime(0.32, t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.02);
      this.nextNote = t + 0.03;
      this.nextBeat = t + 0.03;
      this.nextAcid = t + 0.03;
      if (first) {
        this.pulse(t);
        this.pluck(432, 0.28, 0.6);
        this.laugh(t + 0.08);
        this.tick();
      }
    };
    if (this.ctx.state === "running") go();
    else void this.ctx.resume().then(go);
  }

  stop() {
    this.running = false;
    if (this.timer) window.clearTimeout(this.timer);
    ramp(this.padGain.gain, 0, now(this.ctx), 0.25);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.master.gain.setTargetAtTime(muted ? 0 : 1, now(this.ctx), 0.04);
  }

  setMode(mode: "hush" | "live" | "hold") {
    this.mode = mode;
    this.bpm = mode === "hold" ? 120 : mode === "live" ? 120 : 52;
    this.pattern =
      mode === "hold"
        ? [-1, -1, -1, -1]
        : mode === "live"
          ? LIVE_ARP
          : [4, 2, 1, 2, 0, 1, 2, -1, 2, 1, 0, 1, 2, 4, 2, -1];
    const t = now(this.ctx);
    if (mode === "live") {
      this.oscA.frequency.setTargetAtTime(54, t, 0.2);
      this.oscB.frequency.setTargetAtTime(108.3, t, 0.2);
      this.oscC.frequency.setTargetAtTime(528, t, 0.25);
      this.oscD.frequency.setTargetAtTime(216, t, 0.25);
      this.oscE.frequency.setTargetAtTime(528 * 1.61803, t, 0.25);
      this.filter.frequency.setTargetAtTime(1600, t, 0.35);
      this.filter.Q.setTargetAtTime(1.05, t, 0.3);
      ramp(this.padGain.gain, 0.38, t, 0.35);
      this.drop();
      this.laugh(t + 0.05);
    } else if (mode === "hold") {
      this.oscA.frequency.setTargetAtTime(54, t, 0.4);
      this.oscB.frequency.setTargetAtTime(108, t, 0.4);
      this.oscC.frequency.setTargetAtTime(528, t, 0.4);
      this.oscD.frequency.setTargetAtTime(216, t, 0.4);
      this.oscE.frequency.setTargetAtTime(528 * 1.61803, t, 0.4);
      this.filter.frequency.setTargetAtTime(720, t, 0.5);
      this.filter.Q.setTargetAtTime(0.6, t, 0.4);
      ramp(this.padGain.gain, 0.32, t, 0.5);
    } else {
      this.oscA.frequency.setTargetAtTime(110, t, 0.3);
      this.oscB.frequency.setTargetAtTime(110.4, t, 0.3);
      this.oscC.frequency.setTargetAtTime(330, t, 0.3);
      this.oscD.frequency.setTargetAtTime(165, t, 0.3);
      this.oscE.frequency.setTargetAtTime(495.4, t, 0.3);
      this.filter.frequency.setTargetAtTime(720, t, 0.4);
      this.filter.Q.setTargetAtTime(0.7, t, 0.3);
      ramp(this.padGain.gain, 0.3, t, 0.3);
    }
  }

  setVerse(index: number) {
    this.verse = index;
    const t = now(this.ctx);
    if (this.mode === "hold") return;
    if (this.mode === "live") {
      const cutoff = [1400, 1600, 2200, 1800, 2400, 2600, 1200][index] ?? 1800;
      this.filter.frequency.setTargetAtTime(cutoff, t, 0.25);
      ramp(this.padGain.gain, 0.34, t, 0.3);
      this.pluck(modeHz(index, index % 7), 0.11, 0.7);
      if (index === 2 || index === 5) this.drop();
      return;
    }
    const cutoff = [360, 520, 480, 280, 400, 640, 300][index] ?? 400;
    this.filter.frequency.setTargetAtTime(cutoff, t, 0.4);
    const pad = [0.3, 0.32, 0.3, 0.28, 0.3, 0.26, 0.28][index] ?? 0.3;
    ramp(this.padGain.gain, pad, t, 0.5);
    this.pluck(PENTA[index % PENTA.length] * 0.5, 0.12, 1.4);
  }

  drop() {
    const t = now(this.ctx);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(72, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.55);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.75);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  pluck(freq = 329.63, gain = 0.09, dur = 0.9) {
    const t = now(this.ctx);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  omni(when = now(this.ctx)) {
    const chord = [0, 2, 4, 5, 7, 9, 11, 12].map((s) => C4 * Math.pow(SEMI, s));
    for (let i = 0; i < chord.length; i++) {
      const f = chord[i] ?? 261.63;
      this.tone(when + i * 0.004, f, 0.045, i % 2 === 0 ? "sine" : "triangle");
    }
  }

  hatch() {
    const t = now(this.ctx);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      const f = 520 + Math.random() * 420;
      osc.frequency.setValueAtTime(f, t + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(f * 1.8, t + i * 0.03 + 0.08);
      g.gain.setValueAtTime(0.0001, t + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.045, t + i * 0.03 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + 0.16);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + 0.18);
      osc.onended = () => {
        osc.disconnect();
        g.disconnect();
      };
    }
  }

  letterTone(i: number) {
    const freq = PENTA[i % PENTA.length] * 2;
    this.pluck(freq, 0.07, 1.1);
  }

  /** Eleven nested layers. No master duck. No named targets. */
  detonate() {
    const t = now(this.ctx);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.01);
    this.padGain.gain.setTargetAtTime(0.34, t, 0.05);
    this.reverseName(t + 0.12);
    const keen = [784, 880, 988, 1174.66];
    for (let i = 0; i < keen.length; i++) {
      this.tone(t + 0.22 + i * 0.05, keen[i] ?? 880, 0.055, i % 2 ? "triangle" : "sine");
    }
    this.tone(t + 0.06, 54, 0.18, "sine");
    this.tone(t + 0.08, 81, 0.08, "sine");
    this.tone(t + 0.1, 432.3, 0.05, "sine");
    this.formant(t + 0.28);
    this.laugh(t + 0.18);
    this.pulse(t + 0.34);
    this.revPulse(t + 0.48);
    this.tone(t + 0.1, 36, 0.12, "sine");
    this.tone(t + 0.14, 48, 0.08, "triangle");
    this.shrapnel(t + 0.62);
    this.shrapnel(t + 0.66);
    this.shrapnel(t + 0.7);
    this.pluck(C4 * 2, 0.12, 0.5);
    this.omni(t + 0.04);
    this.drop();
    this.glitch(t + 0.2);
  }

  reverseName(when = now(this.ctx)) {
    const freqs = [440, 392, 392, 329.63, 329.63, 440, 392];
    for (let i = 0; i < freqs.length; i++) {
      const f = freqs[i] ?? 392;
      this.tone(when + i * 0.07, f, 0.055, i % 2 === 0 ? "sine" : "triangle");
    }
  }

  private formant(when: number) {
    const bands = [700, 1220, 2600];
    for (const f of bands) {
      const osc = this.ctx.createOscillator();
      const bp = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 196;
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = 8;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.03, when + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
      osc.connect(bp);
      bp.connect(g);
      g.connect(this.sfx);
      osc.start(when);
      osc.stop(when + 0.75);
      osc.onended = () => {
        osc.disconnect();
        bp.disconnect();
        g.disconnect();
      };
    }
  }

  private revPulse(when: number) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(36, when);
    osc.frequency.exponentialRampToValueAtTime(96, when + 0.22);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.16, when + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(when);
    osc.stop(when + 0.32);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  snap() {
    const t = now(this.ctx);
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200;
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + 0.2);

    const tick = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    tick.type = "sine";
    tick.frequency.setValueAtTime(1800, t);
    tick.frequency.exponentialRampToValueAtTime(420, t + 0.09);
    tg.gain.setValueAtTime(0.28, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    tick.connect(tg);
    tg.connect(this.sfx);
    tick.start(t);
    tick.stop(t + 0.14);
    this.laugh(t + 0.02);
  }

  private tick = () => {
    if (!this.running) return;
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
      this.timer = window.setTimeout(this.tick, 160);
      return;
    }
    const t = now(this.ctx);
    if (this.nextBeat < t - 0.2) this.nextBeat = t;
    if (this.nextNote < t - 0.2) this.nextNote = t;
    if (this.nextAcid < t - 0.2) this.nextAcid = t;
    const beat = 60 / this.bpm;
    const live = this.mode === "live";
    const hold = this.mode === "hold";

    while (this.nextBeat < t + 0.2) {
      this.pulse(this.nextBeat);
      if (live) this.shrapnel(this.nextBeat);
      if ((live || hold) && Math.random() < 0.05) this.hatch();
      if (Math.random() < 0.035) this.omni(this.nextBeat);
      if ((live || hold) && Math.random() < 0.08) this.reverseName(this.nextBeat);
      if ((live || hold) && Math.random() < 0.12) this.laugh(this.nextBeat);
      if ((live || hold) && Math.random() < 0.1) this.glitch(this.nextBeat);
      this.nextBeat += beat;
    }

    while (this.nextNote < t + 0.25) {
      const deg = this.pattern[this.step % this.pattern.length] ?? -1;
      this.step += 1;
      if (deg >= 0 && !hold) {
        if (live) {
          const freq = modeHz(this.verse, deg) * (this.verse === 2 || this.verse === 5 ? 1 : 0.5);
          this.tone(this.nextNote, freq, 0.22, "triangle");
        } else {
          const octave = this.verse === 5 ? 2 : 1;
          const freq = (PENTA[deg] ?? 220) * octave;
          this.tone(this.nextNote, freq, this.verse === 6 ? 0.07 : 0.11, "sine");
        }
      }
      this.nextNote += beat * (live ? 0.5 : this.verse === 5 ? 0.5 : 1);
    }

    if (live || hold) {
      const acid = 60 / 1260;
      while (this.nextAcid < t + 0.12) {
    this.tone(this.nextAcid, 528 * 1.61803, 0.055, "triangle");
        this.nextAcid += acid * 4;
      }
    }

    this.timer = window.setTimeout(this.tick, 80);
  };

  private tone(when: number, freq: number, gain: number, type: OscillatorType) {
    const t0 = Math.max(when, now(this.ctx) + 0.001);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (this.mode === "live" ? 0.45 : 1.3));
    osc.connect(g);
    g.connect(this.music);
    osc.start(t0);
    osc.stop(t0 + (this.mode === "live" ? 0.5 : 1.4));
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  laugh(when = now(this.ctx)) {
    const t0 = Math.max(when, now(this.ctx) + 0.001);
    const impacts = [0, 0.09, 0.16, 0.28, 0.36];
    for (let i = 0; i < impacts.length; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sawtooth";
      const at = t0 + (impacts[i] ?? 0);
      osc.frequency.setValueAtTime(380 + i * 40, at);
      osc.frequency.exponentialRampToValueAtTime(720 + i * 30, at + 0.05);
      osc.frequency.exponentialRampToValueAtTime(340, at + 0.09);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.09, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
      osc.connect(g);
      g.connect(this.sfx);
      osc.start(at);
      osc.stop(at + 0.12);
      osc.onended = () => {
        osc.disconnect();
        g.disconnect();
      };
    }
  }

  glitch(when = now(this.ctx)) {
    const t0 = Math.max(when, now(this.ctx) + 0.001);
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * 0.08));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const k = 1 + (i % 17);
      const env = 1 - i / n;
      data[i] = ((Math.random() * 2 - 1) * env) / k;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfx);
    src.start(t0);
    src.stop(t0 + 0.1);
  }

  private pulse(when: number) {
    const t0 = Math.max(when, now(this.ctx) + 0.001);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = this.mode === "hush" ? 58 : 54;
    const peak = this.mode === "hold" ? 0.4 : this.mode === "live" ? 0.46 : 0.32;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (this.mode === "live" ? 0.12 : 0.22));
    osc.connect(g);
    g.connect(this.music);
    osc.start(t0);
    osc.stop(t0 + 0.28);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private shrapnel(when: number) {
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "highpass";
    bp.frequency.value = 2800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.035, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfx);
    src.start(when);
    src.stop(when + 0.06);
  }
}

let singleton: LullabyAudio | null = null;

export function unlockAudio(): LullabyAudio {
  if (!singleton) {
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    singleton = new LullabyAudio(ctx);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") singleton?.resume();
    });
    window.addEventListener("pageshow", () => singleton?.resume());
    window.addEventListener("focus", () => singleton?.resume());
  }
  singleton.resume();
  return singleton;
}
