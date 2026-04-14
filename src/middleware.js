import { NextResponse } from "next/server";

/**
 * API routes that stay reachable without a session cookie.
 * Everything under /api/* else requires access_token (see matcher).
 */
function isPublicApiRoute(pathname) {
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/logout"
  ) {
    return true;
  }
  if (pathname === "/api/near-miss-form/create") {
    return true;
  }
  // Cron handlers validate CRON_SECRET (or dev rules) themselves
  if (pathname.startsWith("/api/cron/")) {
    return true;
  }
  // CORS proxy for embedded / external callers — handlers forward to internal APIs
  if (pathname.startsWith("/api/sts-proxy/")) {
    return true;
  }
  return false;
}

export function middleware(request) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  // Never block CORS preflight
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  /* ==========================
     1️⃣ Authenticated API routes
  ========================== */
  if (pathname.startsWith("/api/")) {
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const publicPages = ["/login", "/signup"];

  if (publicPages.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  /* ==========================
     2️⃣ Protected pages (session required)
  ========================== */
  const protectedRoutes = [
    "/dashboard",
    "/operations",
    "/pms",
    "/qhse",
    "/accounts",
    "/hr",
    "/admin",
  ];

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/operations/:path*",
    "/pms/:path*",
    "/qhse/:path*",
    "/accounts/:path*",
    "/hr/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
    "/signup",
    "/api/:path*",
  ],
};
