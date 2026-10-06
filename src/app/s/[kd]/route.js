import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Ultra-Short Polygraph Link Endpoint
 * URL: /s/[kd] (e.g. /s/4194 or /s/4194?e=2026-10-06&t=24)
 * Redirects to: /[locale]/shared/polygraph?kd=...
 * 
 * Optimized for in-game RoK kingdom mail, alliance chat, and discord blasts.
 */
export async function GET(request, { params }) {
  const { kd } = await params;
  const { searchParams } = new URL(request.url);

  const end = searchParams.get("end") || searchParams.get("e");
  const tf = searchParams.get("tf") || searchParams.get("t") || "24";
  const depth = searchParams.get("depth") || searchParams.get("d") || "300";
  const locale = searchParams.get("locale") || searchParams.get("lang") || "en";
  const source = searchParams.get("src") || "short_link";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
  const baseUrl = host ? `${proto}://${host}` : request.url;

  const destination = new URL(`/${locale}/shared/polygraph`, baseUrl);
  destination.searchParams.set("kd", kd);
  if (end) destination.searchParams.set("end", end);
  destination.searchParams.set("tf", tf);
  destination.searchParams.set("depth", depth);
  destination.searchParams.set("utm_source", source);
  destination.searchParams.set("utm_medium", "short_url");
  destination.searchParams.set("utm_campaign", `kd_${kd}`);

  return NextResponse.redirect(destination, 307);
}
