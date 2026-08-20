import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

type Role = "student" | "registrar" | "admin" | "guidance";

const roleHome: Record<string, string> = {
  student: "/student/dashboard",
  registrar: "/registrar/dashboard",
  admin: "/admin/dashboard",
  guidance: "/guidance/dashboard",
};

const routeRole: Record<string, Role> = {
  student: "student",
  registrar: "registrar",
  admin: "admin",
  guidance: "guidance",
};

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // @ts-expect-error @supabase/ssr SupabaseAuthClient type mismatch — works at runtime
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/register");

  const matchedRole = Object.keys(routeRole).find((r) => path.startsWith(`/${r}`));
  const isProtected = !!matchedRole;

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_active) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const requiredRole = routeRole[matchedRole];
    if (profile.role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = roleHome[profile.role] ?? "/student/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const url = request.nextUrl.clone();
    url.pathname = roleHome[profile?.role ?? "student"];
    return NextResponse.redirect(url);
  }

  return response;
}
