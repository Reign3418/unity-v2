import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_DOCS = new Set([
  'Unity_V2_System_Architecture_Guide.pdf',
  'Unity_V2_Executive_Blueprint.pdf',
]);

export async function GET(req) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please authenticate to download system documentation.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedFile = searchParams.get('file') || 'Unity_V2_System_Architecture_Guide.pdf';

    if (!ALLOWED_DOCS.has(requestedFile)) {
      return NextResponse.json({ error: 'Invalid document requested.' }, { status: 400 });
    }

    const filePath = path.join(
      process.cwd(),
      'src',
      'data',
      'private-vault',
      'docs',
      requestedFile
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Document not found on server.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${requestedFile}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[API/Valheon/Docs] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
