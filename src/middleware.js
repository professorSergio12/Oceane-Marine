import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  const publicApiRoutes = [
    "/api/near-miss-form/create",
    "/api/auth/login",
    "/api/auth/signup",
  ];

  if (publicApiRoutes.includes(pathname)) {
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
     3️⃣ Protected Pages
     (auth required)
  ========================== */
  const protectedRoutes = [
    "/dashboard",
    "/operations",
    "/pms",
    "/qhse",
    "/accounts",
    "/hr",
  ];

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

/* ==========================
   4️⃣ Middleware Matcher
========================== */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/operations/:path*",
    "/pms/:path*",
    "/qhse/:path*",
    "/accounts/:path*",
    "/hr/:path*",
    "/login",
    "/signup",
    "/api/near-miss-form/create",
    "/api/auth/:path*",
  ],
};
