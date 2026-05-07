import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { STSClient, GetFederationTokenCommand } from '@aws-sdk/client-sts';
import { createPendingUser, getGlobalConfig, getTenantConfig, getUserConfig } from '@/lib/awsDynamo';

export const dynamic = 'force-dynamic';

const stsClient = new STSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

export async function GET(req) {
    const session = await auth();
    
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized. Please log in with Discord.' }, { status: 401 });
    }

    const { user } = session;

    if (user.ownedGuilds === undefined) {
        return NextResponse.json({ error: 'Session Schema Expired. Please log in again.' }, { status: 401 });
    }

    // Force fetch fresh user profile config
    try {
        const freshUserConfig = await getUserConfig(user.id);
        user.governorConfig = freshUserConfig;
        
        if (user.tenant && user.tenant.guildId) {
            const freshTenant = await getTenantConfig(user.tenant.guildId);
            if (freshTenant) {
                user.tenant.kingdomId = freshTenant.kingdomId;
                user.tenant.leadershipRoleId = freshTenant.leadershipRoleId;
                user.tenant.allowedKingdoms = freshTenant.allowedKingdoms || [];
            } else {
                user.tenant = null;
                user.isMember = false;
                user.isLeader = false;
            }
        }
    } catch (configError) {
        console.error("[STS Token] Failed to fetch fresh config:", configError);
    }

    if (!user.isMember) {
        if (user.governorConfig && user.governorConfig.isManualGuest) {
            user.isMember = true;
            user.tenant = {
                kingdomId: user.governorConfig.kingdomId,
                allowedKingdoms: []
            };
        } else {
            try {
                const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : '';
                await createPendingUser(user.id, user.username, avatarUrl);
            } catch (err) { }
            return NextResponse.json({ error: 'Access Denied: You must be a member of the Official Unity Discord Server. Your login attempt has been logged and is pending System Administrator approval.' }, { status: 403 });
        }
    }

    try {
        const usernameSafe = user.username.replace(/[^a-zA-Z0-9+=,.@_-]/g, '_');
        
        if (user.governorConfig) {
            if (user.governorConfig.role === 'Leader' || user.governorConfig.role === 'Premium') {
                user.isLeader = true;
            }
        }

        let policyDocument = {
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Action: user.isLeader ? [
                    "dynamodb:Query", "dynamodb:Scan", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:BatchWriteItem", "dynamodb:DeleteItem"
                ] : [
                    "dynamodb:Query", "dynamodb:Scan", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:BatchWriteItem", "dynamodb:UpdateItem"
                ],
                Resource: `arn:aws:dynamodb:${process.env.AWS_REGION}:*:table/${process.env.AWS_TABLE_NAME}`
            }]
        };

        const tenantAllowed = user.tenant && user.tenant.allowedKingdoms ? user.tenant.allowedKingdoms : [];
        const manualAllowed = user.governorConfig && user.governorConfig.allowedKingdoms ? user.governorConfig.allowedKingdoms : [];
        const isMasterTenant = user.tenant && user.tenant.guildId === '140018884157964429';

        let primaryKingdom = (user.governorConfig && user.governorConfig.kingdomId) || (user.tenant && user.tenant.kingdomId) || null;
        if (primaryKingdom && ['none', 'global', '*'].includes(primaryKingdom.toLowerCase())) {
            primaryKingdom = null;
        }
        
        const allPermittedKingdoms = new Set([...tenantAllowed, ...manualAllowed]);
        if (primaryKingdom) allPermittedKingdoms.add(primaryKingdom);

        if (isMasterTenant) {
            user.isLeader = true;
            policyDocument.Statement[0].Action = [ "dynamodb:*" ];
            allPermittedKingdoms.add('*');
        } else if (allPermittedKingdoms.size > 0) {
            const leadingKeys = Array.from(allPermittedKingdoms).flatMap(k => [
                `ROSTER#${k}`,
                `DATES#${k}`,
                `SCAN#${k}#*`,
                `SCAN_HEADERS#${k}#*`
            ]);
            leadingKeys.push('GOV_PROFILE#*', 'GLOBAL#KINGDOMS', 'GOV_HISTORY#*');

            if (user.isLeader) {
                leadingKeys.push('GLOBAL_TENANTS', 'GLOBAL_GUEST_PASSES', 'GLOBAL_PENDING_USERS', 'GLOBAL_APPROVED_USERS', 'USER#*');
            }

            policyDocument.Statement[0].Condition = {
                "ForAllValues:StringLike": {
                    "dynamodb:LeadingKeys": leadingKeys
                }
            };
        }

        const command = new GetFederationTokenCommand({
            Name: `UnityWebUser_${usernameSafe}`,
            Policy: JSON.stringify(policyDocument),
            DurationSeconds: 3600
        });

        const response = await stsClient.send(command);

        // Security Check: AI Kill Switch Logic
        // By default, everyone has access unless explicitly revoked at the User OR Guild level.
        let hasGlobalAiAccess = true;
        
        // 1. Check Personal Override
        if (user.governorConfig && user.governorConfig.globalAiAccess === false) {
            hasGlobalAiAccess = false;
        }
        
        // 2. Check Guild-Wide Override
        if (user.tenant && user.tenant.globalAiAccess === false) {
            hasGlobalAiAccess = false;
        }

        // 3. Super Admins bypass all kill switches
        if (user.isSuperAdmin) {
            hasGlobalAiAccess = true;
        }

        const globalGeminiKey = hasGlobalAiAccess ? await getGlobalConfig('GEMINI_API_KEY') : null;

        return NextResponse.json({
            credentials: {
                accessKeyId: response.Credentials.AccessKeyId,
                secretAccessKey: response.Credentials.SecretAccessKey,
                sessionToken: response.Credentials.SessionToken,
                expiration: response.Credentials.Expiration
            },
            role: user.isLeader ? 'Leader' : 'Member',
            tableName: process.env.AWS_TABLE_NAME,
            region: process.env.AWS_REGION,
            kingdomId: primaryKingdom,
            allowedKingdoms: Array.from(allPermittedKingdoms),
            governorIds: user.governorConfig ? user.governorConfig.governorIds : [],
            governorConfig: user.governorConfig || null,
            username: user.username,
            avatar: user.avatar,
            id: user.id,
            globalGeminiKey: globalGeminiKey
        });

    } catch (error) {
        console.error('STS Token Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate AWS credentials' }, { status: 500 });
    }
}
