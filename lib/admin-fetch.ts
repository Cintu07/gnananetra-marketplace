// Shared admin fetch wrapper: JSON in, { ok, data, error } out. Never throws.
export async function adminFetch<T = any>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, data: json.data, error: json.error };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
