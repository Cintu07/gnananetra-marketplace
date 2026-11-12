"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

type Img = { url: string; alt: string | null };

export default function ProductGallery({ images, name, dim }: { images: Img[]; name: string; dim?: boolean }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [full, setFull] = useState(false);
  const n = images.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  if (!n) {
    return <div className="card grid aspect-square place-items-center text-[14px] text-faint">Photo coming soon</div>;
  }
  const cur = images[i];

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {n > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto md:max-h-[560px] md:w-[76px] md:flex-col md:overflow-y-auto">
          {images.map((img, idx) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Show photo ${idx + 1}`}
                aria-current={idx === i}
                className={`relative block size-[68px] overflow-hidden rounded-xl bg-white ring-1 transition ${idx === i ? "ring-2 ring-brand-700" : "ring-line hover:ring-line-2"}`}
              >
                <Image src={img.url} alt="" fill sizes="68px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative flex-1">
        <div
          className="relative aspect-square cursor-zoom-in overflow-hidden rounded-3xl bg-white ring-1 ring-line"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setFull(true)}
        >
          <Image
            src={cur.url}
            alt={cur.alt || name}
            fill
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            quality={85}
            className={`object-contain p-6 transition-transform duration-200 sm:p-10 ${dim ? "opacity-70" : ""}`}
            style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
          <span className="pointer-events-none absolute right-4 bottom-4 hidden items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-muted shadow-card ring-1 ring-line md:flex">
            <Expand className="size-3.5" aria-hidden /> Click to enlarge
          </span>
        </div>
        {n > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow-card ring-1 ring-line hover:bg-white md:hidden">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" aria-label="Next photo" onClick={() => go(1)} className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow-card ring-1 ring-line hover:bg-white md:hidden">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>

      {full && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-white animate-fade-in" role="dialog" aria-modal="true" aria-label={`${name} photos`}>
          <div className="flex items-center justify-between p-4">
            <p className="text-[14px] font-semibold text-muted">
              {i + 1} / {n}
            </p>
            <button type="button" aria-label="Close" onClick={() => setFull(false)} className="grid size-11 place-items-center rounded-full bg-canvas hover:bg-line">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={cur.url} alt={cur.alt || name} fill sizes="100vw" quality={85} className="object-contain p-4 sm:p-12" />
            {n > 1 && (
              <>
                <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className="absolute top-1/2 left-4 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-canvas hover:bg-line">
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button type="button" aria-label="Next photo" onClick={() => go(1)} className="absolute top-1/2 right-4 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-canvas hover:bg-line">
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
