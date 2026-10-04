import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

const PROTECTED = ["/rooms", "/join"];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path.startsWith(p));

  const redirectTo = (pathname: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    return NextResponse.redirect(url);
  };

  const env = getSupabaseEnv();
  // Not configured (or malformed): keep public pages up, send app routes to a clear message.
  if (!env) return isProtected ? redirectTo("/login", "?error=config") : NextResponse.next({ request });

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(env.url, env.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && isProtected) return redirectTo("/login", `?next=${encodeURIComponent(path + request.nextUrl.search)}`);
    if (user && (path === "/login" || path === "/signup")) return redirectTo("/rooms");
    return response;
  } catch (err) {
    // Never let an auth hiccup take the whole site down.
    console.error("[middleware] session refresh failed:", err);
    return isProtected ? redirectTo("/login", "?error=session") : NextResponse.next({ request });
  }
}
