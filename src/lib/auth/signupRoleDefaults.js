/**
 * Legacy `User.roles` values allowed on public self-registration (see User schema enum).
 * ADMIN must not be self-assigned — use Admin Panel.
 */
export const PUBLIC_SIGNUP_LEGACY_ROLES = [
  "REVIEWER",
  "EDITOR",
  "UPLOADER",
  "CUSTOM_EDITOR",
];

/**
 * @param {unknown} role
 * @returns {string} one of PUBLIC_SIGNUP_LEGACY_ROLES
 */
export function normalizePublicSignupLegacyRole(role) {
  let raw = "";
  if (typeof role === "string" || typeof role === "number" || typeof role === "boolean") {
    raw = String(role).trim();
  }
  const u = raw.toUpperCase();
  if (u === "VIEWER") {
    return "REVIEWER";
  }
  if (PUBLIC_SIGNUP_LEGACY_ROLES.includes(u)) {
    return u;
  }
  return "REVIEWER";
}
