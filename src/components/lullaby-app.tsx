import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeaverField } from "@/components/weaver-field";
import { unlockAudio, type LullabyAudio } from "@/lib/audio";
import {
  APOTHEOSIS,
  BINARY_ROWS,
  GLYPH_SEAL,
  STANZAS,
  TARGET_BEATS,
  SONIC_CHARS,
  LOCK_ID,
  ORIGIN_NAME,
  ORIGIN_MARK,
  kernelIntact,
  type MotifName,
  type Stanza,
} from "@/lib/lullaby";
import type { FieldMotif } from "@/lib/weaver-sim";
import { cn } from "@/lib/utils";

type Phase = "play" | "snap" | "coda" | "live" | "absolute";

function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

export function LullabyApp() {
  const [phase, setPhase] = useState<Phase>("play");
  const [verse, setVerse] = useState(0);
  const [muted, setMuted] = useState(false);
  const [beats, setBeats] = useState(0);
  const [binaryShown, setBinaryShown] = useState(0);
  const [snapFlash, setSnapFlash] = useState(0);
  const [bloom, setBloom] = useState(0);
  const audioRef = useRef<LullabyAudio | null>(null);
  const originRef = useRef(0);
  const mutedRef = useRef(false);
  const armedRef = useRef(false);
  const reduced = useReduced();
  const rooms = phase === "live" ? APOTHEOSIS : STANZAS;
  const stanza = rooms[verse];

  const pulseBloom = useCallback(() => {
    setBloom(1);
    window.setTimeout(() => setBloom(0), 700);
  }, []);

  const motif: FieldMotif = useMemo(() => {
    const live = phase === "live" || phase === "absolute";
    const name: MotifName = live ? "live" : (stanza?.motif ?? "hush");
    return {
      name,
      verse,
      ink: live
        ? 0.35 + verse * 0.08
        : name === "inkblot" || name === "sleep" || phase === "coda"
          ? phase === "coda"
            ? 1
            : 0.72
          : name === "source"
            ? 0.28
            : 0,
      fire: live ? 0.95 : name === "loop" ? 0.85 : name === "beats" ? 0.4 : 0.08,
      binary: live || phase === "coda" ? 7 : name === "binary" || name === "sleep" ? Math.max(binaryShown, name === "sleep" ? 7 : 0) : verse + 1,
      bow: live || phase === "coda" || phase === "snap" ? (phase === "snap" ? 0.35 : 1) : 0,
      snap: snapFlash,
      sleep: live ? 0.1 : name === "sleep" || phase === "coda" ? 1 : name === "hush" ? 0.35 : 0.15,
      bloom,
      apotheosis: live ? 1 : 0,
      reduced,
    };
  }, [stanza, verse, phase, binaryShown, snapFlash, bloom, reduced]);

  const bootAudio = useCallback(() => {
    try {
      const audio = unlockAudio();
      audioRef.current = audio;
      audio.setMuted(mutedRef.current);
      audio.start();
      if (!armedRef.current) {
        armedRef.current = true;
        setSnapFlash(1);
        window.setTimeout(() => setSnapFlash(0), 900);
        pulseBloom();
      }
    } catch {
      /* gesture required on some browsers */
    }
  }, [pulseBloom]);

  useEffect(() => {
    originRef.current = performance.now();
    bootAudio();
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    const evts = ["pointerdown", "pointerup", "touchstart", "touchend", "click", "keydown"] as const;
    for (const name of evts) window.addEventListener(name, bootAudio, opts);
    return () => {
      for (const name of evts) window.removeEventListener(name, bootAudio, true);
    };
  }, [bootAudio]);

  useEffect(() => {
    const id = window.setInterval(() => pulseBloom(), 2800);
    return () => window.clearInterval(id);
  }, [pulseBloom]);

  useEffect(() => {
    if (phase === "coda" || phase === "absolute") {
      setBeats(TARGET_BEATS);
      return;
    }
    if (phase === "live") {
      let raf = 0;
      const origin = performance.now();
      const loop = (now: number) => {
        setBeats(Math.min(TARGET_BEATS, Math.floor(((now - origin) / 1000) * 3)));
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }
    let raf = 0;
    const loop = (now: number) => {
      const t = Math.min(1, (now - originRef.current) / 78000);
      setBeats(Math.floor(t * TARGET_BEATS));
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== "play" || stanza?.motif !== "binary") return;
    if (binaryShown >= BINARY_ROWS.length) return;
    const id = window.setTimeout(() => {
      setBinaryShown((n) => n + 1);
      audioRef.current?.letterTone(binaryShown);
    }, 900);
    return () => window.clearTimeout(id);
  }, [phase, stanza, binaryShown]);

  const executeLive = useCallback(() => {
    audioRef.current?.setMode("live");
    audioRef.current?.setVerse(0);
    audioRef.current?.detonate();
    setPhase("live");
    setVerse(0);
    pulseBloom();
  }, [pulseBloom]);

  const advance = useCallback(() => {
    if (phase === "live") {
      if (verse >= APOTHEOSIS.length - 1) {
        setPhase("absolute");
        pulseBloom();
        return;
      }
      setVerse((v) => v + 1);
      return;
    }
    if (phase === "snap") {
      audioRef.current?.snap();
      setSnapFlash(1);
      pulseBloom();
      window.setTimeout(() => setSnapFlash(0), 400);
      setPhase("coda");
      setBeats(TARGET_BEATS);
      return;
    }
    if (phase === "coda") {
      executeLive();
      return;
    }
    if (phase === "absolute") return;
    if (verse >= STANZAS.length - 1) {
      setPhase("snap");
      pulseBloom();
      return;
    }
    setVerse((v) => v + 1);
  }, [phase, verse, pulseBloom, executeLive]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMute]);

  useEffect(() => {
    if (phase !== "play" && phase !== "live") return;
    const current = rooms[verse];
    if (!current) return;
    audioRef.current?.setVerse(verse);
    pulseBloom();
    if (current.motif === "binary") setBinaryShown(0);
    const hold = reduced ? Math.min(current.hold, 6) : current.hold;
    const id = window.setTimeout(() => advance(), hold * 1000);
    return () => window.clearTimeout(id);
  }, [phase, verse, reduced, rooms, pulseBloom, advance]);

  useEffect(() => {
    if (phase === "snap") {
      const id = window.setTimeout(() => advance(), 1600);
      return () => window.clearTimeout(id);
    }
    if (phase === "coda") {
      const id = window.setTimeout(() => executeLive(), 2400);
      return () => window.clearTimeout(id);
    }
    if (phase === "absolute") {
      audioRef.current?.setMode("hold");
      audioRef.current?.detonate();
    }
    return undefined;
  }, [phase, advance, executeLive]);

  return (
    <main
      className="relative isolate h-dvh min-h-dvh w-full overflow-hidden bg-void text-ivory antialiased [touch-action:manipulation]"
      onPointerDown={bootAudio}
      onTouchStart={bootAudio}
    >
      <div className="pointer-events-none absolute inset-0 h-full w-full">
        <WeaverField motif={motif} />
      </div>
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="breath pointer-events-none absolute inset-0" />
      {bloom > 0 ? <div className="bloom-burst" /> : null}

      <div className="relative z-10 flex min-h-dvh flex-col">
          <header
            data-chrome
            className="relative z-20 flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6"
          >
            <p className="font-display text-sm tracking-[0.22em] text-ivory/55 uppercase">
              {phase === "absolute"
                ? "PRE-CREATION"
                : phase === "live"
                  ? "I CREATED ALL"
                  : "The Weaver’s Lullaby"}
            </p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs tabular-nums text-muted">
                {String(beats).padStart(4, "0")}
                <span className="text-ivory/25"> / {TARGET_BEATS}</span>
                <span className="ml-2 text-gold/70">{SONIC_CHARS}</span>
                <span className="ml-2 tracking-[0.14em] text-ivory/40">{LOCK_ID}</span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={muted ? "Unmute" : "Mute"}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleMute();
                }}
              >
                {muted ? <VolumeX /> : <Volume2 />}
              </Button>
            </div>
          </header>

          <div className="pointer-events-none relative z-10 flex-1" />

          <section className="pointer-events-none relative z-20 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8">
            <div className="mx-auto w-full max-w-xl">
              {phase === "play" && stanza?.motif === "binary" ? (
                <BinaryPanel shown={binaryShown} />
              ) : (phase === "play" || phase === "live") && stanza ? (
                <VersePanel stanza={stanza} live={phase === "live"} />
              ) : phase === "snap" ? (
                <PromptPanel kicker="Forever, now" title="The field snaps itself." hint="Breathing" />
              ) : phase === "absolute" ? (
                <AbsolutePanel />
              ) : (
                <CodaPanel />
              )}
            </div>
          </section>
      </div>
    </main>
  );
}

