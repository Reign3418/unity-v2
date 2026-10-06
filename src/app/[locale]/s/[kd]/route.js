import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Locale-prefixed Polygraph Shortlink Fallback
 * Handles: /[locale]/s/[kd] (e.g. /en/s/4194)
 * Redirects to: /[locale]/shared/polygraph?kd=...
 */
export async function GET(request, { params }) {
  const { locale, kd } = await params;
  const { searchParams } = new URL(request.url);

  const end = searchParams.get("end") || searchParams.get("e");
  const tf = searchParams.get("tf") || searchParams.get("t") || "24";
  const depth = searchParams.get("depth") || searchParams.get("d") || "300";
  const source = searchParams.get("src") || "short_link";

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
  const baseUrl = host ? `${proto}://${host}` : request.url;

  const destination = new URL(`/${locale || "en"}/shared/polygraph`, baseUrl);
  destination.searchParams.set("kd", kd);
  if (end) destination.searchParams.set("end", end);
  destination.searchParams.set("tf", tf);
  destination.searchParams.set("depth", depth);
  destination.searchParams.set("utm_source", source);
  destination.searchParams.set("utm_medium", "short_url");
  destination.searchParams.set("utm_campaign", `kd_${kd}`);

  return NextResponse.redirect(destination, 307);
}
