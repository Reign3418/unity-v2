import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { getTenantConfig, getUserConfig, getGlobalConfig, getGovernorStats, getAllTrackedKingdoms, getGuestPass, getKingdomSupporterStatus, pingUserActivity } from "./awsDynamo";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds guilds.members.read' } },
      checks: ['state'],
    }),
    CredentialsProvider({
      name: "Emergency Architecture Login",
      credentials: {
        username: { label: "Identifier", type: "text", placeholder: "e.g. reign3418" },
        password: { label: "Offline Matrix Key", type: "password" }
      },
      async authorize(credentials) {
        if (credentials.username === "reign3418" && credentials.password === process.env.UNITY_INTERNAL_SECRET) {
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
  ],
  secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "super_secret_unity_key",
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'credentials' || account?.provider === 'guest' || account?.provider === 'freemode') {
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
