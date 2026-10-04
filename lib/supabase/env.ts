/**
 * Reads and cleans the Supabase env vars. Returns null if they're missing or malformed,
 * so callers can fail gracefully instead of crashing the whole site.
 * (NEXT_PUBLIC_* values are inlined at build time: change them in Vercel, then redeploy.)
 */
function clean(v: string | undefined) {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
  const key = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { url, key };
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL (https://<project>.supabase.co) and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.",
    );
  }
  return env;
}
