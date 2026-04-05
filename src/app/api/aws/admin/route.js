import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { 
  getAllUsers, getAllTenants, purgeKingdomDatabase, toggleUserAIAccess, toggleTenantAIAccess,
  getAllGuestPasses, getPendingUsers, createGuestPass, deleteGuestPass, approvePendingUser, 
  rejectPendingUser, addTenantAllowedKingdom, removeTenantAllowedKingdom, updateUserNotes, updateTenantNotes, deleteTenantConfig, updateUserRole, deleteUserAccess, syncDiscordProfiles, syncTenantGuildProfiles
} from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized. Master Creator Clearance Required." }, { status: 403 });
    }

    // Run both DynamoDB scans continuously over parallel threads
    const [users, tenants, passcodes, pendingUsers] = await Promise.all([
      getAllUsers(),
      getAllTenants(),
      getAllGuestPasses(),
      getPendingUsers()
    ]);

    // Attach current Environment Gateway strings so the Admin knows which DB is active
    return NextResponse.json({
      success: true,
      env: {
        region: process.env.AWS_REGION || "Unknown",
        tableName: process.env.AWS_TABLE_NAME || "Not Mapped"
      },
      users,
      tenants,
      passcodes,
      pendingUsers
    }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Admin] Matrix Core Failure:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Admin Matrix arrays." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized. Master Creator Clearance Required." }, { status: 403 });
    }

    const body = await req.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action directive." }, { status: 400 });
    }

    if (action === "TOGGLE_USER_AI") {
      const { discordId, newStatus } = payload;
      if (!discordId) return NextResponse.json({ error: "Missing Discord ID." }, { status: 400 });
      
      const success = await toggleUserAIAccess(discordId, newStatus);
      if (success) {
        return NextResponse.json({ success: true, message: `Access ${newStatus ? 'Restored' : 'Revoked'} for User ${discordId}` }, { status: 200 });
      } else {
        return NextResponse.json({ error: "Failed to Update AI Access for User." }, { status: 500 });
      }
    }

    if (action === "TOGGLE_TENANT_AI") {
      const { guildId, newStatus } = payload;
      if (!guildId) return NextResponse.json({ error: "Missing Guild ID." }, { status: 400 });
      
      const success = await toggleTenantAIAccess(guildId, newStatus);
      if (success) {
        return NextResponse.json({ success: true, message: `Access ${newStatus ? 'Restored' : 'Revoked'} for Tenant ${guildId}` }, { status: 200 });
      } else {
        return NextResponse.json({ error: "Failed to Update AI Access for Tenant." }, { status: 500 });
      }
    }

    // Danger Zone: Mass Purge
    if (action === "PURGE_KINGDOM") {
      const { kingdomId } = payload;
      if (!kingdomId) return NextResponse.json({ error: "Missing Kingdom ID for Purge." }, { status: 400 });
      
      const deletedCount = await purgeKingdomDatabase(kingdomId);
      return NextResponse.json({ 
        success: true, 
        message: `Database Purge Complete. ${deletedCount} nodes eradicated.` 
      }, { status: 200 });
    }

    // New Restoration Endpoints
    if (action === "GENERATE_GUEST_PASSCODE") {
      const { kingdomId, role, poc, expireDays } = payload;
      // Auto-generate 6-digit pin
      const pass = Math.floor(100000 + Math.random() * 900000).toString();
      const res = await createGuestPass(pass, kingdomId, role, parseInt(expireDays) || 7, poc);
      return NextResponse.json({ success: true, passcode: res.passcode, message: "Passcode slice created." }, { status: 200 });
    }

    if (action === "DELETE_GUEST_PASSCODE") {
      const { passcode } = payload;
      await deleteGuestPass(passcode);
      return NextResponse.json({ success: true, message: "Passcode Revoked." }, { status: 200 });
    }

    if (action === "APPROVE_MANUAL_USER") {
      // Moves from PENDING to Active Manual User
      const { discordId, kingdomId, role } = payload;
      await approvePendingUser(discordId, kingdomId, role);
      return NextResponse.json({ success: true, message: `User ${discordId} Approved.` }, { status: 200 });
    }

    if (action === "REJECT_MANUAL_USER") {
      const { discordId } = payload;
      await rejectPendingUser(discordId);
      return NextResponse.json({ success: true, message: `User ${discordId} Rejected.` }, { status: 200 });
    }

    if (action === "ADD_GLOBAL_MANUAL_USER") {
      // Direct injection (bypasses pending phase completely because admin did it)
      const { discordId, kingdomId, role } = payload;
      const { PutItemCommand } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const dbClient = new DynamoDBClient({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
          }
      });
      const params = {
          TableName: process.env.AWS_TABLE_NAME,
          Item: {
              'PK': { S: `USER#${discordId}` },
              'SK': { S: 'CONFIG' },
              'attributes': {
                  M: {
                      'isManualGuest': { BOOL: true },
                      'kingdomId': { S: String(kingdomId) },
                      'role': { S: String(role) }
                  }
              }
          }
      };
      await dbClient.send(new PutItemCommand(params));
      return NextResponse.json({ success: true, message: `Direct User ${discordId} Add Complete.` }, { status: 200 });
    }

    if (action === "SYNC_DISCORD_PROFILES") {
      const result = await syncDiscordProfiles();
      return NextResponse.json({ success: true, message: result.message }, { status: 200 });
    }

    if (action === "SYNC_TENANT_GUILDS") {
      const result = await syncTenantGuildProfiles();
      return NextResponse.json({ success: true, message: result.message }, { status: 200 });
    }


    if (action === "UPDATE_USER_ROLE") {
      const { discordId, role } = payload;
      const success = await updateUserRole(discordId, role);
      if (success) {
        return NextResponse.json({ success: true, message: `Access clearance updated for ${discordId}.` }, { status: 200 });
      }
      return NextResponse.json({ error: "Failed to update User clearance." }, { status: 500 });
    }

    if (action === "DELETE_USER_ACCESS") {
      const { discordId } = payload;
      if (!discordId) return NextResponse.json({ error: "Missing Discord ID." }, { status: 400 });
      const success = await deleteUserAccess(discordId);
      if (success) {
        return NextResponse.json({ success: true, message: `Access permanently revoked for ${discordId}.` }, { status: 200 });
      }
      return NextResponse.json({ error: "Failed to delete User clearance." }, { status: 500 });
    }

    if (action === "ADD_TENANT_KINGDOM") {
      const { guildId, newKingdomId } = payload;
      const success = await addTenantAllowedKingdom(guildId, newKingdomId);
      if (success) {
        return NextResponse.json({ success: true, message: `Bonus Kingdom Added to Guild.` }, { status: 200 });
      }
      return NextResponse.json({ error: "Guild not found or AWS write failed." }, { status: 500 });
    }

    if (action === "REMOVE_TENANT_KINGDOM") {
      const { guildId, removeKingdomId } = payload;
      const success = await removeTenantAllowedKingdom(guildId, removeKingdomId);
      if (success) {
        return NextResponse.json({ success: true, message: `Kingdom Access Revoked for Guild.` }, { status: 200 });
      }
      return NextResponse.json({ error: "Guild not found or AWS write failed." }, { status: 500 });
    }

    if (action === "UPDATE_USER_NOTES") {
      const { discordId, notes } = payload;
      const success = await updateUserNotes(discordId, notes);
      if (success) {
        return NextResponse.json({ success: true, message: `Notes updated for user.` }, { status: 200 });
      }
      return NextResponse.json({ error: "Failed to update User attributes." }, { status: 500 });
    }

    if (action === "UPDATE_TENANT_NOTES") {
      const { guildId, notes } = payload;
      const success = await updateTenantNotes(guildId, notes);
      if (success) {
        return NextResponse.json({ success: true, message: `Notes updated for tenant guild.` }, { status: 200 });
      }
      return NextResponse.json({ error: "Failed to update Tenant attributes." }, { status: 500 });
    }

    if (action === "DELETE_TENANT") {
      const { guildId } = payload;
      if (!guildId) return NextResponse.json({ error: "Missing Guild ID." }, { status: 400 });
      await deleteTenantConfig(guildId);
      return NextResponse.json({ success: true, message: `Tenant ${guildId} access terminated.` }, { status: 200 });
    }

    return NextResponse.json({ error: "Unknown Admin Directive." }, { status: 400 });

  } catch (error) {
    console.error("[API/AWS/Admin] Danger Zone Failure:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error executing Admin Action." }, { status: 500 });
  }
}
