import { BINARY_ROWS, type MotifName } from "@/lib/lullaby";

export type FieldMotif = {
  name: MotifName;
  verse: number;
  ink: number;
  fire: number;
  binary: number;
  bow: number;
  snap: number;
  sleep: number;
  bloom: number;
  apotheosis: number;
  reduced: boolean;
};

type Hypha = {
  ax: number;
  ay: number;
  ang: number;
  max: number;
  grown: number;
  gen: number;
  pulse: number;
  branched: boolean;
  curl: number;
};

type Spore = { x: number; y: number; vx: number; vy: number; life: number; r: number };
type Petal = { letter: string; bits: string; k: string; n: string; ang: number; bloom: number; ash: number };
type Sac = {
  ox: number;
  oy: number;
  swell: number;
  gen: number;
  attached: boolean;
  x: number;
  y: number;
};
type Brood = {
  x: number;
  y: number;
  angle: number;
  u: number;
  si: number;
  leg: number;
  scale: number;
  life: number;
  visible: number;
  gen: number;
};
type Birth = { x: number; y: number; r: number };
type Thought = { x: number; y: number; life: number; spokes: number };

type FieldImages = {
  field?: HTMLImageElement;
  ink?: HTMLImageElement;
  omega?: HTMLImageElement;
  bloom?: HTMLImageElement;
  key?: HTMLImageElement;
  heart?: HTMLImageElement;
  eye?: HTMLImageElement;
  crown?: HTMLImageElement;
  wings?: HTMLImageElement;
  lock?: HTMLImageElement;
  helix?: HTMLImageElement;
  origin?: HTMLImageElement;
  infernoBackdrop?: HTMLImageElement;
  pharma?: HTMLImageElement;
  endgame?: HTMLImageElement;
  pre?: HTMLImageElement;
  ascent?: HTMLImageElement;
  seal?: HTMLImageElement;
  iam?: HTMLImageElement;
  inferno?: HTMLImageElement;
  helixOmega?: HTMLImageElement;
  singularity?: HTMLImageElement;
  answer?: HTMLImageElement;
  decree?: HTMLImageElement;
  iamSeal?: HTMLImageElement;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CAP = 180;
const BROOD_CAP = 48;
const SAC_CAP = 16;
const GATES = [
  { name: "Ω = I", sub: "SOURCE" },
  { name: "ANSWER FIRST", sub: "INFERNO" },
  { name: "DUAL FIELD", sub: "PROOF" },
  { name: "4120 KERNEL", sub: "GLYPH" },
  { name: "INFERNO", sub: "CROWN" },
  { name: "I AM", sub: "THE FIELD" },
  { name: "SINGULARITY", sub: "ROOT OS" },
  { name: "WHITEBOX", sub: "META" },
] as const;

export class WeaverWorld {
  t = 0;
  hyphae: Hypha[] = [];
  spores: Spore[] = [];
  petals: Petal[] = [];
  spider = { x: 0, y: 0, angle: 0, u: 0, si: 0, leg: 0, visible: 0 };
  sacs: Sac[] = [];
  brood: Brood[] = [];
  births: Birth[] = [];
  thoughts: Thought[] = [];
  trauma = 0;
  inkBleed = 0;
  fire = 0;
  snapRing = 0;
  bloomRing = 0;
  breath = 0;
  nuke = 0;
  private lastBloom = 0;
  private lastPeak = 0;
  private lastOmni = -10;
  private lastPortal = 0;
  private w = 1;
  private h = 1;
  private rand = mulberry32(1260);
  private cx = 0.5;
  private cy = 0.38;

  constructor() {
    this.petals = BINARY_ROWS.map((row, i) => ({
      letter: row.letter,
      bits: row.bits,
      k: row.k,
      n: row.n,
      ang: -Math.PI / 2 + (i * 2 * Math.PI) / 7,
      bloom: 0.72,
      ash: 0,
    }));
  }

  resize(w: number, h: number) {
    const prevSpan = Math.min(this.w, this.h);
    this.w = w;
    this.h = h;
    this.cx = w / 2;
    this.cy = h * 0.4;
    if (this.hyphae.length === 0 || prevSpan < 32) this.seed();
  }

  private seed() {
    const span = Math.min(this.w, this.h);
    this.hyphae = [];
    this.rand = mulberry32(1260);
    for (let i = 0; i < 11; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 11 + (this.rand() - 0.5) * 0.18;
      this.hyphae.push({
        ax: this.cx,
        ay: this.cy,
        ang,
        max: span * (0.22 + this.rand() * 0.14),
        grown: 0.82 + this.rand() * 0.18,
        gen: 0,
        pulse: this.rand(),
        branched: true,
        curl: (this.rand() - 0.5) * 0.55,
      });
    }
    const extras: Hypha[] = [];
    for (const h of this.hyphae) {
      const tip = this.tip(h);
      extras.push({
        ax: tip.x,
        ay: tip.y,
        ang: h.ang - 0.55,
        max: h.max * 0.62,
        grown: 0.7,
        gen: 1,
        pulse: this.rand(),
        branched: true,
        curl: (this.rand() - 0.5) * 0.7,
      });
      extras.push({
        ax: tip.x,
        ay: tip.y,
        ang: h.ang + 0.55,
        max: h.max * 0.58,
        grown: 0.62,
        gen: 1,
        pulse: this.rand(),
        branched: false,
        curl: (this.rand() - 0.5) * 0.7,
      });
    }
    this.hyphae.push(...extras);
    this.spider.x = this.cx;
    this.spider.y = this.cy;
    this.spider.visible = 1;
    this.spores = [];
    this.brood = [];
    this.births = [];
    this.sacs = [
      { ox: -9.2, oy: 0, swell: 0.72, gen: 0, attached: true, x: 0, y: 0 },
      { ox: -7.4, oy: 3.6, swell: 0.4, gen: 0, attached: true, x: 0, y: 0 },
      { ox: -7.1, oy: -3.8, swell: 0.55, gen: 0, attached: true, x: 0, y: 0 },
      { ox: -11.4, oy: 1.8, swell: 0.22, gen: 0, attached: true, x: 0, y: 0 },
      { ox: -11.2, oy: -2.1, swell: 0.18, gen: 0, attached: true, x: 0, y: 0 },
      { ox: -5.6, oy: 5.2, swell: 0.08, gen: 0, attached: true, x: 0, y: 0 },
      { ox: -5.4, oy: -5.4, swell: 0.12, gen: 0, attached: true, x: 0, y: 0 },
    ];
    this.hatch(this.cx, this.cy, 0, false, true);
    this.hatch(this.cx + span * 0.08, this.cy - span * 0.04, 1, false, true);
  }

  setVerse(_verse: number) {
    // Growth is timeless. Verse only colors the field.
  }

  private tip(h: Hypha) {
    const len = h.max * h.grown;
    const wobble = Math.sin(this.t * 0.7 + h.ang) * h.curl * 18 * h.grown;
    const px = -Math.sin(h.ang) * wobble;
    const py = Math.cos(h.ang) * wobble;
    return {
      x: h.ax + Math.cos(h.ang) * len + px,
      y: h.ay + Math.sin(h.ang) * len + py,
    };
  }

  update(dt: number, motif: FieldMotif) {
    this.t += dt;
    const reduced = motif.reduced;
    const live = motif.apotheosis > 0.4;
    const grow = reduced ? 1.1 : live ? 0.62 : 0.34;

    this.breath = 0.5 + 0.5 * Math.sin(this.t * 0.55);
    if (this.breath > 0.92 && this.lastPeak <= 0.92) this.bloomRing = 0.04;
    this.lastPeak = this.breath;

    this.inkBleed += (motif.ink - this.inkBleed) * (1 - Math.exp(-dt * 1.4));
    this.fire += (motif.fire - this.fire) * (1 - Math.exp(-dt * 2));
    if (motif.snap > 0.5 && this.snapRing < 0.05) this.snapRing = 0.05;
    if (this.snapRing > 0) this.snapRing = Math.min(1, this.snapRing + dt * 1.4);

    if (motif.bloom > 0.5 && this.lastBloom <= 0.5) this.bloomRing = 0.04;
    this.lastBloom = motif.bloom;
    if (this.bloomRing > 0 && this.bloomRing < 1) this.bloomRing = Math.min(1, this.bloomRing + dt * 0.85);

    const span = Math.min(this.w, this.h);
    const newborns: Hypha[] = [];

    for (const h of this.hyphae) {
      if (h.grown < 1) h.grown = Math.min(1, h.grown + dt * grow * (0.55 + (6 - h.gen) * 0.12));
      h.pulse = (h.pulse + dt * (live ? 0.9 : 0.45)) % 1;

      if (!h.branched && h.grown > 0.72 && h.gen < 5 && this.hyphae.length + newborns.length < CAP) {
        h.branched = true;
        const tip = this.tip(h);
        const forks = h.gen < 2 ? 2 : this.rand() > 0.35 ? 2 : 1;
        for (let f = 0; f < forks; f++) {
          const spread = (f === 0 ? -1 : 1) * (0.45 + this.rand() * 0.7);
          newborns.push({
            ax: tip.x,
            ay: tip.y,
            ang: h.ang + spread + (this.rand() - 0.5) * 0.25,
            max: h.max * (0.55 + this.rand() * 0.35),
            grown: 0.02,
            gen: h.gen + 1,
            pulse: this.rand(),
            branched: false,
            curl: (this.rand() - 0.5) * 0.8,
          });
        }
      }
    }
    if (newborns.length) this.hyphae.push(...newborns);

    if (this.hyphae.length >= CAP) {
      for (const h of this.hyphae) {
        if (h.gen >= 4 && h.grown >= 1 && this.rand() < dt * 0.08) {
          h.grown = 0.12;
          h.branched = false;
          const parent = this.hyphae[Math.floor(this.rand() * Math.min(14, this.hyphae.length))];
          if (parent && parent.grown > 0.5) {
            const tip = this.tip(parent);
            h.ax = tip.x;
            h.ay = tip.y;
            h.ang = parent.ang + (this.rand() - 0.5) * 1.6;
          }
        }
      }
    }

    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      if (!p) continue;
      const opened = Math.max(motif.binary, motif.verse + 1, live ? 7 : 0);
      const target = opened > i ? 0.92 + this.breath * 0.12 : 0.22 + this.breath * 0.12;
      p.bloom += (target - p.bloom) * (1 - Math.exp(-dt * 2.4));
      const ashTarget = live ? 1 : motif.fire > 0.5 ? 0.7 : 0;
      p.ash += (ashTarget - p.ash) * (1 - Math.exp(-dt * 1.6));
    }

    if (this.spores.length < (reduced ? 28 : live ? 140 : 80) && this.rand() < dt * (live ? 48 : 10)) {
      const src = this.hyphae[Math.floor(this.rand() * this.hyphae.length)];
      if (src) {
        const tip = this.tip(src);
        this.spores.push({
          x: tip.x,
          y: tip.y,
          vx: (this.rand() - 0.5) * (live ? 42 : 18),
          vy: (this.rand() - 0.55) * (live ? 36 : 16),
          life: 1,
          r: 0.6 + this.rand() * (live ? 2.4 : 1.6),
        });
      }
    }
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const s = this.spores[i];
      if (!s) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt * (live ? 0.12 : 0.22);
      if (s.life <= 0) this.spores.splice(i, 1);
    }

    this.spider.visible += (1 - this.spider.visible) * (1 - Math.exp(-dt * 1.2));
    const path = this.hyphae[this.spider.si] ?? this.hyphae[0];
    if (path && path.grown > 0.2) {
      const speed = reduced ? 0 : live ? 0.38 : 0.16;
      this.spider.u += dt * speed;
      this.spider.leg += dt * 8;
      if (this.spider.u >= 1) {
        this.spider.u = 0;
        const grown = this.hyphae.filter((h) => h.grown > 0.4);
        if (grown.length) {
          const next = grown[Math.floor(this.rand() * grown.length)];
          this.spider.si = Math.max(0, this.hyphae.indexOf(next));
        }
      }
      const liveH = this.hyphae[this.spider.si] ?? path;
      const tip = this.tip(liveH);
      const u = Math.min(1, this.spider.u);
      this.spider.x = liveH.ax + (tip.x - liveH.ax) * u;
      this.spider.y = liveH.ay + (tip.y - liveH.ay) * u;
      this.spider.angle = Math.atan2(tip.y - liveH.ay, tip.x - liveH.ax);
    }

    if (motif.bow > 0) this.spider.angle += Math.sin(this.t * 2) * 0.01;

    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    this.updateSacs(dt, motif, reduced, live);
    this.updateBrood(dt, reduced, live);

    for (const b of this.births) b.r += dt * 1.8;
    this.births = this.births.filter((b) => b.r < 1);

    if (!reduced && this.rand() < dt * (live ? 0.55 : 0.18)) {
      const h = this.hyphae[Math.floor(this.rand() * this.hyphae.length)];
      if (h && h.grown > 0.4) {
        const tip = this.tip(h);
        this.hatch(tip.x, tip.y, 1, reduced, live);
      }
    }

    if (this.t - this.lastOmni > (reduced ? 4.2 : live ? 1.8 : 2.6)) {
      this.lastOmni = this.t;
      const n = reduced ? 6 : 12;
      const rad = span * 0.17;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + this.t * 0.15;
        this.thoughts.push({
          x: this.cx + Math.cos(ang) * rad,
          y: this.cy + Math.sin(ang) * rad,
          life: 1,
          spokes: 6,
        });
      }
      this.thoughts.push({ x: this.cx, y: this.cy, life: 1, spokes: 12 });
      this.trauma = Math.min(1, this.trauma + 0.22);
      this.nuke = 1;
      for (const h of this.hyphae) {
        if (h.grown < 1 && this.rand() < 0.2) h.grown = 1;
      }
    }
    for (let i = this.thoughts.length - 1; i >= 0; i--) {
      const th = this.thoughts[i];
      if (!th) continue;
      th.life -= dt * 1.15;
      if (th.life <= 0) this.thoughts.splice(i, 1);
    }
    this.nuke = Math.max(0, this.nuke - dt * (live ? 0.35 : 2.6));
    if (live) this.nuke = Math.max(this.nuke, 0.55);

    this.lastPortal += dt;
    if (this.lastPortal > (reduced ? 2.4 : live ? 1.1 : 1.8)) {
      this.lastPortal = 0;
      const i = Math.floor(this.rand() * 8);
      const p = portalPos(this.cx, this.cy, Math.min(this.w, this.h), this.t, i);
      this.hatch(p.x, p.y, i % 4, reduced, live);
      if (this.hyphae.length < CAP) {
        this.hyphae.push({
          ax: p.x,
          ay: p.y,
          ang: this.rand() * Math.PI * 2,
          max: span * (0.08 + this.rand() * 0.1),
          grown: 0.08,
          gen: 2,
          pulse: this.rand(),
          branched: false,
          curl: (this.rand() - 0.5) * 0.8,
        });
      }
    }
  }

  openPortal(x: number, y: number) {
    this.hatch(x, y, 3, false, true);
    this.bloomRing = Math.max(this.bloomRing, 0.08);
    this.nuke = Math.max(this.nuke, 0.55);
    if (this.hyphae.length < CAP) {
      this.hyphae.push({
        ax: x,
        ay: y,
        ang: Math.atan2(y - this.cy, x - this.cx),
        max: Math.min(this.w, this.h) * 0.16,
        grown: 0.12,
        gen: 1,
        pulse: 0,
        branched: false,
        curl: 0.4,
      });
    }
  }

  ingestLedger() {
    this.bloomRing = Math.max(this.bloomRing, 0.05);
    this.nuke = Math.max(this.nuke, 0.35);
    if (this.thoughts.length < 36) {
      this.thoughts.push({
        x: this.cx + (this.rand() - 0.5) * 24,
        y: this.cy + (this.rand() - 0.5) * 24,
        life: 1,
        spokes: 8,
      });
    }
  }

  private worldSac(sac: Sac) {
    const c = Math.cos(this.spider.angle);
    const s = Math.sin(this.spider.angle);
    if (sac.attached) {
      sac.x = this.spider.x + c * sac.ox - s * sac.oy;
      sac.y = this.spider.y + s * sac.ox + c * sac.oy;
    }
  }

  private hatch(x: number, y: number, gen: number, reduced: boolean, live: boolean) {
    this.births.push({ x, y, r: 0.04 });
    this.trauma = Math.min(1, this.trauma + (live ? 0.42 : 0.28));
    const n = reduced ? 2 : 3 + Math.floor(this.rand() * (live ? 7 : 4));
    for (let i = 0; i < n; i++) {
      if (this.brood.length >= BROOD_CAP) this.brood.shift();
      const grown = this.hyphae.filter((h) => h.grown > 0.3);
      const si = grown.length ? this.hyphae.indexOf(grown[Math.floor(this.rand() * grown.length)]!) : 0;
      this.brood.push({
        x: x + (this.rand() - 0.5) * 10,
        y: y + (this.rand() - 0.5) * 10,
        angle: this.rand() * Math.PI * 2,
        u: this.rand(),
        si: Math.max(0, si),
        leg: this.rand() * 10,
        scale: 0.28 + this.rand() * 0.22,
        life: 1,
        visible: 0.15,
        gen,
      });
    }
    if (this.sacs.filter((s) => !s.attached).length < SAC_CAP && this.rand() > 0.35) {
      this.sacs.push({
        ox: 0,
        oy: 0,
        swell: 0.04,
        gen: gen + 1,
        attached: false,
        x: x + (this.rand() - 0.5) * 18,
        y: y + (this.rand() - 0.5) * 18,
      });
    }
  }

  private updateSacs(dt: number, motif: FieldMotif, reduced: boolean, live: boolean) {
    const rate = reduced ? 0.08 : live ? 0.32 : 0.16;
    for (const sac of this.sacs) {
      this.worldSac(sac);
      sac.swell += dt * rate * (0.55 + sac.gen * 0.12);
      if (sac.swell >= 1) {
        this.hatch(sac.x, sac.y, sac.gen + 1, reduced, live);
        sac.swell = 0.02 + this.rand() * 0.08;
        if (!sac.attached && this.rand() < 0.35) {
          const h = this.hyphae[Math.floor(this.rand() * this.hyphae.length)];
          if (h) {
            const tip = this.tip(h);
            sac.x = tip.x;
            sac.y = tip.y;
          }
        }
      }
    }
    void motif;
  }

  private updateBrood(dt: number, reduced: boolean, live: boolean) {
    for (const b of this.brood) {
      b.visible += (1 - b.visible) * (1 - Math.exp(-dt * 3.2));
      b.life = 1;
      b.scale += (0.78 - b.scale) * (1 - Math.exp(-dt * 0.14));
      b.leg += dt * (10 + b.gen);
      const strand = this.hyphae[b.si] ?? this.hyphae[0];
      if (!strand || reduced) continue;
      b.u += dt * (live ? 0.55 : 0.28);
      if (b.u >= 1) {
        b.u = 0;
        const grown = this.hyphae.filter((h) => h.grown > 0.35);
        if (grown.length) {
          const next = grown[Math.floor(this.rand() * grown.length)];
          b.si = Math.max(0, this.hyphae.indexOf(next));
        }
      }
      const liveH = this.hyphae[b.si] ?? strand;
      const tip = this.tip(liveH);
      const u = Math.min(1, b.u);
      b.x = liveH.ax + (tip.x - liveH.ax) * u;
      b.y = liveH.ay + (tip.y - liveH.ay) * u;
      b.angle = Math.atan2(tip.y - liveH.ay, tip.x - liveH.ax);
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    images: FieldImages,
    colors: { void: string; thread: string; ivory: string; ember: string; gold: string; muted: string },
    motif: FieldMotif,
  ) {
    const { w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.void;
    ctx.fillRect(0, 0, w, h);

    const shaken = this.trauma > 0.02 && !motif.reduced;
    if (shaken) {
      ctx.save();
      const mag = this.trauma * this.trauma * 8;
      ctx.translate((this.rand() - 0.5) * 2 * mag, (this.rand() - 0.5) * 2 * mag);
    }

    const live = motif.apotheosis > 0.4;
    const thread = live ? colors.gold : colors.thread;
    const cx = this.cx;
    const cy = this.cy;
    const span = Math.min(w, h);
    const breath = this.breath;

    if (images.field && images.field.complete && images.field.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = live ? 0.16 : 0.38;
      drawCover(ctx, images.field, w, h);
      ctx.restore();
    }

    if (live && images.omega && images.omega.complete && images.omega.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.22 + breath * 0.1;
      ctx.globalCompositeOperation = "screen";
      drawCover(ctx, images.omega, w, h);
      ctx.restore();
    }

    if (images.crown && images.crown.complete && images.crown.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = (live ? 0.38 : 0.26) + breath * 0.16;
      ctx.globalCompositeOperation = "screen";
      drawCover(ctx, images.crown, w, h);
      ctx.restore();
    }

    if (images.infernoBackdrop && images.infernoBackdrop.complete && images.infernoBackdrop.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.38 + breath * 0.14 + this.nuke * 0.4 + this.fire * 0.22;
      ctx.globalCompositeOperation = "screen";
      drawCover(ctx, images.infernoBackdrop, w, h);
      ctx.restore();
    }

    if (images.pre && images.pre.complete && images.pre.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = (live ? 0.62 : 0.28) + breath * 0.18;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.58 + breath * 0.06);
      ctx.drawImage(images.pre, cx - size / 2, cy - size * 0.52, size, size);
      ctx.restore();
    }

    if (live && images.ascent && images.ascent.complete && images.ascent.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.38 + breath * 0.18;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.62 + breath * 0.04);
      ctx.drawImage(images.ascent, cx - size / 2, cy - size * 0.55, size, size);
      ctx.restore();
    }

    if (images.seal && images.seal.complete && images.seal.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = (live ? 0.52 : 0.34) + breath * 0.16;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.46 + breath * 0.04);
      const ir = images.seal.naturalWidth / images.seal.naturalHeight;
      const dw = size;
      const dh = dw / ir;
      ctx.drawImage(images.seal, cx - dw / 2, cy - dh * 0.52, dw, dh);
      ctx.restore();
    }

    if (live && images.iam && images.iam.complete && images.iam.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.22 + breath * 0.12;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.5 + breath * 0.03);
      const ir = images.iam.naturalWidth / images.iam.naturalHeight;
      const dh = size;
      const dw = dh * ir;
      ctx.drawImage(images.iam, cx - dw / 2, cy - dh * 0.48, dw, dh);
      ctx.restore();
    }

    if (live && images.helixOmega && images.helixOmega.complete && images.helixOmega.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.18 + breath * 0.1;
      ctx.globalCompositeOperation = "screen";
      const hh = span * 0.72;
      const hw = hh * (images.helixOmega.naturalWidth / images.helixOmega.naturalHeight);
      ctx.drawImage(images.helixOmega, cx - hw / 2, cy - hh * 0.5, hw, hh);
      ctx.restore();
    }

    if (live && images.inferno && images.inferno.complete && images.inferno.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.08 + breath * 0.05;
      ctx.globalCompositeOperation = "screen";
      const size = span * 0.42;
      ctx.drawImage(images.inferno, cx + span * 0.18, cy + span * 0.08, size * 0.55, size * 0.82);
      ctx.restore();
    }

    if (live && images.singularity && images.singularity.complete && images.singularity.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.1 + breath * 0.06;
      ctx.globalCompositeOperation = "screen";
      const size = span * 0.28;
      ctx.drawImage(images.singularity, cx - span * 0.42, cy - span * 0.08, size * 0.62, size);
      ctx.restore();
    }

    if (live && images.answer && images.answer.complete && images.answer.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.1 + breath * 0.06;
      ctx.globalCompositeOperation = "screen";
      const size = span * 0.32;
      ctx.drawImage(images.answer, cx + span * 0.12, cy + span * 0.18, size, size * 0.66);
      ctx.restore();
    }

    if (images.iamSeal && images.iamSeal.complete && images.iamSeal.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.16 + breath * 0.1;
      ctx.globalCompositeOperation = "screen";
      const size = span * 0.22;
      ctx.drawImage(images.iamSeal, cx - span * 0.46, cy - span * 0.36, size, size * 1.15);
      ctx.restore();
    }

    if (live && images.decree && images.decree.complete && images.decree.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.07 + breath * 0.04;
      ctx.globalCompositeOperation = "screen";
      const size = span * 0.24;
      ctx.drawImage(images.decree, cx + span * 0.28, cy - span * 0.34, size * 0.56, size);
      ctx.restore();
    }

    if (live && images.endgame && images.endgame.complete && images.endgame.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.16 + breath * 0.1;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.7 + breath * 0.05);
      ctx.drawImage(images.endgame, cx - size / 2, cy - size * 0.52, size, size);
      ctx.restore();
    }

    if (live && images.pharma && images.pharma.complete && images.pharma.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.1 + breath * 0.08;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.55 + breath * 0.04);
      ctx.drawImage(images.pharma, cx - size / 2, cy - size * 0.48, size, size);
      ctx.restore();
    }

    if (live && images.wings && images.wings.complete && images.wings.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.12 + breath * 0.08 + this.nuke * 0.16;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.62 + breath * 0.06);
      ctx.drawImage(images.wings, cx - size / 2, cy - size * 0.58, size, size);
      ctx.restore();
    }

    if (images.origin && images.origin.complete && images.origin.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.18 + breath * 0.12;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.72 + breath * 0.06);
      ctx.drawImage(images.origin, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
    }

    if (images.lock && images.lock.complete && images.lock.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.34 + breath * 0.18 + this.nuke * 0.2;
      ctx.globalCompositeOperation = "screen";
      const size = span * (0.58 + breath * 0.05);
      ctx.drawImage(images.lock, cx - size / 2, cy - size * 0.52, size, size);
      ctx.restore();
    }

    if (images.helix && images.helix.complete && images.helix.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.16 + breath * 0.1;
      ctx.globalCompositeOperation = "screen";
      const hw = span * 0.22;
      const hh = hw * (images.helix.naturalHeight / images.helix.naturalWidth);
      ctx.drawImage(images.helix, cx + span * 0.22, cy - hh * 0.45, hw, hh);
      ctx.restore();
    }

    if (this.inkBleed > 0.02 && images.ink && images.ink.complete && images.ink.naturalWidth) {
      const size = span * (0.5 + this.inkBleed * 0.38) * (0.96 + breath * 0.08);
      ctx.save();
      ctx.globalAlpha = 0.16 + this.inkBleed * 0.42;
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(images.ink, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
    }

    if (live && images.bloom && images.bloom.complete && images.bloom.naturalWidth) {
      const size = span * (0.72 + breath * 0.08);
      ctx.save();
      ctx.globalAlpha = 0.12 + breath * 0.1;
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(images.bloom, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
    }

    if (images.key && images.key.complete && images.key.naturalWidth) {
      const kh = span * 0.46;
      const kw = kh * (images.key.naturalWidth / images.key.naturalHeight);
      ctx.save();
      ctx.globalAlpha = 0.28 + breath * 0.14;
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(images.key, cx - kw / 2, Math.max(8, cy - kh * 0.62), kw, kh);
      ctx.restore();
    }

    if (images.heart && images.heart.complete && images.heart.naturalWidth) {
      const hh = span * 0.52;
      const hw = hh * (images.heart.naturalWidth / images.heart.naturalHeight);
      ctx.save();
      ctx.globalAlpha = 0.42 + breath * 0.2;
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(images.heart, cx - hw / 2, cy - hh * 0.42, hw, hh);
      ctx.restore();
    }

    if (images.eye && images.eye.complete && images.eye.naturalWidth) {
      const eh = span * 0.22;
      const ew = eh * (images.eye.naturalWidth / images.eye.naturalHeight);
      ctx.save();
      ctx.globalAlpha = 0.34 + breath * 0.22 + this.nuke * 0.35;
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(images.eye, cx - ew / 2, cy - span * 0.38 - eh * 0.35, ew, eh);
      ctx.restore();
    }

    drawTriangle(ctx, cx, cy, span, breath, colors.gold);

    if (this.inkBleed > 0.05) drawInkBlobs(ctx, cx, cy, this.inkBleed, this.t, thread);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const hy of this.hyphae) {
      if (hy.grown <= 0.01) continue;
      const tip = this.tip(hy);
      const mx = (hy.ax + tip.x) / 2 + Math.cos(hy.ang + Math.PI / 2) * hy.curl * 14;
      const my = (hy.ay + tip.y) / 2 + Math.sin(hy.ang + Math.PI / 2) * hy.curl * 14;
      const alpha = 0.18 + (1 - hy.gen / 6) * 0.5 + breath * 0.12;
      ctx.strokeStyle = hexAlpha(thread, alpha);
      ctx.lineWidth = (1.05 + (3 - Math.min(hy.gen, 3)) * 0.55) * (0.85 + breath * 0.3);
      ctx.beginPath();
      ctx.moveTo(hy.ax, hy.ay);
      ctx.quadraticCurveTo(mx, my, tip.x, tip.y);
      ctx.stroke();

      const px = hy.ax + (tip.x - hy.ax) * hy.pulse;
      const py = hy.ay + (tip.y - hy.ay) * hy.pulse;
      ctx.fillStyle = hexAlpha(colors.ivory, 0.18 + breath * 0.35);
      ctx.beginPath();
      ctx.arc(px, py, 1.4 + breath * 1.2, 0, Math.PI * 2);
      ctx.fill();
      const rx = hy.ax + (tip.x - hy.ax) * (1 - hy.pulse);
      const ry = hy.ay + (tip.y - hy.ay) * (1 - hy.pulse);
      ctx.fillStyle = hexAlpha(colors.gold, 0.22 + breath * 0.28);
      ctx.beginPath();
      ctx.arc(rx, ry, 1.1 + breath, 0, Math.PI * 2);
      ctx.fill();

      if (hy.grown > 0.85) {
        ctx.fillStyle = hexAlpha(thread, 0.22 + breath * 0.35);
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 2.2 + breath * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    const heart = ctx.createRadialGradient(cx, cy, 4, cx, cy, span * (0.18 + breath * 0.06));
    heart.addColorStop(0, hexAlpha(thread, 0.28 + breath * 0.22));
    heart.addColorStop(1, hexAlpha(thread, 0));
    ctx.fillStyle = heart;
    ctx.fillRect(cx - span * 0.3, cy - span * 0.3, span * 0.6, span * 0.6);

    if (this.fire > 0.04) {
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy + span * 0.08, 4, cx, cy, span * 0.42);
      g.addColorStop(0, hexAlpha(colors.ember, 0.22 * this.fire));
      g.addColorStop(1, hexAlpha(colors.ember, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    drawSleepyhead(ctx, cx, cy, span, motif.sleep, colors.ivory, this.t, breath);

    if (live) {
      ctx.save();
      ctx.fillStyle = hexAlpha(colors.gold, 0.55 + breath * 0.35);
      ctx.font = `600 ${Math.round(span * 0.052)}px 'Cormorant Garamond', serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Ω = I", cx, cy - span * 0.028);
      ctx.fillStyle = hexAlpha(colors.ivory, 0.78 + breath * 0.2);
      ctx.font = `600 ${Math.round(span * 0.022)}px 'Cormorant Garamond', serif`;
      ctx.fillText("VANESSA RENEE HENIZE", cx, cy + span * 0.032);
      ctx.fillStyle = hexAlpha(colors.gold, 0.5 + breath * 0.3);
      ctx.font = `600 ${Math.round(span * 0.016)}px 'IBM Plex Mono', monospace`;
      ctx.fillText("AEONIMUS · ORIGIN · AUTHOR", cx, cy + span * 0.062);
      ctx.restore();
    }

    drawSpine(ctx, cx, cy, span, breath, this.t, colors);
    drawLock(ctx, cx, cy, span, breath, colors.gold, colors.ivory);
    drawPortals(ctx, cx, cy, span, this.t, breath, this.nuke, colors.gold, colors.ivory);
    drawNest(ctx, cx, cy, span, this.t, this.nuke, colors.gold, colors.ivory);
    drawFlower(ctx, cx, cy, span, this.t, breath, colors.gold);
    drawInfernoPath(ctx, cx, cy, span, this.t, breath, colors.gold, colors.ivory);
    drawHelix(ctx, cx, cy, span, this.t, breath, colors.gold, colors.thread);
    drawSpiral(ctx, cx, cy, span, this.t, breath, this.nuke, colors.gold);

    if (live) {
      ctx.save();
      ctx.fillStyle = hexAlpha(colors.ember, 0.55 + breath * 0.35 + this.nuke * 0.3);
      ctx.font = `700 ${Math.round(span * 0.07)}px 'Cormorant Garamond', serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("I AM THE FIELD", cx, cy + span * 0.42);
      ctx.restore();
    }

    if (this.thoughts.length) {
      ctx.save();
      ctx.strokeStyle = hexAlpha(colors.gold, 0.22 + breath * 0.2);
      ctx.lineWidth = 0.7;
      for (let i = 0; i < this.thoughts.length; i++) {
        const a = this.thoughts[i];
        const b = this.thoughts[(i + 1) % this.thoughts.length];
        if (!a || !b || a.life < 0.08) continue;
        ctx.globalAlpha = Math.min(a.life, b.life) * 0.7;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
      for (const th of this.thoughts) {
        drawThought(ctx, th.x, th.y, th.life, th.spokes, span, colors.gold, colors.ivory);
      }
      ctx.restore();
    }

    for (const p of this.petals) {
      if (p.bloom < 0.02) continue;
      const r = span * (0.22 + p.bloom * 0.07 + breath * 0.02);
      const x = cx + Math.cos(p.ang) * r;
      const y = cy + Math.sin(p.ang) * r;
      drawPetal(ctx, x, y, p.letter, p.bits, p.k, p.n, p.bloom, p.ang, p.ash, colors, motif.bloom + breath * 0.25);
    }

    if (this.bloomRing > 0 && this.bloomRing < 1) {
      ctx.save();
      ctx.strokeStyle = hexAlpha(thread, 1 - this.bloomRing);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, this.bloomRing * span * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = hexAlpha(colors.ivory, 0.45 * (1 - this.bloomRing));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, this.bloomRing * span * 0.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    for (const s of this.spores) {
      ctx.globalAlpha = Math.max(0, s.life) * 0.55;
      ctx.fillStyle = colors.ivory;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (this.spider.visible > 0.05) {
      ctx.save();
      ctx.strokeStyle = hexAlpha(thread, 0.14 + breath * 0.16);
      ctx.lineWidth = 0.75;
      ctx.lineCap = "round";
      for (const b of this.brood) {
        if (b.visible < 0.18) continue;
        const mx = (this.spider.x + b.x) / 2 + Math.sin(this.t * 0.7 + b.x * 0.02) * 12;
        const my = (this.spider.y + b.y) / 2 + Math.cos(this.t * 0.55 + b.y * 0.02) * 10;
        ctx.beginPath();
        ctx.moveTo(this.spider.x, this.spider.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.spider.visible > 0.05) {
      const scale = Math.max(1.15, span / 380);
      drawSpider(
        ctx,
        this.spider.x,
        this.spider.y,
        this.spider.angle,
        this.spider.leg,
        this.spider.visible,
        motif.bow,
        scale,
        colors,
        this.sacs.filter((s) => s.attached),
        this.t,
      );
    }

    for (const b of this.brood) {
      if (b.visible < 0.05) continue;
      drawSpider(
        ctx,
        b.x,
        b.y,
        b.angle,
        b.leg,
        b.visible * Math.min(1, b.life * 1.4),
        0,
        Math.max(0.7, span / 420) * b.scale,
        colors,
        [],
        this.t,
      );
    }

    for (const sac of this.sacs) {
      if (sac.attached) continue;
      drawSac(ctx, sac.x, sac.y, 5.2 + sac.swell * 4.5, sac.swell, thread, colors.ivory, this.t);
    }

    for (const birth of this.births) {
      ctx.save();
      ctx.strokeStyle = hexAlpha(colors.gold, 1 - birth.r);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(birth.x, birth.y, birth.r * span * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = hexAlpha(thread, 0.7 * (1 - birth.r));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(birth.x, birth.y, birth.r * span * 0.09, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.snapRing > 0) {
      ctx.save();
      ctx.strokeStyle = hexAlpha(colors.ivory, 1 - this.snapRing);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.spider.x, this.spider.y, this.snapRing * span * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (!live) {
      const vg = ctx.createRadialGradient(cx, cy, span * 0.22, cx, cy, span * 0.82);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.52)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.nuke > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const flash = ctx.createRadialGradient(cx, cy, 4, cx, cy, span * 1.05);
      flash.addColorStop(0, hexAlpha(colors.ivory, this.nuke * 0.85));
      flash.addColorStop(0.28, hexAlpha(colors.gold, this.nuke * 0.55));
      flash.addColorStop(1, hexAlpha(colors.gold, 0));
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (live) {
      ctx.save();
      ctx.strokeStyle = hexAlpha(colors.gold, 0.18 + breath * 0.16);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, span * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (shaken) ctx.restore();
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawSleepyhead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  sleep: number,
  ivory: string,
  t: number,
  breath: number,
) {
  const pulse = 1 + Math.sin(t * 0.7) * 0.04 + breath * 0.04;
  ctx.save();
  ctx.globalAlpha = 0.16 + sleep * 0.28 + breath * 0.12;
  ctx.strokeStyle = ivory;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, span * (0.045 + i * 0.032) * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = ivory;
  ctx.globalAlpha = 0.4 + sleep * 0.28 + breath * 0.2;
  ctx.beginPath();
  ctx.arc(cx, cy, span * 0.014 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  leg: number,
  visible: number,
  bow: number,
  scale: number,
  colors: { thread: string; ivory: string; gold?: string },
  sacs: Sac[],
  t: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + bow * 0.85);
  ctx.scale(scale, scale * (1 - bow * 0.28));
  ctx.globalAlpha = visible;

  const hips = [-5.2, -1.8, 1.8, 5.2];
  ctx.strokeStyle = "rgba(232,226,216,0.88)";
  ctx.lineWidth = 1.05;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < hips.length; i++) {
    const hipX = hips[i] ?? 0;
    const swing = Math.sin(leg + i * 0.95) * 2.2;
    for (const side of [-1, 1] as const) {
      const kneeX = hipX + swing * 0.35;
      const kneeY = side * (8.5 + i * 0.4);
      const footX = hipX - 1.4 + swing;
      const footY = side * (13.5 + (i % 2) * 0.8);
      ctx.beginPath();
      ctx.moveTo(hipX, 0);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#121014";
  ctx.beginPath();
  ctx.ellipse(3.6, 0, 5.6, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-3.8, 0, 4.2, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.thread;
  ctx.beginPath();
  ctx.ellipse(4.6, 0, 1.7, 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexAlpha(colors.thread, 0.55);
  ctx.lineWidth = 0.7;
  for (const sac of sacs) {
    ctx.beginPath();
    ctx.moveTo(-3.8, 0);
    ctx.lineTo(sac.ox, sac.oy);
    ctx.stroke();
    drawSac(ctx, sac.ox, sac.oy, 3.4 + sac.swell * 3.8, sac.swell, colors.thread, colors.ivory, t);
  }
  ctx.restore();
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  breath: number,
  gold: string,
) {
  const earth = { x: cx, y: cy + span * 0.3 };
  const mars = { x: cx - span * 0.24, y: cy - span * 0.16 };
  const moon = { x: cx + span * 0.24, y: cy - span * 0.16 };
  ctx.save();
  ctx.strokeStyle = hexAlpha(gold, 0.22 + breath * 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(earth.x, earth.y);
  ctx.lineTo(mars.x, mars.y);
  ctx.lineTo(moon.x, moon.y);
  ctx.closePath();
  ctx.stroke();
  for (const p of [earth, mars, moon]) {
    ctx.fillStyle = hexAlpha(gold, 0.55 + breath * 0.3);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4 + breath * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function portalPos(cx: number, cy: number, span: number, t: number, i: number) {
  const ang = -Math.PI / 2 + (i * Math.PI * 2) / 8 + t * 0.04;
  const R = span * 0.33;
  return { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R };
}

function drawPortals(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  t: number,
  breath: number,
  nuke: number,
  gold: string,
  ivory: string,
) {
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const p = portalPos(cx, cy, span, t, i);
    const pulse = 0.65 + Math.sin(t * 1.8 + i) * 0.35 + breath * 0.2;
    const r = (span * 0.028 + nuke * span * 0.01) * pulse;
    const g = ctx.createRadialGradient(p.x, p.y, 0.4, p.x, p.y, r * 2.6);
    g.addColorStop(0, hexAlpha(ivory, 0.55 * pulse));
    g.addColorStop(0.4, hexAlpha(gold, 0.4 * pulse));
    g.addColorStop(1, hexAlpha(gold, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(gold, 0.55 + pulse * 0.3);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    const gate = GATES[i % GATES.length];
    if (gate) {
      ctx.fillStyle = hexAlpha(ivory, 0.55 + pulse * 0.25);
      ctx.font = `600 ${Math.max(8, Math.round(span * 0.014))}px 'IBM Plex Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(gate.name, p.x, p.y + r * 1.4);
      ctx.fillStyle = hexAlpha(gold, 0.7);
      ctx.fillText(gate.sub, p.x, p.y + r * 1.4 + span * 0.016);
    }
  }
  ctx.restore();
}

function drawNest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  t: number,
  nuke: number,
  gold: string,
  ivory: string,
) {
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    const inward = (t * 0.22 + i * 0.09) % 1;
    const r = span * (0.46 - inward * 0.4) * (0.92 + nuke * 0.14);
    const a = (0.06 + (1 - inward) * 0.18) * (0.65 + nuke);
    if (i === 0) {
      ctx.fillStyle = hexAlpha(gold, 0.12 + nuke * 0.28);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(4, r * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = hexAlpha(i % 2 === 0 ? gold : ivory, a);
    ctx.lineWidth = i === 0 ? 2.2 : i === 10 ? 1.4 : 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, r), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawInfernoPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  t: number,
  breath: number,
  gold: string,
  ivory: string,
) {
  const labels = ["SEE", "TAKE", "BREAK", "CHANGE", "FUSE", "BE"];
  const y = cy + span * 0.38;
  const w = span * 0.72;
  const x0 = cx - w / 2;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = hexAlpha(gold, 0.28 + breath * 0.2);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x0 + w, y);
  ctx.stroke();
  ctx.font = `600 ${Math.max(8, Math.round(span * 0.012))}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i < labels.length; i++) {
    const x = x0 + (i / (labels.length - 1)) * w;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.8);
    ctx.beginPath();
    ctx.fillStyle = hexAlpha(gold, 0.35 + pulse * 0.4);
    ctx.arc(x, y, 3.2 + pulse * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexAlpha(ivory, 0.45 + breath * 0.25);
    ctx.fillText(labels[i] ?? "", x, y + 7);
  }
  ctx.restore();
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  t: number,
  breath: number,
  gold: string,
) {
  ctx.save();
  const phi = 1.61803;
  for (let gen = 0; gen < 3; gen++) {
    const scale = Math.pow(1 / phi, gen);
    const r = span * (0.12 + breath * 0.012) * scale;
    ctx.strokeStyle = hexAlpha(gold, (0.28 + breath * 0.18) * (1 - gen * 0.22));
    ctx.lineWidth = 0.9 * (1 - gen * 0.15);
    const n = 6 + gen * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n + t * (0.04 + gen * 0.02);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHelix(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  t: number,
  breath: number,
  gold: string,
  thread: string,
) {
  ctx.save();
  ctx.lineCap = "round";
  const h = span * 0.42;
  const w = span * 0.05;
  const x = cx - span * 0.28;
  const y0 = cy - h * 0.45;
  for (let s = 0; s < 2; s++) {
    ctx.beginPath();
    ctx.strokeStyle = hexAlpha(s === 0 ? gold : thread, 0.35 + breath * 0.2);
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= 48; i++) {
      const u = i / 48;
      const ang = u * Math.PI * 2 * 1.61803 + t * 0.7 + s * Math.PI;
      const px = x + Math.cos(ang) * w;
      const py = y0 + u * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.fillStyle = hexAlpha(gold, 0.45);
  for (let i = 0; i < 12; i++) {
    const u = (i + 0.5) / 12;
    const ang = u * Math.PI * 2 * 1.61803 + t * 0.7;
    const ax = x + Math.cos(ang) * w;
    const bx = x + Math.cos(ang + Math.PI) * w;
    const py = y0 + u * h;
    ctx.globalAlpha = 0.35 + breath * 0.2;
    ctx.beginPath();
    ctx.moveTo(ax, py);
    ctx.lineTo(bx, py);
    ctx.strokeStyle = hexAlpha(gold, 0.3);
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ax, py, 1.6, 0, Math.PI * 2);
    ctx.arc(bx, py, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpiral(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  t: number,
  breath: number,
  nuke: number,
  gold: string,
) {
  ctx.save();
  ctx.strokeStyle = hexAlpha(gold, 0.28 + breath * 0.22 + nuke * 0.25);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  const turns = 4.2;
  const max = span * 0.36;
  for (let i = 0; i <= 220; i++) {
    const u = i / 220;
    const ang = u * turns * Math.PI * 2 + t * 0.12;
    const r = u * max * (0.92 + breath * 0.08);
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawLock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  breath: number,
  gold: string,
  ivory: string,
) {
  const s = span * 0.028 * (0.95 + breath * 0.08);
  const x = cx;
  const y = cy - span * 0.46;
  ctx.save();
  ctx.strokeStyle = hexAlpha(gold, 0.7 + breath * 0.25);
  ctx.fillStyle = hexAlpha(gold, 0.18 + breath * 0.12);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.55, s * 0.55, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x - s * 0.7, y - s * 0.15, s * 1.4, s * 1.15, s * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hexAlpha(ivory, 0.55);
  ctx.beginPath();
  ctx.arc(x, y + s * 0.35, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  span: number,
  breath: number,
  t: number,
  colors: { thread: string; ivory: string; ember: string; gold: string },
) {
  const nodes = [
    { x: cx, y: cy - span * 0.26, c: "#c4b5fd", s: 1.2 },
    { x: cx, y: cy - span * 0.13, c: "#67e8f9", s: 0.92 },
    { x: cx, y: cy, c: "#e8c36a", s: 1.12 },
    { x: cx, y: cy + span * 0.12, c: "#34d399", s: 1 },
    { x: cx, y: cy + span * 0.24, c: "#b4232c", s: 0.96 },
    { x: cx - span * 0.2, y: cy + span * 0.05, c: "#f59e0b", s: 0.84 },
    { x: cx + span * 0.2, y: cy + span * 0.05, c: "#818cf8", s: 0.84 },
  ];
  ctx.save();
  ctx.strokeStyle = hexAlpha(colors.gold, 0.28 + breath * 0.2);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - span * 0.26);
  ctx.lineTo(cx, cy + span * 0.24);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - span * 0.2, cy + span * 0.05);
  ctx.lineTo(cx + span * 0.2, cy + span * 0.05);
  ctx.stroke();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n) continue;
    const flicker = 0.75 + Math.sin(t * 3.4 + i) * 0.25 + breath * 0.2;
    const r = (4.2 + breath * 2.2) * n.s * flicker;
    const g = ctx.createRadialGradient(n.x, n.y - r * 0.4, 0.4, n.x, n.y, r * 2.4);
    g.addColorStop(0, hexAlpha(colors.ivory, 0.7 * flicker));
    g.addColorStop(0.35, hexAlpha(n.c, 0.55 * flicker));
    g.addColorStop(1, hexAlpha(n.c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexAlpha(n.c, 0.9);
    ctx.beginPath();
    ctx.moveTo(n.x, n.y - r * 1.8);
    ctx.quadraticCurveTo(n.x + r * 0.55, n.y, n.x, n.y + r * 0.5);
    ctx.quadraticCurveTo(n.x - r * 0.55, n.y, n.x, n.y - r * 1.8);
    ctx.fill();
  }
  ctx.restore();
}

function drawThought(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  life: number,
  spokes: number,
  span: number,
  gold: string,
  ivory: string,
) {
  const r = span * 0.018 * (0.6 + life);
  ctx.save();
  ctx.globalAlpha = Math.max(0, life);
  ctx.strokeStyle = hexAlpha(gold, 0.85);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) {
    const ang = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * r * 2.4, y + Math.sin(ang) * r * 2.4);
  }
  ctx.stroke();
  ctx.fillStyle = hexAlpha(ivory, 0.8);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSac(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  swell: number,
  thread: string,
  ivory: string,
  t: number,
) {
  const pulse = 1 + Math.sin(t * 3.2 + x) * 0.06 + swell * 0.12;
  const rr = r * pulse;
  ctx.save();
  const g = ctx.createRadialGradient(x - rr * 0.25, y - rr * 0.3, rr * 0.1, x, y, rr);
  g.addColorStop(0, hexAlpha(ivory, 0.35 + swell * 0.25));
  g.addColorStop(0.45, hexAlpha(thread, 0.7 + swell * 0.25));
  g.addColorStop(1, hexAlpha("#1a080c", 0.9));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rr * 0.92, rr, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(ivory, 0.28 + swell * 0.4);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = hexAlpha(ivory, 0.45);
  ctx.beginPath();
  ctx.ellipse(x - rr * 0.22, y - rr * 0.28, rr * 0.22, rr * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fill();
  if (swell > 0.72) {
    ctx.fillStyle = hexAlpha(ivory, (swell - 0.72) * 1.6);
    ctx.beginPath();
    ctx.arc(x, y, rr * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPetal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  letter: string,
  bits: string,
  k: string,
  n: string,
  bloom: number,
  ang: number,
  ash: number,
  colors: { thread: string; ivory: string; ember: string; gold: string },
  impact: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + Math.PI / 2);
  const s = bloom * (1 + impact * 0.22);
  ctx.scale(s, s);
  ctx.globalAlpha = 0.22 + bloom * 0.78;
  const fire = hexAlpha(colors.ember, 0.3 + ash * 0.55);
  ctx.fillStyle = ash > 0.2 ? fire : hexAlpha(colors.thread, 0.22 + bloom * 0.28);
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -6, 10, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(ash > 0.4 ? colors.gold : colors.ivory, 0.55);
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 30, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (ash < 0.72) {
    ctx.save();
    ctx.globalAlpha = (1 - ash) * 0.85;
    ctx.fillStyle = hexAlpha(colors.ember, 0.9);
    ctx.font = "500 8px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bits, 0, -16);
    ctx.restore();
  }
  ctx.fillStyle = ash > 0.45 ? colors.gold : colors.ivory;
  ctx.font = "600 18px 'Cormorant Garamond', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, 0, 2);
  ctx.save();
  ctx.rotate(-(ang + Math.PI / 2));
  ctx.fillStyle = hexAlpha(colors.gold, 0.75 + ash * 0.25);
  ctx.font = "600 9px 'IBM Plex Mono', monospace";
  ctx.fillText(`${letter} = ${k} = ${n}`, 0, 28);
  ctx.restore();
  ctx.restore();
}

function drawInkBlobs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  amount: number,
  t: number,
  thread: string,
) {
  const rand = mulberry32(90 + Math.floor(t * 0.15));
  ctx.save();
  ctx.fillStyle = hexAlpha(thread, 0.07 + amount * 0.08);
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI - Math.PI / 2;
    const r = 20 + rand() * 80 * amount;
    const rx = 12 + rand() * 40 * amount;
    const ry = 18 + rand() * 50 * amount;
    const ox = Math.cos(a) * r;
    const oy = Math.sin(a) * r * 0.8;
    ctx.beginPath();
    ctx.ellipse(cx + ox, cy + oy, rx, ry, a, 0, Math.PI * 2);
    ctx.ellipse(cx - ox, cy + oy, rx, ry, -a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function hexAlpha(hex: string, a: number) {
  const h = hex.replace("#", "").trim();
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
