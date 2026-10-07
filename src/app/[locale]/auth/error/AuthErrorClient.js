"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { 
  ShieldAlert, Sparkles, RefreshCw, Castle, ChevronDown, 
  ChevronUp, Copy, Check, Terminal, Key, AlertCircle, CheckCircle2, XCircle
} from "lucide-react";

// Only known values from the URL are ever used. Anything else is ignored so crafted
// links can't inject text onto this page.
const SAFE_ERROR_TYPES = new Set(["Configuration", "AccessDenied", "Verification", "Default"]);
const SAFE_DISCORD_ERRORS = new Set([
  "invalid_client", "invalid_grant", "access_denied", "invalid_request",
  "invalid_scope", "unauthorized_client", "server_error", "temporarily_unavailable",
]);

export default function AuthErrorClient({ locale, initialError }) {
  const t = useTranslations("AuthError");
  const [errorType, setErrorType] = useState(SAFE_ERROR_TYPES.has(initialError) ? initialError : "Configuration");
  const [discordError, setDiscordError] = useState(null);
  // Populated only when /api/auth/diagnostics returns 200, which requires a super-admin session.
  const [diagData, setDiagData] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState("https://unity-v2-azure.vercel.app");

  const isAdminView = Boolean(diagData);
  // Free-text error detail comes only from the authenticated admin endpoint, never the URL.
  const errorMessage = diagData?.lastError?.message || null;
  const discordDesc = diagData?.lastError?.discordDesc || null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      const dErr = params.get("discord_error");
      if (err && SAFE_ERROR_TYPES.has(err)) setErrorType(err);
      if (dErr && SAFE_DISCORD_ERRORS.has(dErr)) setDiscordError(dErr);

      fetch("/api/auth/diagnostics", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return; // Not an admin: diagnostics stay hidden.
          setDiagData(data);
          const adminErr = data?.lastError?.discordError;
          if (adminErr && SAFE_DISCORD_ERRORS.has(adminErr) && !dErr) setDiscordError(adminErr);
        })
        .catch(() => {});
    }
  }, []);

  const callbackUrl = `${currentOrigin}/api/auth/callback/discord`;

  const copyCallbackUrl = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Technical setup guidance is for admins only.
  const getSpecificGuidance = () => {
    if (!isAdminView) return null;

    if (!diagData.env?.hasClientId) {
      return {
        title: "Missing Discord Client ID",
        desc: "Vercel is missing the DISCORD_CLIENT_ID environment variable for this deployment. Add it in Vercel Project Settings → Environment Variables.",
      };
    }
    if (!diagData.env?.hasClientSecret) {
      return {
        title: "Missing Discord Client Secret",
        desc: "Vercel is missing the DISCORD_CLIENT_SECRET environment variable for this deployment. Add it in Vercel Project Settings → Environment Variables.",
      };
    }

    if (discordError === "invalid_client" || diagData.discordProbe?.verified === false) {
      return {
        title: "Discord Rejected Secret (invalid_client)",
        desc: "Discord rejected the credentials. When resetting the secret in Discord Developer Portal, the old secret is invalidated. You must paste the NEW client secret into Vercel's DISCORD_CLIENT_SECRET and trigger a Redeploy in Vercel.",
      };
    }

    if (discordError === "invalid_grant" || discordDesc?.toLowerCase().includes("redirect_uri")) {
      return {
        title: "Callback URL Mismatch (invalid_grant)",
        desc: `Discord rejected the redirect URL. Go to Discord Developer Portal → OAuth2 → Redirects and ensure "${callbackUrl}" is saved.`,
      };
    }

    if (errorMessage) {
      return { title: "Auth Gateway Message", desc: errorMessage };
    }

    return null;
  };

  const specificGuidance = getSpecificGuidance();

  const getErrorMessage = () => {
    if (specificGuidance) {
      return specificGuidance.desc;
    }
    if (discordError === "access_denied") return t("err_access_denied");
    switch (errorType) {
      case "Configuration":
        return t("err_configuration");
      case "AccessDenied":
        return t("err_access_denied");
      case "Verification":
        return t("err_verification");
      default:
        return t("err_default");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-[#0c0f15]/95 border border-rose-500/25 rounded-3xl p-6 sm:p-10 shadow-[0_0_80px_rgba(244,63,94,0.12)] backdrop-blur-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-rose-500/15 via-rose-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Badge & Icon */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-6 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <ShieldAlert size={14} className="text-rose-400 animate-pulse" />
            <span className="tracking-wider uppercase">{t("badge")}</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-gray-400 uppercase tracking-wider mb-2">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {t("subtitle")}
          </p>

          {/* Error Banner */}
          <div className="w-full bg-[#131722] border border-rose-500/30 rounded-2xl p-4 sm:p-5 mb-8 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-rose-400/90 flex items-center gap-1.5">
                <Terminal size={12} />
                <span>ERR_CODE: {discordError ? `DISCORD_${discordError.toUpperCase()}` : errorType}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">GATEWAY_V2</span>
            </div>
            
            {specificGuidance && (
              <div className="mb-2 text-xs font-bold font-mono flex items-center gap-1.5 text-amber-400">
                <AlertCircle size={14} />
                <span>{specificGuidance.title}</span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {getErrorMessage()}
            </p>
          </div>

          {/* Primary Action: Direct RoK Governor ID & PIN Fallback */}
          <div className="w-full space-y-3 mb-8">
            <Link
              href={`/${locale}?auth=governor`}
              className="group relative flex items-center justify-center gap-2.5 w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all cursor-pointer"
            >
              <Key size={17} className="text-black group-hover:scale-110 transition-transform" />
              <span>{t("btn_gov_login")}</span>
              <Sparkles size={15} className="text-black animate-pulse" />
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => signIn("discord")}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/50 hover:border-[#5865F2] text-[#5865F2] hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>{t("btn_retry_discord")}</span>
              </button>

              <Link
                href={`/${locale}#public-academy`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                <Castle size={14} />
                <span>{t("btn_free_academy")}</span>
              </Link>
            </div>
          </div>

          {/* Collapsible High Command Diagnostic Box — super admins only */}
          {isAdminView && (
          <div className="w-full border-t border-slate-800/80 pt-5">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Terminal size={13} className="text-cyan-400" />
                <span>{t("admin_heading")}</span>
              </span>
              {showDiagnostics ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showDiagnostics && (
              <div className="mt-4 p-4 rounded-xl bg-[#090b10] border border-cyan-500/20 text-left font-mono text-xs space-y-4 animate-in fade-in duration-200">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{t("admin_redirect_title")}</span>
                    <button
                      onClick={copyCallbackUrl}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px] transition-colors cursor-pointer"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                  <div dir="ltr" className="bg-black/60 border border-slate-800 rounded-lg p-2.5 text-[11px] text-cyan-300 break-all select-all font-mono">
                    {callbackUrl}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    {t("admin_help_tip")}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>{t("admin_env_title")}</span>
                    <span className="text-[9px] text-slate-500 font-mono">LIVE RUNTIME CHECK</span>
                  </div>
                  <ul dir="ltr" className="space-y-1.5 text-[11px] text-slate-300 font-mono">
                    <li className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded">
                      <span className="text-slate-400">DISCORD_CLIENT_ID</span>
                      <span className="flex items-center gap-1">
                        {diagData?.env ? (
                          diagData.env.hasClientId ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                              <CheckCircle2 size={12} /> {diagData.env.clientIdMasked}
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 text-[10px] font-bold">
                              <XCircle size={12} /> MISSING IN VERCEL
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[10px]">Checking...</span>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded">
                      <span className="text-slate-400">DISCORD_CLIENT_SECRET</span>
                      <span className="flex items-center gap-1">
                        {diagData?.env ? (
                          diagData.env.hasClientSecret ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                              <CheckCircle2 size={12} /> LOADED
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 text-[10px] font-bold">
                              <XCircle size={12} /> MISSING IN VERCEL
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[10px]">Checking...</span>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded">
                      <span className="text-slate-400">DISCORD_TOKEN_HANDSHAKE</span>
                      <span className="flex items-center gap-1">
                        {diagData?.discordProbe ? (
                          diagData.discordProbe.verified === true ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
                              <CheckCircle2 size={12} /> MATCHED WITH DISCORD
                            </span>
                          ) : diagData.discordProbe.verified === false ? (
                            <span className="text-rose-400 flex items-center gap-1 text-[10px] font-bold">
                              <XCircle size={12} /> REJECTED BY DISCORD
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1 text-[10px]">
                              <AlertCircle size={12} /> {diagData.discordProbe.message || "TESTING"}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[10px]">Probing...</span>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center justify-between bg-black/40 px-2 py-1.5 rounded">
                      <span className="text-slate-400">AUTH_SECRET</span>
                      <span className="flex items-center gap-1">
                        {diagData?.env ? (
                          diagData.env.hasAuthSecret ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                              <CheckCircle2 size={12} /> LOADED
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1 text-[10px]">
                              <AlertCircle size={12} /> FALLBACK ACTIVE
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[10px]">Checking...</span>
                        )}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          )}

        </div>
      </div>
    </div>
  );
}
