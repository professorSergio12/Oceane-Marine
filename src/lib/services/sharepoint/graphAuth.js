/**
 * App-only authentication for Microsoft Graph (client credentials flow).
 *
 * No user login is involved — the app authenticates as itself using the
 * Entra app registration credentials, then calls Graph with Sites.Read.All.
 *
 * Required env vars (see .env.local):
 *   DIRECTORY_TENANT_ID
 *   APPLICATION_CLIENT_ID
 *   CLIENT_SECRET
 */

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

let cachedToken = null;
let cachedExpiry = 0; // epoch ms

export const getGraphToken = async () => {
  // Reuse the token until ~1 min before it expires.
  if (cachedToken && Date.now() < cachedExpiry - 60_000) {
    return cachedToken;
  }

  const tenantId = process.env.DIRECTORY_TENANT_ID;
  const clientId = process.env.APPLICATION_CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Missing Microsoft Graph credentials. Set DIRECTORY_TENANT_ID, APPLICATION_CLIENT_ID and CLIENT_SECRET in .env.local"
    );
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: GRAPH_SCOPE,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    let code = "";
    try {
      code = JSON.parse(text)?.error || "";
    } catch {
      /* non-JSON body */
    }
    // Common "access was revoked / app disabled / secret expired" responses —
    // surface a clean, human message instead of a raw token dump. The caller
    // (sync job) catches this and marks the run "error" without crashing.
    if (
      res.status === 401 ||
      ["invalid_client", "unauthorized_client", "invalid_grant", "access_denied"].includes(code)
    ) {
      throw new Error(
        "SharePoint access denied — the app's credentials or permissions appear to have been revoked/expired. Sync skipped; it will retry automatically once access is restored."
      );
    }
    throw new Error(`Graph token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedToken;
};