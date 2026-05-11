import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGovernorNotes, addGovernorNote } from "@/lib/awsDynamo";

export const maxDuration = 300;

export async function GET(req) {
  try {
    const session = await auth();
    // Only Leaders and SuperAdmins can view intelligence notes
    if (!session || (!session.user.isLeader && !session.user.isSuperAdmin)) {
      return NextResponse.json({ error: "Unauthorized. Leadership clearance required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const govId = searchParams.get("govId");

    if (!govId) {
      return NextResponse.json({ error: "Missing govId parameter." }, { status: 400 });
    }

    const data = await getGovernorNotes(govId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("[API/AWS/Notes] GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving notes." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    // Only Leaders and SuperAdmins can add intelligence notes
    if (!session || (!session.user.isLeader && !session.user.isSuperAdmin)) {
      return NextResponse.json({ error: "Unauthorized. Leadership clearance required." }, { status: 403 });
    }

    const body = await req.json();
    const { govId, tag, noteText } = body;

    if (!govId || (!tag && !noteText)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const payload = {
      tag: tag?.trim(),
      noteText: noteText?.trim(),
      authorName: session.user.name || session.user.username || "Unknown R4",
      authorId: session.user.id
    };

    const success = await addGovernorNote(govId, payload);

    if (success) {
      return NextResponse.json({ success: true, message: "Note appended successfully." }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Failed to append note." }, { status: 500 });
    }
  } catch (error) {
    console.error("[API/AWS/Notes] POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error adding note." }, { status: 500 });
  }
}
