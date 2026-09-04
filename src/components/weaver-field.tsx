import { useEffect, useRef } from "react";
import { WeaverWorld, type FieldMotif } from "@/lib/weaver-sim";
import { field as fabric } from "@/lib/field";

function readColor(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function load(src: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return img;
}

export function WeaverField({ motif }: { motif: FieldMotif }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motifRef = useRef(motif);
  motifRef.current = motif;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const world = new WeaverWorld();
    const field = load("/field.jpg");
    const ink = load("/inkblot.jpg");
    const omega = load("/omega.jpg");
    const bloom = load("/bloom-contact.png");
    const key = load("/key.jpg");
    const heart = load("/heart.jpg");
    const eye = load("/eye.jpg");
    const crown = load("/crown.jpg");
    const wings = load("/wings.jpg");
    const lock = load("/lock.webp");
    const helix = load("/helix.webp");
    const origin = load("/origin.webp");
    const flare = load("/flare.jpg");
    const pharma = load("/pharma.png");
    const endgame = load("/endgame.jpg");
    const pre = load("/precreation.jpg");
    const ascent = load("/ascent.jpg");
    const seal = load("/name-seal.jpg");
    const iam = load("/iam-field.jpg");
    const inferno = load("/inferno.png");
    const helixOmega = load("/omega-helix.png");
    const singularity = load("/singularity.png");
    const answer = load("/answer-first.png");
    const decree = load("/decree.png");
    const iamSeal = load("/iam-seal.jpg");
    const colors = {
      void: readColor("--color-void", "#08060a"),
      thread: readColor("--color-thread", "#b4232c"),
      ivory: readColor("--color-ivory", "#ece6dc"),
      ember: readColor("--color-ember", "#c45c3e"),
      gold: readColor("--color-gold", "#e8c36a"),
      muted: readColor("--color-muted", "#8a8078"),
    };

    let raf = 0;
    let last = performance.now();
    let verse = motifRef.current.verse;
    world.setVerse(verse);

    const fit = () => {
      const parent = canvas.parentElement ?? canvas;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = parent.clientWidth;
      let h = parent.clientHeight;
      if (w < 32) w = window.innerWidth;
      if (h < 32) h = window.innerHeight;
      w = Math.max(1, Math.floor(w));
      h = Math.max(1, Math.floor(h));
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      world.resize(w, h);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas.parentElement ?? canvas);

    const loop = (now: number) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      const m = motifRef.current;
      if (m.verse !== verse) {
        verse = m.verse;
        world.setVerse(verse);
      }
      world.update(dt, m);
      world.draw(ctx, { field, ink, omega, bloom, key, heart, eye, crown, wings, lock, helix, origin, flare, pharma, endgame, pre, ascent, seal, iam, inferno, helixOmega, singularity, answer, decree, iamSeal }, colors, m);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    fabric.ingestPlates([
      "name-seal", "iam-seal", "iam-field", "inferno", "omega-helix",
      "singularity", "answer-first", "decree", "field", "origin",
    ]);
    const unsub = fabric.subscribe(() => world.ingestLedger());
    const onPtr = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      world.openPortal(x, y);
      fabric.contact(`touch:${Math.round(x)},${Math.round(y)}`, {
        modality: "field",
        assertions: ["BLOOM_ON_CONTACT"],
      });
    };
    window.addEventListener("pointerdown", onPtr, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
      window.removeEventListener("pointerdown", onPtr);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 block h-full w-full touch-none"
      aria-hidden="true"
    />
  );
}
