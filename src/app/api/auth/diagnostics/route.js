import { NextResponse } from "next/server";
import { auth, getLastAuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Super-admin only. Everyone else gets a plain 404 so the endpoint can't be discovered,
// used to fingerprint auth config, or abused to trigger outbound requests to Discord.
function notFound() {
  return new NextResponse("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request) {
  let session = null;
  try {
    session = await auth();
  } catch {
    return notFound();
  }
  if (!session?.user?.isSuperAdmin) return notFound();

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

  const callbackUrl = `${origin}/api/auth/callback/discord`;

  // Live credential probe: a fake code returns invalid_grant if client_id/secret are valid,
  // or invalid_client if they are not. No user data is involved.
  let discordSecretVerified = null;
  let discordApiMessage = null;

  if (clientId && clientSecret) {
    try {
      const probeRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: "diagnostic_probe_test",
          redirect_uri: callbackUrl,
        }),
      });

      const data = await probeRes.json().catch(() => ({}));
      if (probeRes.status === 401 && data.error === "invalid_client") {
        discordSecretVerified = false;
        discordApiMessage = "Discord rejected the credentials (invalid_client).";
      } else if (probeRes.status === 400 && data.error === "invalid_grant") {
        discordSecretVerified = true;
        discordApiMessage = "Discord verified the client credentials.";
      } else {
        discordSecretVerified = probeRes.status !== 401;
        discordApiMessage = `Discord response: ${data.error || probeRes.status}`;
      }
    } catch (e) {
      discordApiMessage = `Discord probe error: ${e.message}`;
    }
  }

  const lastError = getLastAuthError();

  return NextResponse.json(
    {
      status: (!clientId || !clientSecret) ? "CONFIG_MISSING" : (discordSecretVerified ? "HEALTHY" : "CREDENTIALS_INVALID"),
      origin,
      callbackUrl,
      env: {
        hasClientId: Boolean(clientId),
        clientIdMasked: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : null,
        hasClientSecret: Boolean(clientSecret),
        hasAuthSecret: Boolean(authSecret),
      },
      discordProbe: {
        verified: discordSecretVerified,
        message: discordApiMessage,
      },
      lastError: lastError ? {
        name: lastError.name,
        message: lastError.message,
        discordError: lastError.discordError,
        discordDesc: lastError.discordDesc,
        timestamp: lastError.timestamp,
      } : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
