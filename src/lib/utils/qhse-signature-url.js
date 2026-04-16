/**
 * Resolve stored signature values to a browser-safe img `src`.
 * Supports: data URLs, http(s), `/signature/{module}/{submodule}/...` (public static), legacy `uploads/...` (API), raw base64.
 *
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
export function resolveQhseSignatureImageSrc(value) {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const u = new URL(trimmed);
      if (
        u.pathname.startsWith("/signature/") ||
        u.pathname.startsWith("/api/qhse/file/")
      ) {
        return `${u.pathname}${u.search || ""}`;
      }
    } catch {
      /* ignore */
    }
    return trimmed;
  }
  if (trimmed.startsWith("/signature/") || trimmed.startsWith("signature/")) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
  if (trimmed.startsWith("uploads/") || trimmed.startsWith("/uploads/")) {
    const path = trimmed.replace(/^\/+/, "");
    return `/api/qhse/file/${path}`;
  }
  if (/^[A-Za-z0-9+/=]{50,}$/.test(trimmed)) {
    return `data:image/png;base64,${trimmed}`;
  }
  return null;
}

/** Same as {@link resolveQhseSignatureImageSrc}; generic name for app-wide use. */
export function resolveSignatureImageSrc(value) {
  return resolveQhseSignatureImageSrc(value);
}

/** True when the value can be shown as a signature image (img src). */
export function isResolvableSignatureImage(value) {
  return resolveQhseSignatureImageSrc(value) != null;
}
