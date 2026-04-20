// HTTPS redirect DISABLED — Beget hosting does NOT support HTTPS.
// Forcing HTTPS causes ERR_CONNECTION_CLOSED on production.
// This component is kept as a no-op to avoid breaking imports.

export function HttpsRedirect() {
  return null
}
