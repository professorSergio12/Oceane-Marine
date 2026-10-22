import { NextResponse } from "next/server";

/* ==========================
   Access token verification (HS256, as signed by jsonwebtoken in /api/auth/login).
   `jsonwebtoken` doesn't run in middleware, so this uses Web Crypto directly.
   A cookie that merely exists is not enough — signature and expiry must be valid.
========================== */

function base64UrlToBytes(input) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let hmacKeyPromise = null;
function getHmacKey() {
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(process.env.JWT_SECRET || ""),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }
  return hmacKeyPromise;
}

async function isValidAccessToken(token) {
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) return false;

    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(headerPart)));
    if (header.alg !== "HS256") return false;

    const valid = await crypto.subtle.verify(
      "HMAC",
      await getHmacKey(),
      base64UrlToBytes(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`)
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart)));
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * API routes that stay reachable without a session cookie.
 * Everything under /api/* else requires access_token (see matcher).
 */

/**
 * Anonymous “Google Forms”-style submissions from the QHSE-FORMS app (or any
 * external caller). Those users never have an Oceane `access_token` cookie.
 * Keep in sync with `QHSE-FORMS/src/lib/qhseFormConfig.js` `createPath` values
 * (+ near-miss). New public form → add full path here.
 */
const PUBLIC_EXTERNAL_FORM_POST_ROUTES = new Set([
  "/api/near-miss-form/create",
  "/api/qhse/due-diligence/audit-sub-contractor/create",
  "/api/qhse/form-checklist/hse-induction-checklist/create",
  "/api/qhse/cross-competency/create",
  "/api/qhse/due-diligence/due-diligence-questionnaire/create",
  "/api/qhse/form-checklist/transfer-audit/create",
]);

/**
 * STS checklist external app (`operations-sts-checklist`): anonymous create/read/update.
 * DELETE stays session-only (see `…/[formPath]/[id]/delete`).
 *
 * Public (no `access_token`):
 * - POST `…/{form}/create`
 * - GET/PUT `…/{form}` (?operationRef=…)
 * - GET/PUT `…/{form}/{id}` (document by id)
 * - PUT `…/{form}/{id}/update`
 *
 * Still require login:
 * - Any path ending in `/delete`
 * - `…/{form}/list` (admin listing)
 */
function isPublicOperationsStsChecklistRoute(pathname) {
  if (!pathname.startsWith("/api/operations/sts-checklist/")) return false;
  if (pathname.endsWith("/delete")) {
    return false;
  }
  if (pathname.endsWith("/create")) {
    return /^\/api\/operations\/sts-checklist\/[^/]+\/create$/.test(pathname);
  }
  if (pathname.endsWith("/update")) {
    return /^\/api\/operations\/sts-checklist\/[^/]+\/[^/]+\/update$/.test(pathname);
  }
  const twoAfterBase =
    /^\/api\/operations\/sts-checklist\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (twoAfterBase) {
    const second = twoAfterBase[2];
    if (second === "list") {
      return false;
    }
    return true;
  }
  return /^\/api\/operations\/sts-checklist\/[^/]+$/.test(pathname);
}

function isPublicApiRoute(pathname) {
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/logout"
  ) {
    return true;
  }
  if (PUBLIC_EXTERNAL_FORM_POST_ROUTES.has(pathname)) {
    return true;
  }
  if (isPublicOperationsStsChecklistRoute(pathname)) {
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

export async function middleware(request) {
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
    if (!(await isValidAccessToken(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const hasValidSession = await isValidAccessToken(token);
  const publicPages = ["/login", "/signup"];

  if (publicPages.includes(pathname)) {
    if (hasValidSession) {
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

  if (isProtected && !hasValidSession) {
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
    // "/signup",
    "/api/:path*",
  ],
};
