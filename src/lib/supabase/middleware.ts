import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export type Role = "customer" | "salon" | "admin";

const ROLE_HOME: Record<Role, string> = {
  customer: "/customer",
  salon: "/salon",
  admin: "/admin",
};

const PROTECTED_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: "/customer", role: "customer" },
  { prefix: "/salon", role: "salon" },
  { prefix: "/admin", role: "admin" },
];

export async function updateSession(request: NextRequest) {
  // Cookies that Supabase wants to (re)set (e.g. token refresh) are recorded
  // here and applied to whichever response we actually return at the end,
  // instead of rebuilding `response` mid-flight — that made it easy to lose
  // headers we attach later for downstream Server Components.
  let pendingCookies: CookieToSet[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value)
          );
          pendingCookies = pendingCookies.concat(cookiesToSet);
        },
      },
    }
  );

  function withCookies(response: NextResponse): NextResponse {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const guard = PROTECTED_PREFIXES.find(
    (p) => path === p.prefix || path.startsWith(p.prefix + "/")
  );

  // Unauthenticated user on a protected route → login
  if (!user && guard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return withCookies(NextResponse.redirect(url));
  }

  let role: Role = "customer";
  let fullName = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    role = (profile?.role ?? "customer") as Role;
    fullName = profile?.full_name ?? "";

    // Wrong-role access → send to own home
    if (guard && guard.role !== role) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role];
      url.search = "";
      return withCookies(NextResponse.redirect(url));
    }

    // Logged-in user on auth pages → own home
    if (path === "/login" || path === "/signup") {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role];
      url.search = "";
      return withCookies(NextResponse.redirect(url));
    }
  }

  // Forward the identity we just verified to Server Components downstream,
  // via request headers (the only way middleware can pass data into the
  // page render for the same request). This is us setting headers on the
  // *outgoing* request server-side, after auth — not client input, so pages
  // reading x-user-id/x-user-role/x-user-name can trust it without redoing
  // the getUser() + profiles round trip that was happening on every page.
  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", role);
    requestHeaders.set("x-user-name", encodeURIComponent(fullName));
  } else {
    requestHeaders.delete("x-user-id");
    requestHeaders.delete("x-user-role");
    requestHeaders.delete("x-user-name");
  }

  return withCookies(NextResponse.next({ request: { headers: requestHeaders } }));
}
