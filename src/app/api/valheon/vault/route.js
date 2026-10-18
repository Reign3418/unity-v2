import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * Server-Side Zero-Trust Gate for the Valheon 95-Dossier Knowledge Vault
 * ----------------------------------------------------------------------
 * The 95 synthesized dossiers and tactical meta JSON live in `src/data/private-vault/`
 * (outside Next.js `public/`) and are ONLY served after cryptographic NextAuth
 * session verification confirms the caller is the Principal Systems Architect.
 */
export async function GET(req) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Server-side session required.' },
        { status: 401 }
      );
    }

    const uname = (session.user.username || session.user.name || '').toLowerCase();
    const uemail = (session.user.email || '').toLowerCase();
    const isFounder =
      Boolean(session.user.isValheonFounder) ||
      uname === 'reign3418' ||
      uname === 'reign' ||
      uemail === 'lauren.alvarado@gmail.com';

    if (!isFounder) {
      return NextResponse.json(
        {
          error:
            'Forbidden. This Sovereign Knowledge Vault is restricted to the Principal Systems Architect.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'guides';

    const fileName =
      type === 'meta'
        ? 'valheon_tactical_meta.json'
        : 'valheon_95_sovereign_dossiers.json';

    const vaultPath = path.join(
      process.cwd(),
      'src',
      'data',
      'private-vault',
      fileName
    );

    if (!fs.existsSync(vaultPath)) {
      return NextResponse.json(
        { error: 'Requested vault artifact not found on server.' },
        { status: 404 }
      );
    }

    const payload = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'X-Valheon-Security': 'Server-Verified-Founder-Gate',
      },
    });
  } catch (err) {
    console.error('[API/Valheon/Vault] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error reading private vault.' },
      { status: 500 }
    );
  }
}
