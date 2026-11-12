/** Only same-site paths are allowed as a post-login destination (no open redirects). */
export function safeNext(value: unknown, fallback: string) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}