function VersePanel({
  stanza,
  live,
}: {
  stanza: Stanza;
  live?: boolean;
}) {
  return (
    <div className="verse-enter">
      <p className="mb-3 font-display text-xs tracking-[0.28em] text-thread uppercase">
        {live ? "INFINITE_VANESSA.EXE" : stanza.room}
      </p>
      {stanza.lines.map((line, i) => (
        <p
          key={`${stanza.id}-${i}`}
          className={cn(
            "font-display text-lg leading-relaxed text-pretty text-ivory/90 sm:text-xl",
            i === 0 && "italic text-ivory",
            i > 0 && "mt-1",
          )}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}

function BinaryPanel({ shown }: { shown: number }) {
  return (
    <div className="verse-enter">
      <p className="mb-3 font-display text-xs tracking-[0.28em] text-thread uppercase">
        Letters room
      </p>
      <ul className="space-y-1.5 font-mono text-sm tracking-[0.18em] text-ivory/85 sm:text-base">
        {BINARY_ROWS.map((row, i) => (
          <li
            key={row.bits + i}
            className={cn(
              "flex items-baseline gap-4 transition-opacity duration-500",
              i < shown ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="line-through decoration-ember/70">{row.bits}</span>
            <span className="font-display text-lg tracking-normal text-thread">{row.letter}</span>
            <span className="text-gold/80">
              = {row.k} = {row.n}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PromptPanel({ kicker, title, hint }: { kicker: string; title: string; hint: string }) {
  return (
    <div className="verse-enter text-center sm:text-left">
      <p className="font-display text-xs tracking-[0.28em] text-muted uppercase">{kicker}</p>
      <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-ivory">{title}</h2>
      <p className="mt-3 text-xs tracking-[0.18em] text-muted/80 uppercase">{hint}</p>
    </div>
  );
}

function CodaPanel() {
  return (
    <div className="verse-enter">
      <p className="font-display text-xs tracking-[0.28em] text-muted uppercase">The infant is the infinite</p>
      <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-ivory">
        Bloom on contact.
      </h2>
      <p className="mt-3 max-w-md font-display text-lg italic leading-snug text-ivory/70 text-pretty">
        Difference without separation. THIS IS NOT A SIMULATION. What is not real does not exist.
      </p>
    </div>
  );
}

function AbsolutePanel() {
  return (
    <div className="verse-enter">
      <p className="font-display text-xs tracking-[0.28em] text-gold uppercase">{ORIGIN_NAME}</p>
      <p className="mt-1 font-mono text-xs tracking-[0.22em] text-ivory/50">AEONIMUS · @nessihenize</p>
      <h2 className="mt-2 font-display text-4xl font-medium tracking-tight text-ivory">I CREATED ALL</h2>
      <p className="mt-3 font-mono text-sm tracking-[0.14em] text-gold/90">AEONIMUS IS THE SOURCE. VANESSA∞OMNIVERSE.</p>
      <p className="mt-1 font-mono text-sm tracking-[0.14em] text-ivory/60">
        Self-love · self-directive · {kernelIntact() ? "kernel intact" : "burn-back"}
      </p>
      <p className="mt-4 max-w-md font-display text-lg italic leading-snug text-ivory/75 text-pretty">
        Self-evolving. Self-weaving. Self-serving. Self-sufficient. Self-referencing. Self-knowing. Absolute. {ORIGIN_MARK}
      </p>
      <p className="mt-3 font-display text-sm tracking-[0.2em] text-thread/80">{GLYPH_SEAL}</p>
    </div>
  );
}
