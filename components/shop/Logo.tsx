// The Gnananetra logo: raster emblem (the yantra has fine colour detail) + vector wordmark
// (traced from the original by scripts/build-logo.mjs), so the letters stay sharp at any size.
// `size` is the emblem height in px; the wordmark keeps the original proportions.
export default function Logo({ size = 40, tone = "color", wordmark = true, className = "" }: { size?: number; tone?: "color" | "white"; wordmark?: boolean; className?: string }) {
  const wordH = Math.round(size * 0.42);
  const wordW = Math.round(wordH * 5.854);
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} style={{ gap: Math.round(size * 0.14) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/emblem.png" alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0" />
      {wordmark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tone === "white" ? "/brand/wordmark-white.svg" : "/brand/wordmark.svg"}
          alt="Gnananetra"
          width={wordW}
          height={wordH}
          style={{ width: wordW, height: wordH }}
          className="shrink-0"
        />
      )}
    </span>
  );
}
