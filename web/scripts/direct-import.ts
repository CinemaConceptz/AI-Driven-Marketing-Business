/**
 * Direct Firebase Import Script
 * Imports labels directly to Firestore using Admin SDK
 * 
 * Run: npx tsx scripts/direct-import.ts
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Initialize Firebase Admin with service account
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Try default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const db = admin.firestore();

interface LabelData {
  name: string;
  genres: string[];
  country: string;
  website: string;
  submissionUrl: string;
  submissionEmail: string;
  notes: string;
}

async function importLabels() {
  console.log("=== Direct Firebase Import ===\n");

  // Read the JSON file
  const jsonPath = path.join(__dirname, "labels-to-import.json");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const labels: LabelData[] = data.labels;

  console.log(`Found ${labels.length} labels to import\n`);

  // Check existing labels
  const existingSnapshot = await db.collection("labels").get();
  const existingNames = new Set(
    existingSnapshot.docs.map(doc => doc.data().name?.toLowerCase())
  );

  console.log(`Existing labels in DB: ${existingNames.size}\n`);

  let imported = 0;
  let skipped = 0;

  // Process in batches of 500
  const batch = db.batch();
  let batchCount = 0;

  for (const label of labels) {
    // Skip if already exists
    if (existingNames.has(label.name.toLowerCase())) {
      skipped++;
      continue;
    }

    // Determine submission method
    let submissionMethod: "email" | "webform" | "portal" | "none" = "none";
    if (label.submissionEmail) {
      submissionMethod = "email";
    } else if (label.submissionUrl) {
      submissionMethod = "webform";
    }

    const docRef = db.collection("labels").doc();
    batch.set(docRef, {
      name: label.name,
      genres: label.genres || [],
      country: label.country || null,
      website: label.website || null,
      submissionMethod,
      submissionEmail: label.submissionEmail || null,
      submissionUrl: label.submissionUrl || null,
      notes: label.notes || null,
      confidenceScore: 80,
      addedBy: "admin",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batchCount++;
    imported++;

    if (batchCount >= 500) {
      console.log(`Committing batch of ${batchCount}...`);
      await batch.commit();
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    console.log(`Committing final batch of ${batchCount}...`);
    await batch.commit();
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Total in DB: ${existingNames.size + imported}`);
}

importLabels()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Import failed:", err);
    process.exit(1);
  });
