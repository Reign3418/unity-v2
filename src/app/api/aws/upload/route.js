import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadKingdomRoster } from '@/lib/awsDynamo';
import { registerSpreadsheetUploadWithEpochGuard } from '@/lib/dozerReconciler';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300;

export async function POST(req) {
  try {
    // 1. Authenticate the Request
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
    }

    // 2. Extract Data Boundaries
    const body = await req.json();
    const { kingdomId, rosterArray, scanDateOverride, sourceFile } = body;

    if (!kingdomId || !rosterArray || !Array.isArray(rosterArray) || rosterArray.length === 0) {
      return NextResponse.json(
        { error: 'Corrupted Payload. Missing target Kingdom or Array structures.' },
        { status: 400 }
      );
    }

    // Security Check: Only Leaders can upload data
    if (!session.user.isLeader && !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Clearance Denied. Admin Role Required to ignite AWS Uploads.' },
        { status: 403 }
      );
    }

    // Cross-tenant Check
    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kingdomId)) {
      return NextResponse.json(
        { error: 'Access Denied. You cannot upload data to a Kingdom outside your jurisdiction.' },
        { status: 403 }
      );
    }

    // 3. Evaluate DOZER Epoch 0 Archival Guard & Trojan-Horse Lead Detection
    const epochGuard = registerSpreadsheetUploadWithEpochGuard({
      kingdomId,
      rowCount: rosterArray.length,
      sourceFile: sourceFile || 'Spreadsheet_Upload.xlsx',
      uploaderName: session.user.username || 'Leader',
      scanDate: scanDateOverride || new Date().toISOString(),
    });

    // Also notify KENT in bastion_state.json if this is a brand-new unclaimed kingdom ("Trojan Horse" trigger)
    if (!epochGuard.isBotSovereign) {
      try {
        const bastionStatePath = path.join(process.cwd(), 'scanner', 'bastion_state.json');
        if (fs.existsSync(bastionStatePath)) {
          const bState = JSON.parse(fs.readFileSync(bastionStatePath, 'utf8'));
          bState.activityLog = [
            {
              id: `evt-trojan-${Date.now()}`,
              timestamp: new Date().toISOString(),
              agent: 'KENT',
              ring: 'ring1_intelligence',
              model: bState.ringModels?.ring1_intelligence?.selectedModel || 'gemini-3.1-flash-lite',
              action: 'TROJAN_HORSE_SHEET_DETECTED',
              kingdom: String(kingdomId),
              detail: `Spreadsheet uploaded for untracked Kingdom #${kingdomId} (${rosterArray.length} rows by ${session.user.username || 'Leader'}). Ready for 1-click Bastion Bot Takeover & Epoch 0 Cutover!`,
            },
            ...(bState.activityLog || []),
          ].slice(0, 80);
          fs.writeFileSync(bastionStatePath, JSON.stringify(bState, null, 2), 'utf8');
        }
      } catch {}
    }

    // 4. Write to DynamoDB with explicit sourceType & epochStatus
    //    If Kingdom is already BOT_SOVEREIGN, epochStatus = 'ARCHIVED_VIEW_ONLY' so getKingdomRoster
    //    and active Bot-to-Bot deltas NEVER get overwritten by a manual spreadsheet!
    const uploaderData = {
      discordId: session.user.id,
      username: session.user.username,
      sourceFile: sourceFile || 'Unknown_File_Data',
      importTag: `SHEET_${randomUUID().split('-')[0].toUpperCase()}`,
      sourceType: epochGuard.isBotSovereign ? 'ARCHIVED_SHEET' : 'SANDBOX_SHEET',
      coverageTier: rosterArray.length >= 600 ? 'SWEET_650_ROSTER' : rosterArray.length >= 450 ? 'CORE_465_ROSTER' : 'PARTIAL_SLICE',
      epochStatus: epochGuard.isBotSovereign ? 'ARCHIVED_VIEW_ONLY' : 'SANDBOX_SHEET',
    };

    const dateKey = await uploadKingdomRoster(kingdomId, rosterArray, uploaderData, scanDateOverride);

    return NextResponse.json(
      {
        success: true,
        isBotSovereign: epochGuard.isBotSovereign,
        epochPolicy: epochGuard.epochPolicy,
        message: epochGuard.isBotSovereign
          ? `Kingdom #${kingdomId} is Bot-Sovereign: ${rosterArray.length} spreadsheet rows saved to Historical Archive (View-Only) without altering active Bot deltas.`
          : `Sandbox Upload Complete (${rosterArray.length} rows). Bastion Ring alerted to deploy an autonomous bot to Kingdom #${kingdomId}.`,
        dateKey,
        rowCount: rosterArray.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API/AWS/Upload] Ignition Failure:', error);
    return NextResponse.json({ error: 'Total Structural Failure during AWS execution.' }, { status: 500 });
  }
}
