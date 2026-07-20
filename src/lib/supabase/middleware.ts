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
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

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
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile?.role ?? "customer") as Role;

    // Wrong-role access → send to own home
    if (guard && guard.role !== role) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role];
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Logged-in user on auth pages → own home
    if (path === "/login" || path === "/signup") {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role];
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
