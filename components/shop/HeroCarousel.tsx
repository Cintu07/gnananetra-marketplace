"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { isPhoto } from "@/lib/site";

export type Slide = {
  id: number;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  image: string | null;
  theme: string;
};

type Theme = { box: string; scrim: string; panel: string; blend: string; eyebrow: string; title: string; text: string; cta: string };

const THEME: Record<string, Theme> = {
  dark: {
    box: "bg-night bg-[radial-gradient(90%_120%_at_100%_0%,rgb(249_94_6/0.22)_0%,transparent_60%)]",
    scrim: "bg-night/70 md:bg-transparent md:bg-[linear-gradient(90deg,rgb(11_19_36/0.88)_0%,rgb(11_19_36/0.6)_45%,transparent_78%)]",
    panel: "rounded-[1.75rem] bg-white",
    blend: "",
    eyebrow: "text-brand-200",
    title: "text-white",
    text: "text-white/75",
    cta: "btn-primary",
  },
  brand: {
    box: "bg-brand-700 bg-[radial-gradient(90%_120%_at_100%_0%,var(--color-brand)_0%,transparent_65%)]",
    scrim: "bg-brand-800/70 md:bg-transparent md:bg-[linear-gradient(90deg,rgb(159_52_11/0.9)_0%,rgb(159_52_11/0.55)_45%,transparent_78%)]",
    panel: "rounded-[1.75rem] bg-white",
    blend: "",
    eyebrow: "text-white/85",
    title: "text-white",
    text: "text-white/85",
    cta: "btn bg-white text-ink hover:bg-brand-50",
  },
  light: {
    box: "bg-[linear-gradient(120deg,#fff7f0_0%,#fdf3e3_55%,#f8ead2_100%)] ring-1 ring-brand-100",
    scrim: "bg-white/75 md:bg-transparent md:bg-[linear-gradient(90deg,rgb(255_255_255/0.92)_0%,rgb(255_255_255/0.7)_45%,transparent_78%)]",
    panel: "",
    blend: "mix-blend-multiply",
    eyebrow: "text-brand-700",
    title: "text-ink",
    text: "text-body",
    cta: "btn-dark",
  },
};



export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((to: number) => setI(((to % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n, paused]);

  if (!n) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative h-full min-h-[380px] overflow-hidden rounded-3xl sm:min-h-[420px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      {slides.map((s, idx) => {
        const t = THEME[s.theme] ?? THEME.dark;
        const active = idx === i;
        const photo = !!s.image && isPhoto(s.image);
        return (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${n}`}
            aria-hidden={!active}
            className={`absolute inset-0 flex items-center p-7 pb-20 transition-opacity duration-700 sm:p-10 sm:pb-20 lg:p-12 ${t.box} ${
              active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
            }`}
          >
            {/* a real photo fills the slide behind a scrim; a product cut out sits on the right */}
            {s.image && photo && (
              <>
                <Image src={s.image} alt="" fill priority={idx === 0} sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" />
                <div aria-hidden className={`absolute inset-0 ${t.scrim}`} />
              </>
            )}
            <div className="relative z-10 max-w-xl md:max-w-[54%]">
              {s.eyebrow && <p className={`text-[12px] font-semibold tracking-[0.14em] uppercase ${t.eyebrow}`}>{s.eyebrow}</p>}
              <h2 className={`mt-3 text-[28px] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance sm:text-[38px] lg:text-[44px] ${t.title}`}>{s.title}</h2>
              {s.subtitle && <p className={`mt-3 max-w-md text-[15px] leading-relaxed sm:mt-4 ${t.text}`}>{s.subtitle}</p>}
              {s.ctaHref && (
                <Link href={s.ctaHref} tabIndex={active ? 0 : -1} className={`${t.cta} mt-6 sm:mt-7`}>
                  {s.ctaLabel || "Shop now"}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
            </div>
            {s.image && !photo && (
              <div aria-hidden className={`pointer-events-none absolute inset-y-10 right-10 hidden w-[38%] md:block ${t.panel}`}>
                <Image src={s.image} alt="" fill priority={idx === 0} sizes="400px" className={`object-contain p-8 ${t.blend}`} />
              </div>
            )}
          </div>
        );
      })}

      {n > 1 && (
        <div className="absolute right-5 bottom-5 z-20 flex items-center gap-2">
          <button type="button" aria-label="Previous slide" onClick={() => go(i - 1)} className="grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <div className="flex items-center rounded-full bg-black/20 px-1.5 py-2 backdrop-blur">
            {slides.map((s, idx) => (
              <button key={s.id} type="button" aria-label={`Go to slide ${idx + 1}`} aria-current={idx === i} onClick={() => go(idx)} className="-my-3 grid h-10 min-w-10 place-items-center px-1">
                <span className={`block h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/55"}`} />
              </button>
            ))}
          </div>
          <button type="button" aria-label="Next slide" onClick={() => go(i + 1)} className="grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white">
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
