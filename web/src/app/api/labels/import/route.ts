import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

// Verify admin token
async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.split("Bearer ")[1];

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
    return adminDoc.exists;
  } catch {
    return false;
  }
}

// Check for internal secret (for seeding)
function hasInternalSecret(req: Request): boolean {
  const secret = req.headers.get("x-import-secret");
  return secret === process.env.CRON_SECRET;
}

type LabelImport = {
  name: string;
  genres: string[];
  country?: string;
  website?: string;
  submissionUrl?: string;
  submissionEmail?: string;
  notes?: string;
};

/**
 * POST /api/labels/import
 * Bulk import labels (admin only or with secret)
 */
export async function POST(req: Request) {
  // Verify access
  const isAdmin = await verifyAdmin(req);
  const hasSecret = hasInternalSecret(req);

  if (!isAdmin && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const labels: LabelImport[] = body.labels;

    if (!labels || !Array.isArray(labels)) {
      return NextResponse.json({ error: "labels array required" }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get existing labels to check for duplicates
    const existingSnapshot = await adminDb.collection("labels").get();
    const existingNames = new Set(
      existingSnapshot.docs.map(doc => doc.data().name?.toLowerCase())
    );

    // Process labels in batches
    const batch = adminDb.batch();
    let batchCount = 0;

    for (const label of labels) {
      // Skip if no name
      if (!label.name) {
        results.skipped++;
        continue;
      }

      // Skip duplicates
      if (existingNames.has(label.name.toLowerCase())) {
        results.skipped++;
        continue;
      }

      // Determine submission method
      let submissionMethod: "email" | "webform" | "portal" | "none" = "none";
      if (label.submissionEmail) {
        submissionMethod = "email";
      } else if (label.submissionUrl) {
        submissionMethod = "webform";
      }

      // Create label document
      const docRef = adminDb.collection("labels").doc();
      batch.set(docRef, {
        name: label.name,
        genres: label.genres || [],
        country: label.country || null,
        website: label.website || null,
        submissionMethod,
        submissionEmail: label.submissionEmail || null,
        submissionUrl: label.submissionUrl || null,
        notes: label.notes || null,
        confidenceScore: 80, // Admin-imported
        addedBy: "admin",
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      existingNames.add(label.name.toLowerCase());
      batchCount++;
      results.imported++;

      // Commit batch every 500 labels
      if (batchCount >= 500) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      ...results,
      message: `Imported ${results.imported} labels, skipped ${results.skipped}`,
    });
  } catch (error: any) {
    console.error("[api/labels/import] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Import failed" },
      { status: 500 }
    );
  }
}
