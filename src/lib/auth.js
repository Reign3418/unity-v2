import NextAuth, { CredentialsSignin } from "next-auth";
import Discord from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { getTenantConfig, getUserConfig, getGlobalConfig, getGovernorStats, getAllTrackedKingdoms, getGuestPass, getKingdomSupporterStatus, pingUserActivity, getGovernorAuth, hashGovernorPin, recordGovernorLoginFailure, resetGovernorLoginFailures, lockGovernorAuth, deleteGovernorAuth } from "./awsDynamo";
import { notifyAdmin } from "./notifyAdmin";
import { logEvent } from "./eventLogger";
import { createHash, timingSafeEqual } from "crypto";

/** Constant-time string comparison (hash first so differing lengths don't leak or throw). */
function safeEqual(a, b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

/** After this many wrong PINs a regular governor account is cleared (owner re-registers). */
const GOVERNOR_MAX_PIN_ATTEMPTS = 10;

/** Governor login failure with a client-visible code (attempts left / cleared / locked). */
class GovernorLoginError extends CredentialsSignin {
  constructor(code) {
    super();
    this.code = code;
  }
}

const discordClientId = (
  process.env.DISCORD_CLIENT_ID || 
  process.env.AUTH_DISCORD_ID || 
  process.env.DISCORD_ID || 
  process.env.DISCORD_APP_ID || 
  process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
  ""
).trim();

const discordClientSecret = (
  process.env.DISCORD_CLIENT_SECRET || 
  process.env.AUTH_DISCORD_SECRET || 
  process.env.DISCORD_SECRET || 
  process.env.DISCORD_BOT_SECRET || 
  ""
).trim();

let lastAuthError = null;

export function getLastAuthError() {
  return lastAuthError;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Discord({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      // Discord appends `iss=https://discord.com` to the OAuth callback (RFC 9207).
      // Auth.js validates it against provider.issuer, which otherwise defaults to https://authjs.dev.
      issuer: 'https://discord.com',
      // `email` intentionally omitted — the app never uses it (data minimization).
      authorization: { params: { scope: 'identify guilds guilds.members.read' } },
      // PKCE blocks authorization-code injection; state blocks login CSRF. Discord supports both.
      checks: ['pkce', 'state'],
      client: {
        token_endpoint_auth_method: 'client_secret_post'
      }
    }),
    CredentialsProvider({
      name: "Emergency Architecture Login",
      credentials: {
        username: { label: "Identifier", type: "text", placeholder: "e.g. reign3418" },
        password: { label: "Offline Matrix Key", type: "password" }
      },
      async authorize(credentials) {
        const expected = process.env.UNITY_INTERNAL_SECRET;
        // Fail closed: if the secret is missing/weak, this login path is disabled entirely.
        // (Previously `undefined === undefined` granted super admin with no password.)
        if (!expected || expected.length < 16) return null;
        if (typeof credentials?.password !== "string" || !credentials.password) return null;
        if (credentials.username === "reign3418" && safeEqual(credentials.password, expected)) {
          return {
            id: "reign3418",
            name: "reign3418",
            email: "admin@unity.local",
            image: "https://cdn.discordapp.com/embed/avatars/0.png"
          };
        }
        return null;
      }
    }),
    CredentialsProvider({
      id: "guest",
      name: "Guest Passcode",
      credentials: {
        passcode: { label: "Passcode", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.passcode) return null;
        const guestData = await getGuestPass(credentials.passcode);
        if (guestData) {
          return {
             id: `GUEST_${guestData.passcode}`,
             name: guestData.playerName || "Temporary Guest",
             email: "guest@unity.local",
             image: "https://cdn.discordapp.com/embed/avatars/3.png",
             guestData: guestData // Passing DB payload to JWT hook
          };
        }
        return null; // Invalid or expired passcode
      }
    }),
    CredentialsProvider({
      id: "freemode",
      name: "Freemode",
      credentials: {},
      async authorize() {
        return {
           id: "freemode",
           name: "Anonymous User",
           email: "free@unity.local",
           image: "https://cdn.discordapp.com/embed/avatars/1.png"
        };
      }
    }),
    CredentialsProvider({
      id: "governor",
      name: "Governor ID & PIN",
      credentials: {
        governorId: { label: "Governor ID", type: "text" },
        pin: { label: "4-Digit PIN", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.governorId || !credentials?.pin) return null;
        const cleanId = String(credentials.governorId).replace(/\D/g, '');
        const pin = String(credentials.pin).trim();
        if (!cleanId || !/^\d{4,8}$/.test(pin)) return null;

        const govAuth = await getGovernorAuth(cleanId);
        if (!govAuth) return null;

        // Elevated accounts that hit the limit are locked until an admin restores them.
        if (govAuth.lockedAt) throw new GovernorLoginError("locked");

        if (!safeEqual(govAuth.pinHash, hashGovernorPin(pin))) {
          const attempts = await recordGovernorLoginFailure(cleanId);
          if (attempts === null) return null; // Record vanished mid-request.

          if (attempts >= GOVERNOR_MAX_PIN_ATTEMPTS) {
            const isElevated = (govAuth.role || 'User') !== 'User';
            if (isElevated) {
              await lockGovernorAuth(cleanId);
              notifyAdmin({
                type: "ERROR",
                title: `🔒 Governor Account Locked: ${cleanId}`,
                message: `${govAuth.governorName || cleanId} (${govAuth.role}) hit ${GOVERNOR_MAX_PIN_ATTEMPTS} failed PIN attempts and was locked instead of cleared because it holds an elevated role. Verify the owner before restoring.`,
                details: { governorId: cleanId, governorName: govAuth.governorName, kingdomNumber: govAuth.kingdomId, reason: "PIN attempt limit reached on elevated account" }
              }).catch(() => {});
              throw new GovernorLoginError("locked");
            }
            await deleteGovernorAuth(cleanId);
            logEvent('AUTH_GOVERNOR_CLEARED', { governorId: cleanId, kingdomNumber: govAuth.kingdomId, reason: 'pin_attempt_limit' }).catch(() => {});
            throw new GovernorLoginError("cleared");
          }

          throw new GovernorLoginError(`pin_attempts_${GOVERNOR_MAX_PIN_ATTEMPTS - attempts}`);
        }

        if (govAuth.failedAttempts > 0) await resetGovernorLoginFailures(cleanId);

        // Never carry the PIN hash into the JWT/session pipeline.
        const { pinHash: _omit, ...safeGovData } = govAuth;
        return {
          id: `GOV_${cleanId}`,
          name: govAuth.governorName || `Governor ${cleanId}`,
          email: `${cleanId}@unity.rok`,
          image: "https://cdn.discordapp.com/embed/avatars/2.png",
          govData: safeGovData
        };
      }
    }),
  ],
  pages: {
    error: '/auth/error',
  },
  // No hardcoded fallback: a known secret would let anyone forge session tokens. Missing env = fail closed.
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET,
  logger: {
    error(error) {
      // Wrong PIN / passcode is a normal user error, not a system fault. Don't alert admins
      // (anyone could flood the Discord webhook) and don't clobber the last real auth error.
      if (error?.type === "CredentialsSignin" || error instanceof CredentialsSignin) {
        console.warn("[NextAuth] Credentials sign-in rejected:", error?.code || "credentials");
        return;
      }
      console.error("[NextAuth Server Error]:", error?.name || error?.type, error?.message);
      if (error?.cause) {
        console.error("[NextAuth Cause]:", error.cause);
      }

      const rawCause = error?.cause;
      const innerErr = rawCause?.err || rawCause;

      let discordError = null;
      let discordDesc = null;

      const candidateCauses = [
        innerErr?.cause,
        innerErr?.cause?.[0],
        rawCause?.cause,
        rawCause?.parameters,
        rawCause,
        error
      ];

      for (const c of candidateCauses) {
        if (!c) continue;
        if (!discordError && c.error) discordError = String(c.error);
        if (!discordDesc && c.error_description) discordDesc = String(c.error_description);
      }

      let rootMessage = innerErr?.message || error?.message || 'Configuration error';
      if (rootMessage.includes("Read more at")) {
        const cleanMsg = rootMessage.split("Read more at")[0].trim().replace(/\.$/, "");
        rootMessage = discordDesc || (discordError ? `Discord Error: ${discordError}` : "") || innerErr?.cause?.message || cleanMsg || 'Authentication callback failed';
      }

      lastAuthError = {
        name: innerErr?.name || error?.name || error?.type || 'AuthError',
        message: rootMessage,
        discordError,
        discordDesc,
        cause: typeof error?.cause === 'object' ? JSON.stringify(error.cause) : String(error?.cause || ''),
        timestamp: new Date().toISOString()
      };

      try {
        notifyAdmin({
          type: "ERROR",
          title: "🚨 NextAuth Authentication Exception",
          message: `Auth operation failed on Unity Gateway: ${discordError ? `${discordError} - ${discordDesc || ''}` : rootMessage}`,
          details: {
            reason: `${lastAuthError.name}: ${rootMessage}`,
            discordError: discordError || 'N/A',
            userMessage: lastAuthError.cause
          }
        }).catch(() => {});
      } catch {
        // Non-blocking fail-safe
      }
    },
    warn(code) {
      console.warn(`[NextAuth Warn] ${code}`);
    },
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'credentials' || account?.provider === 'guest' || account?.provider === 'freemode' || account?.provider === 'governor') {
          // ==========================================
          // EMERGENCY OFFLINE LOGIN BYPASS (DISCORD DOWN)
          // ==========================================
          if (user?.id === "reign3418") {
              token.id = user.id;
              token.username = user.name;
              token.avatar = user.image;
              token.accessToken = "OFFLINE_MODE";
              
              token.isMember = true;
              token.isAnalyst = true;
              token.isLeader = true;
              token.isSuperAdmin = true;
              token.isSupporter = true;
              
              token.tenant = {
                  guildId: "emergency_admin",
                  kingdomId: "3418",
                  leadershipRoleId: "master",
                  allowedKingdoms: ["3418", "4025", "3155", "3738"]
              };
              token.governorConfig = {};
              token.ownedGuilds = [];
              return token;
          }

          // ==========================================
          // WEB GUEST LOGIN BYPASS
          // ==========================================
          if (user?.id?.startsWith("GUEST_")) {
              token.id = user.id;
              token.username = user.name;
              token.avatar = user.image;
              token.accessToken = "GUEST_MODE";
              
              token.isMember = true;
              token.isAnalyst = user.guestData?.role === "Data Analyst" || user.guestData?.role === "analyst" || user.guestData?.role === "Leader" || user.guestData?.role === "Admin";
              token.isLeader = user.guestData?.role === "Leader" || user.guestData?.role === "Admin";
              token.isSuperAdmin = user.guestData?.role === "Admin";
              token.isSupporter = true;
              token.role = user.guestData?.role === "Admin" ? "Admin" : (user.guestData?.role === "Leader" ? "Leader" : (user.guestData?.role === "Data Analyst" || user.guestData?.role === "analyst" ? "Data Analyst" : "User"));
              
              token.tenant = {
                  guildId: "guest",
                  kingdomId: user.guestData?.kingdomId || "3155",
                  leadershipRoleId: "guest",
                  allowedKingdoms: [user.guestData?.kingdomId || "3155"]
              };
              // Fetch saved user config (timezone, playtimeStart, playtimeEnd) if it exists.
              // Guests can save timezone via Settings — this ensures it hydrates on every login.
              try {
                  const guestConfig = await getUserConfig(token.id);
                  token.governorConfig = guestConfig || {};
              } catch {
                  token.governorConfig = {};
              }
              token.ownedGuilds = [];
              return token;
          }

          // ==========================================
          // UNRESTRICTED FREEMODE LOGIN BYPASS
          // ==========================================
          if (user?.id === "freemode") {
              token.id = user.id;
              token.username = user.name;
              token.avatar = user.image;
              token.accessToken = "FREE_MODE";
              
              token.isMember = true;
              token.isAnalyst = false;
              token.isLeader = false;
              token.isSuperAdmin = false;
              token.isSupporter = false;
              token.role = "User";
              
              token.tenant = {
                  guildId: "freemode",
                  kingdomId: null, // Lock freemode users to a default state with no data access
                  leadershipRoleId: "freemode",
                  allowedKingdoms: []
              };
              token.governorConfig = {};
              token.ownedGuilds = [];
              return token;
          }

          // ==========================================
          // GOVERNOR ID & PIN LOGIN BYPASS
          // ==========================================
          if (user?.id?.startsWith("GOV_")) {
              token.id = user.id;
              token.username = user.name;
              token.avatar = user.image;
              token.accessToken = "GOV_MODE";
              
              token.isMember = true;
              token.isAnalyst = user.govData?.role === "Data Analyst" || user.govData?.role === "analyst" || user.govData?.role === "Leader" || user.govData?.role === "Admin";
              token.isLeader = user.govData?.role === "Leader" || user.govData?.role === "Admin";
              token.isSuperAdmin = user.govData?.role === "Admin";
              token.isSupporter = true;
              token.role = user.govData?.role || "User";
              
              const kd = String(user.govData?.kingdomId || "3418");
              token.tenant = {
                  guildId: "kingdom_" + kd,
                  kingdomId: kd,
                  allianceTag: user.govData?.allianceTag || "",
                  leadershipRoleId: "member",
                  allowedKingdoms: [kd]
              };
              token.governorConfig = {
                  governorId: user.govData?.governorId,
                  governorName: user.govData?.governorName
              };
              token.ownedGuilds = [];
              return token;
          }
      }

      if (account && profile) {
        token.id = profile.id;
        token.username = profile.username;
        token.avatar = profile.avatar;
        token.accessToken = account.access_token;

        // Backfill Discord identity fields into DynamoDB — fire-and-forget, non-blocking
        pingUserActivity(
          profile.id,
          profile.username,
          profile.global_name || profile.username
        ).catch(() => {});

        try {
          const guildsResponse = await fetch(`https://discord.com/api/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${account.access_token}` }
          });
          
          let userGuilds = [];
          if (guildsResponse.ok) {
            userGuilds = await guildsResponse.json();
          }

          let isLeader = false;
          let isMember = false;
          let activeTenant = null;
          let ownedGuilds = [];

          let computedSuperAdmin = false;
          // Master Override from Database (GLOBAL_CONFIG -> SUPER_ADMINS)
          const masterConfigStr = await getGlobalConfig('SUPER_ADMINS');
          const isDbSuperAdmin = masterConfigStr && masterConfigStr.includes(profile.id);

          const safeUsername = (profile.username || '').toLowerCase();

          if (isDbSuperAdmin || safeUsername === 'reign3418' || safeUsername === 'reign') {
              computedSuperAdmin = true;
              isLeader = true;
              isMember = true;
              
              const allKds = await getAllTrackedKingdoms();

              activeTenant = {
                  guildId: "master",
                  kingdomId: allKds.length > 0 ? allKds[0] : "3155",
                  leadershipRoleId: "master",
                  allowedKingdoms: allKds.length > 0 ? allKds : ["3155"]
              };
          }

          for (const guild of userGuilds) {
            const hasAdmin = guild.permissions ? (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8) : false;
            
            if (guild.owner || hasAdmin) {
              ownedGuilds.push({ id: guild.id, name: guild.name, icon: guild.icon });
            }

            // If already a Super Admin, we don't want standard Discord Tenant logic replacing our master tenant array
            if (computedSuperAdmin) continue;

            const tenantConfig = await getTenantConfig(guild.id);
            if (tenantConfig) {
              let loopIsLeader = false;
              
              if (guild.owner || hasAdmin) {
                loopIsLeader = true;
              } else {
                const memberResponse = await fetch(`https://discord.com/api/users/@me/guilds/${guild.id}/member`, {
                  headers: { Authorization: `Bearer ${account.access_token}` }
                });
                if (memberResponse.ok) {
                  const memberData = await memberResponse.json();
                  if (memberData.roles.includes(tenantConfig.leadershipRoleId)) {
                    loopIsLeader = true;
                  }
                }
              }

              if (!isMember && !loopIsLeader) {
                isMember = true;
                activeTenant = {
                  guildId: guild.id,
                  kingdomId: tenantConfig.kingdomId,
                  leadershipRoleId: tenantConfig.leadershipRoleId,
                  allowedKingdoms: tenantConfig.allowedKingdoms || []
                };
              }

              if (loopIsLeader) {
                isLeader = true;
                isMember = true;
                activeTenant = {
                  guildId: guild.id,
                  kingdomId: tenantConfig.kingdomId,
                  leadershipRoleId: tenantConfig.leadershipRoleId,
                  allowedKingdoms: tenantConfig.allowedKingdoms || []
                };
                break;
              }
            }
          }

          const userConfig = await getUserConfig(profile.id);

          // Inherit Database Master Roles 
          const dbRole = (userConfig?.role || '').toLowerCase();
          
          // ── Role Flags: computed after dbRole resolution ──────────────────
          let isAnalyst = false;

          if (dbRole === 'admin') {
              computedSuperAdmin = true;
              isLeader = true;
              isAnalyst = true;
              isMember = true;

              if (!activeTenant || activeTenant.guildId !== "master") {
                  const allKds = await getAllTrackedKingdoms();
                  activeTenant = {
                      guildId: "master",
                      kingdomId: allKds.length > 0 ? allKds[0] : "3155",
                      leadershipRoleId: "master",
                      allowedKingdoms: allKds.length > 0 ? allKds : ["3155"]
                  };
              }
          } else if (dbRole === 'data analyst' || dbRole === 'analyst') {
              // Data Analyst: full intelligence access (DKP, Recruiting, Scatter) — no operational command tools
              computedSuperAdmin = false;
              isLeader = false;   // Analyst is NOT a full leader — sidebar will filter accordingly
              isAnalyst = true;
              isMember = true;

              // Analysts ALWAYS get all tracked kingdoms — Discord guild membership is irrelevant.
              // Preserve their existing guild's primary KD as the default workbench KD if they have one.
              const allKds = await getAllTrackedKingdoms();
              const existingKingdomId = activeTenant?.kingdomId;
              activeTenant = {
                  guildId: activeTenant?.guildId || "analyst",
                  kingdomId: existingKingdomId || (allKds.length > 0 ? allKds[0] : "3155"),
                  leadershipRoleId: "analyst",
                  allowedKingdoms: allKds.length > 0 ? allKds : ["3155"]
              };
          } else if (dbRole === 'leader') {
              isLeader = true;
              isAnalyst = true;   // Leaders inherit analyst access
              isMember = true;
          }

          // Additive hierarchy: SuperAdmin and Leader always imply Analyst
          if (computedSuperAdmin || isLeader) isAnalyst = true;

          // Card-Based Key Initialization
          let cardKingdoms = [];
          if (userConfig && userConfig.governorIds) {
              for (const grid of userConfig.governorIds) {
                  const stats = await getGovernorStats(grid);
                  if (stats && stats.lastSeenKingdom && stats.lastSeenKingdom !== 'Unknown') {
                      cardKingdoms.push(String(stats.lastSeenKingdom));
                  }
              }
          }

          if (!activeTenant) {
              // If they have no discord tenant, but THEY DO HAVE linked cards, create a virtual tenant for them!
              if (cardKingdoms.length > 0) {
                  isMember = true;
                  activeTenant = {
                      guildId: "virtual_card",
                      kingdomId: cardKingdoms[0], // Default to their first linked card's KD
                      leadershipRoleId: "none",
                      allowedKingdoms: Array.from(new Set(cardKingdoms))
                  };
              }
          } else {
              // If they DO have a discord tenant, merge their card kingdoms into their allowed list natively
              const merged = new Set([...(activeTenant.allowedKingdoms || []), ...cardKingdoms]);
              activeTenant.allowedKingdoms = Array.from(merged);
              
              // If the explicit tenant has no native kingdom mapped, set it to the card's native kingdom
              if (!activeTenant.kingdomId && cardKingdoms.length > 0) {
                  activeTenant.kingdomId = cardKingdoms[0];
              }
          }

          token.isMember = isMember;
          token.isAnalyst = isAnalyst;
          token.isLeader = isLeader;
          token.isSuperAdmin = computedSuperAdmin;
          token.tenant = activeTenant;
          token.governorConfig = userConfig;
          token.ownedGuilds = ownedGuilds;
          token.role = computedSuperAdmin ? "Admin" : (isLeader ? "Leader" : (isAnalyst ? "Data Analyst" : "User"));
          
          let isSupporter = false;
          if (computedSuperAdmin) {
              isSupporter = true;
          } else if (activeTenant && activeTenant.allowedKingdoms) {
              for (const k of activeTenant.allowedKingdoms) {
                  const check = await getKingdomSupporterStatus(k);
                  if (check) {
                      isSupporter = true;
                      break;
                  }
              }
          }
          token.isSupporter = isSupporter;
          
        } catch (error) {
          console.error("[NextAuth] Error resolving Discord RBAC capabilities:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.avatar = token.avatar;
        session.user.isMember = token.isMember;
        session.user.isAnalyst = token.isAnalyst || false;
        session.user.isLeader = token.isLeader;
        session.user.isSuperAdmin = token.isSuperAdmin;
        session.user.isSupporter = token.isSupporter || false;
        session.user.role = token.role || "User";
        session.user.tenant = token.tenant;
        session.user.allowedKingdoms = token.tenant?.allowedKingdoms || [];
        session.user.governorConfig = token.governorConfig;
        session.user.ownedGuilds = token.ownedGuilds;
        session.accessToken = token.accessToken;
      }
      return session;
    }
  }
});
