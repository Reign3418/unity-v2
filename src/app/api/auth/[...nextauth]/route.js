import { handlers, getLastAuthError } from "@/lib/auth";

export const maxDuration = 300;

// Only well-known OAuth error codes are ever forwarded to the public error page.
// Free-text messages/descriptions are NOT put in the URL: they leak internals and
// would let anyone craft phishing links that render arbitrary text on our domain.
const SAFE_DISCORD_ERRORS = new Set([
  "invalid_client",
  "invalid_grant",
  "access_denied",
  "invalid_request",
  "invalid_scope",
  "unauthorized_client",
  "server_error",
  "temporarily_unavailable",
]);

function withSafeErrorCode(urlString, base) {
  const err = getLastAuthError();
  const code = err?.discordError;
  if (!code || !SAFE_DISCORD_ERRORS.has(code)) return null;
  const url = new URL(urlString, base);
  url.searchParams.set("discord_error", code);
  return url.toString();
}

function enrichRedirect(res, req) {
  const location = res.headers.get("location");
  if (location && location.includes("/auth/error")) {
    try {
      const next = withSafeErrorCode(location, req.url);
      if (next) {
        const headers = new Headers(res.headers);
        headers.set("location", next);
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
      }
    } catch {}
  }
  return res;
}

export async function GET(req) {
  const res = await handlers.GET(req);
  return enrichRedirect(res, req);
}

export async function POST(req) {
  const res = await handlers.POST(req);
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await res.clone().json();
      if (data?.url && data.url.includes("/auth/error")) {
        const next = withSafeErrorCode(data.url, req.url);
        if (next) return Response.json({ url: next }, { headers: res.headers });
      }
    } catch {}
  }
  return enrichRedirect(res, req);
}
