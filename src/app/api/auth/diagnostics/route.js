import { NextResponse } from "next/server";
import { getLastAuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "unity-v2-azure.vercel.app";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;

  const clientId = (
    process.env.DISCORD_CLIENT_ID ||
    process.env.AUTH_DISCORD_ID ||
    process.env.DISCORD_ID ||
    process.env.DISCORD_APP_ID ||
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
    ""
  ).trim();

  const clientSecret = (
    process.env.DISCORD_CLIENT_SECRET ||
    process.env.AUTH_DISCORD_SECRET ||
    process.env.DISCORD_SECRET ||
    process.env.DISCORD_BOT_SECRET ||
    ""
  ).trim();

  const authSecret = (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SESSION_SECRET ||
    ""
  ).trim();

  const lastError = getLastAuthError();

  return NextResponse.json({
    status: (!clientId || !clientSecret) ? "CONFIG_MISSING" : "CONFIGURED",
    origin,
    callbackUrl: `${origin}/api/auth/callback/discord`,
    env: {
      hasClientId: Boolean(clientId),
      clientIdMasked: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : null,
      hasClientSecret: Boolean(clientSecret),
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      hasAuthSecret: Boolean(authSecret),
    },
    lastError: lastError ? {
      name: lastError.name,
      message: lastError.message,
      discordError: lastError.discordError,
      discordDesc: lastError.discordDesc,
      timestamp: lastError.timestamp,
    } : null,
  });
}
