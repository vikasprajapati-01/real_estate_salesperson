import { NextResponse } from "next/server";

// Best-effort limit per IP. The counters live in server memory, so on Vercel each
// serverless instance keeps its own count. It stops casual abuse, not a determined one.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

export function limited(req: Request): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent);
    const wait = Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
    return NextResponse.json(
      { error: `Too many requests. Please wait ${wait} seconds and try again.` },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }

  recent.push(now);
  hits.set(ip, recent);

  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return null;
}