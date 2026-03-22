import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getTenantConfig, getUserConfig, getGlobalConfig } from "./awsDynamo";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify guilds guilds.members.read' } },
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

          // Master Override from Database (GLOBAL_CONFIG -> SUPER_ADMINS)
          const masterConfigStr = await getGlobalConfig('SUPER_ADMINS');
          const isSuperAdmin = masterConfigStr && masterConfigStr.includes(profile.id);

          if (isSuperAdmin || profile.username === 'reign3418' || profile.username === 'reign') {
              isLeader = true;
              isMember = true;
              activeTenant = {
                  guildId: "master",
                  kingdomId: "3155",
                  leadershipRoleId: "master",
                  allowedKingdoms: ["3155", "3156"]
              };
          }

          for (const guild of userGuilds) {
            const hasAdmin = guild.permissions ? (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8) : false;
            
            if (guild.owner || hasAdmin) {
              ownedGuilds.push({ id: guild.id, name: guild.name, icon: guild.icon });
            }

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

          token.isMember = isMember;
          token.isLeader = isLeader;
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
        session.user.tenant = token.tenant;
        session.user.governorConfig = token.governorConfig;
        session.user.ownedGuilds = token.ownedGuilds;
        session.accessToken = token.accessToken;
      }
      return session;
    }
  }
});
