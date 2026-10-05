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

  // Build target URL
  const destination = new URL(`/${locale}`, request.url);
  destination.searchParams.set("utm_source", source);
  destination.searchParams.set("utm_medium", medium);
  destination.searchParams.set("utm_campaign", campaign);

  // Log scan event to server stdout for Vercel Runtime Logs
  console.log(`[QR SCAN TRACKER] Source: ${source} | Campaign: ${campaign} | Locale: ${locale} | User-Agent: ${request.headers.get("user-agent") || "unknown"}`);

  // HTTP 307 Temporary Redirect
  return NextResponse.redirect(destination, 307);
}
