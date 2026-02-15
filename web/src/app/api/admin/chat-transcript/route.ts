import { NextResponse } from "next/server";
import { adminDb, verifyAuth } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const { uid } = await verifyAuth(req);

    // Check if user is admin
    const adminRef = adminDb.collection("admins").doc(uid);
    const adminSnap = await adminRef.get();
    
    if (!adminSnap.exists()) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Get userId from query params
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId parameter" }, { status: 400 });
    }

    // Fetch chat messages
    const chatRef = adminDb.collection("intakeChats").doc(userId);
    const messagesRef = chatRef.collection("messages");
    
    const messagesSnap = await messagesRef
      .orderBy("createdAt", "asc")
      .limit(100)
      .get();

    const messages = messagesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        extractedData: data.extractedData || null,
      };
    });

    // Fetch intake profile
    const profileRef = adminDb.collection("intakeProfiles").doc(userId);
    const profileSnap = await profileRef.get();
    const profile = profileSnap.exists() ? profileSnap.data() : null;

    return NextResponse.json({
      ok: true,
      messages,
      profile,
    });
  } catch (error: any) {
    console.error("[admin/chat-transcript]", error?.message || error);
    
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: "Failed to fetch chat transcript" },
      { status: 500 }
    );
  }
}
