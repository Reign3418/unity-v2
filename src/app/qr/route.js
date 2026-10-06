import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Universal Trackable QR Code Endpoint
 * Scans to: https://unity-v2-azure.vercel.app/qr
 * Redirects to: /en?utm_source=...&utm_medium=scan&utm_campaign=...
 * 
 * Automatically captures scan analytics in Vercel Analytics and Google Analytics.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Allow custom source tags (e.g. /qr?src=discord_poster, /qr?src=business_card)
  const source = searchParams.get("src") || searchParams.get("utm_source") || "qr_code";
  const campaign = searchParams.get("campaign") || searchParams.get("c") || "unity_portal";
  const medium = searchParams.get("medium") || searchParams.get("utm_medium") || "scan";
  const locale = searchParams.get("locale") || searchParams.get("lang") || "en";

  const kd = searchParams.get("kd") || searchParams.get("k");
  const p = searchParams.get("p");

  // If scanning a Polygraph Business Card / Album Card
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
      const destination = new URL(`/${locale}/shared/polygraph`, baseUrl);
      destination.searchParams.set("kd", targetKd);
      if (targetEnd) destination.searchParams.set("end", targetEnd);
      destination.searchParams.set("tf", targetTf);
      destination.searchParams.set("depth", targetDepth);
      destination.searchParams.set("utm_source", source || "album_card");
      destination.searchParams.set("utm_medium", medium || "qr_scan");
      destination.searchParams.set("utm_campaign", campaign || `kd_${targetKd}`);

      console.log(`[POLYGRAPH QR SCAN] KD: ${targetKd} | End: ${targetEnd || 'latest'} | Locale: ${locale}`);
      return NextResponse.redirect(destination, 307);
    }
  }

  // Build target URL
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
  const baseUrl = host ? `${proto}://${host}` : request.url;
  const destination = new URL(`/${locale}`, baseUrl);
  destination.searchParams.set("utm_source", source);
  destination.searchParams.set("utm_medium", medium);
  destination.searchParams.set("utm_campaign", campaign);

  // Log scan event to server stdout for Vercel Runtime Logs
  console.log(`[QR SCAN TRACKER] Source: ${source} | Campaign: ${campaign} | Locale: ${locale} | User-Agent: ${request.headers.get("user-agent") || "unknown"}`);

  // HTTP 307 Temporary Redirect
  return NextResponse.redirect(destination, 307);
}
