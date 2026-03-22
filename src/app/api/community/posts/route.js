import { auth } from "@/lib/auth";
import { createCommunityPost, getCommunityPosts } from "@/lib/awsDynamo";
import { NextResponse } from "next/server";

/**
 * GET /api/community/posts
 * Public read — anyone can see the bulletin board.
 */
export async function GET() {
  try {
    const posts = await getCommunityPosts();
    return NextResponse.json({ posts });
  } catch (e) {
    console.error("[Community] GET Error:", e);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

/**
 * POST /api/community/posts
 * Authenticated write — must be a signed-in user.
 */
export async function POST(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.trim().length > 500) {
      return NextResponse.json({ error: "Message exceeds 500 characters" }, { status: 400 });
    }

    const postData = {
      type: type || "Message",
      name: session.user?.name || "Anonymous",
      message: message.trim(),
    };

    const result = await createCommunityPost(postData);
    return NextResponse.json({ success: true, post: result }, { status: 201 });
  } catch (e) {
    console.error("[Community] POST Error:", e);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
