import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getLabels, addLabel, updateLabel, getUserLabels } from "@/lib/submissions/queries";
import type { Label } from "@/lib/submissions";

// Verify user token
async function verifyUser(req: Request): Promise<{ uid: string; isAdmin: boolean } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    
    // Check if admin
    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
    
    return {
      uid: decoded.uid,
      isAdmin: adminDoc.exists,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/labels
 * Get labels (filtered by genre, method, etc.)
 */
export async function GET(req: Request) {
  const user = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const genre = searchParams.get("genre") || undefined;
  const method = searchParams.get("method") || undefined;
  const userOnly = searchParams.get("userOnly") === "true";
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    let labels: Label[];

    if (userOnly) {
      // Get only labels added by this user
      labels = await getUserLabels(user.uid);
    } else {
      // Get all active labels
      labels = await getLabels({
        genre,
        method,
        activeOnly: true,
        limit,
      });

      // Also include user's custom labels
      const userLabels = await getUserLabels(user.uid);
      
      // Merge and dedupe
      const labelIds = new Set(labels.map(l => l.id));
      for (const ul of userLabels) {
        if (!labelIds.has(ul.id)) {
          labels.push(ul);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      labels,
      count: labels.length,
    });
  } catch (error: any) {
    console.error("[api/labels] GET error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch labels" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/labels
 * Add a new label (user-added or admin-added)
 */
export async function POST(req: Request) {
  const user = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.submissionMethod) {
      return NextResponse.json(
        { error: "Name and submission method are required" },
        { status: 400 }
      );
    }

    // Validate submission method has required data
    if (body.submissionMethod === "email" && !body.submissionEmail) {
      return NextResponse.json(
        { error: "Email address is required for email submissions" },
        { status: 400 }
      );
    }

    if (body.submissionMethod === "webform" && !body.submissionUrl) {
      return NextResponse.json(
        { error: "URL is required for webform submissions" },
        { status: 400 }
      );
    }

    const label: Omit<Label, "id"> = {
      name: body.name,
      genres: body.genres || [],
      submissionMethod: body.submissionMethod,
      submissionEmail: body.submissionEmail || undefined,
      submissionUrl: body.submissionUrl || undefined,
      requiredFields: body.requiredFields || [],
      fileRequirements: body.fileRequirements || {},
      notes: body.notes || undefined,
      website: body.website || undefined,
      country: body.country || undefined,
      confidenceScore: user.isAdmin ? 100 : 50, // Admin-added labels are more trusted
      addedBy: user.isAdmin ? "admin" : "user",
      userId: user.isAdmin ? undefined : user.uid,
      isActive: true,
    };

    const labelId = await addLabel(label);

    return NextResponse.json({
      ok: true,
      labelId,
      message: "Label added successfully",
    });
  } catch (error: any) {
    console.error("[api/labels] POST error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to add label" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/labels
 * Update a label (admin only, or user can update their own)
 */
export async function PATCH(req: Request) {
  const user = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { labelId, ...updates } = body;

    if (!labelId) {
      return NextResponse.json({ error: "Label ID required" }, { status: 400 });
    }

    // Check ownership
    const labelDoc = await adminDb.collection("labels").doc(labelId).get();
    if (!labelDoc.exists) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    const labelData = labelDoc.data()!;
    
    // Only admin or label owner can update
    if (!user.isAdmin && labelData.userId !== user.uid) {
      return NextResponse.json({ error: "Not authorized to update this label" }, { status: 403 });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.addedBy;
    delete updates.userId;
    delete updates.createdAt;

    await updateLabel(labelId, updates);

    return NextResponse.json({
      ok: true,
      message: "Label updated successfully",
    });
  } catch (error: any) {
    console.error("[api/labels] PATCH error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to update label" },
      { status: 500 }
    );
  }
}
