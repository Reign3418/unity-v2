import { handlers, getLastAuthError } from "@/lib/auth";

export const maxDuration = 300;

function enrichRedirect(res, req) {
  const location = res.headers.get("location");
  if (location && location.includes("/auth/error")) {
    const err = getLastAuthError();
    if (err?.discordError || err?.discordDesc) {
      try {
        const url = new URL(location, req.url);
        if (err.discordError) url.searchParams.set("discord_error", err.discordError);
        if (err.discordDesc) url.searchParams.set("discord_desc", err.discordDesc);
        const headers = new Headers(res.headers);
        headers.set("location", url.toString());
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      } catch {}
    }
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
      const clone = res.clone();
      const data = await clone.json();
      if (data?.url && data.url.includes("/auth/error")) {
        const err = getLastAuthError();
        if (err?.discordError || err?.discordDesc) {
          const url = new URL(data.url, req.url);
          if (err.discordError) url.searchParams.set("discord_error", err.discordError);
          if (err.discordDesc) url.searchParams.set("discord_desc", err.discordDesc);
          return Response.json({ url: url.toString() }, { headers: res.headers });
        }
      }
    } catch {}
  }
  return enrichRedirect(res, req);
}

