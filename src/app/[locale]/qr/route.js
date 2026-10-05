import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const source = searchParams.get("src") || searchParams.get("utm_source") || "qr_code";
  const campaign = searchParams.get("campaign") || searchParams.get("c") || "unity_portal";
  const medium = searchParams.get("medium") || searchParams.get("utm_medium") || "scan";

  // Redirect to English landing page with UTM tracking parameters
  const destination = new URL("/en", request.url);
  destination.searchParams.set("utm_source", source);
  destination.searchParams.set("utm_medium", medium);
  destination.searchParams.set("utm_campaign", campaign);

  return NextResponse.redirect(destination, 307);
}
