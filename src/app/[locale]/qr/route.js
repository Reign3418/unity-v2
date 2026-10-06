import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Locale-prefixed QR Code Fallback
 * Handles: /[locale]/qr?k=4194
 * Redirects to: /[locale]/shared/polygraph?kd=...
 */
export async function GET(request, { params }) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);

  const source = searchParams.get("src") || searchParams.get("utm_source") || "qr_code";
  const campaign = searchParams.get("campaign") || searchParams.get("c") || "unity_portal";
  const medium = searchParams.get("medium") || searchParams.get("utm_medium") || "scan";

  const kd = searchParams.get("kd") || searchParams.get("k");
  const p = searchParams.get("p");

  if (kd || p) {
    let targetKd = kd;
    let targetEnd = searchParams.get("end") || searchParams.get("e");
    let targetTf = searchParams.get("tf") || searchParams.get("t") || "24";
    let targetDepth = searchParams.get("depth") || searchParams.get("d") || "300";

    if (p) {
      try {
        const decoded = Buffer.from(p, 'base64url').toString('utf8');
        if (decoded.includes('_')) {
          const parts = decoded.split('_');
          targetKd = parts[0];
          targetEnd = parts[1] || targetEnd;
          targetTf = parts[2] || targetTf;
          targetDepth = parts[3] || targetDepth;
        }
      } catch (err) {}
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
    const baseUrl = host ? `${proto}://${host}` : request.url;

    if (targetKd) {
      const destination = new URL(`/${locale || "en"}/shared/polygraph`, baseUrl);
      destination.searchParams.set("kd", targetKd);
      if (targetEnd) destination.searchParams.set("end", targetEnd);
      destination.searchParams.set("tf", targetTf);
      destination.searchParams.set("depth", targetDepth);
      destination.searchParams.set("utm_source", source || "album_card");
      destination.searchParams.set("utm_medium", medium || "qr_scan");
      destination.searchParams.set("utm_campaign", campaign || `kd_${targetKd}`);

      return NextResponse.redirect(destination, 307);
    }
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
  const baseUrl = host ? `${proto}://${host}` : request.url;
  const destination = new URL(`/${locale || "en"}`, baseUrl);
  destination.searchParams.set("utm_source", source);
  destination.searchParams.set("utm_medium", medium);
  destination.searchParams.set("utm_campaign", campaign);

  return NextResponse.redirect(destination, 307);
}
