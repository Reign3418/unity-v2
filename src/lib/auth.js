import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getTenantConfig, getUserConfig, getGlobalConfig, getGovernorStats } from "./awsDynamo";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds guilds.members.read' } },
      checks: ['state'],
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "super_secret_unity_key",
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account && profile) {
        token.id = profile.id;
        token.username = profile.username;
        token.avatar = profile.avatar;
        token.accessToken = account.access_token;

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
              activeTenant = {
                  guildId: "master",
                  kingdomId: "3155",
                  leadershipRoleId: "master",
                  allowedKingdoms: ["3155"]
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
          token.isLeader = isLeader;
          token.isSuperAdmin = computedSuperAdmin;
          token.tenant = activeTenant;
          token.governorConfig = userConfig;
          token.ownedGuilds = ownedGuilds;
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
        session.user.isLeader = token.isLeader;
        session.user.isSuperAdmin = token.isSuperAdmin;
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
