/**
 * Label Import Script
 * Run: npx tsx scripts/import-labels.ts
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// File URLs to download
const EXCEL_FILES = [
  {
    url: "https://customer-assets.emergentagent.com/job_008038fc-fa27-4065-826b-e358eb3bfb8a/artifacts/spx3t1c0_REAL_200_Plus_Indie_Labels_Segmented.xlsx",
    name: "REAL_200_Plus_Indie_Labels_Segmented.xlsx"
  },
  {
    url: "https://customer-assets.emergentagent.com/job_008038fc-fa27-4065-826b-e358eb3bfb8a/artifacts/anhascx3_200_Plus_Indie_Label_Demo_Submissions.xlsx",
    name: "200_Plus_Indie_Label_Demo_Submissions.xlsx"
  },
  {
    url: "https://customer-assets.emergentagent.com/job_008038fc-fa27-4065-826b-e358eb3bfb8a/artifacts/feaguikp_Indie_Label_Demo_Submission_List.xlsx",
    name: "Indie_Label_Demo_Submission_List.xlsx"
  }
];

interface LabelRow {
  "Label Name"?: string;
  "Genre"?: string;
  "Primary Genres"?: string;
  "Country"?: string;
  "Website"?: string;
  "Submission / Contact Page"?: string;
  "Submission Link / Contact Page"?: string;
  "Public Email (if listed)"?: string;
  "Notes"?: string;
}

interface ProcessedLabel {
  name: string;
  genres: string[];
  country: string;
  website: string;
  submissionUrl: string;
  submissionEmail: string;
  notes: string;
}

async function downloadFile(url: string, filename: string): Promise<Buffer> {
  console.log(`Downloading ${filename}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${filename}`);
  return Buffer.from(await response.arrayBuffer());
}

function parseExcel(buffer: Buffer): LabelRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<LabelRow>(sheet);
}

function normalizeGenres(genreString: string | undefined): string[] {
  if (!genreString) return [];
  
  // Split by common delimiters
  return genreString
    .split(/[\/,;]+/)
    .map(g => g.trim())
    .filter(g => g.length > 0 && g !== "Multi-Genre");
}

function processRow(row: LabelRow): ProcessedLabel | null {
  const name = row["Label Name"]?.trim();
  if (!name) return null;
  
  // Skip placeholder labels
  if (name.startsWith("Independent Label")) return null;

  const genres = normalizeGenres(row["Genre"] || row["Primary Genres"]);
  const country = row["Country"]?.trim() || "";
  const website = row["Website"]?.trim() || "";
  const submissionUrl = (row["Submission / Contact Page"] || row["Submission Link / Contact Page"])?.trim() || "";
  const submissionEmail = row["Public Email (if listed)"]?.trim() || "";
  const notes = row["Notes"]?.trim() || "";

  return {
    name,
    genres,
    country,
    website,
    submissionUrl,
    submissionEmail,
    notes,
  };
}

async function main() {
  console.log("=== Label Import Script ===\n");

  const allLabels: ProcessedLabel[] = [];
  const seenNames = new Set<string>();

  for (const file of EXCEL_FILES) {
    try {
      const buffer = await downloadFile(file.url, file.name);
      const rows = parseExcel(buffer);
      
      console.log(`Processing ${file.name}: ${rows.length} rows`);

      for (const row of rows) {
        const label = processRow(row);
        if (label && !seenNames.has(label.name.toLowerCase())) {
          allLabels.push(label);
          seenNames.add(label.name.toLowerCase());
        }
      }
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
    }
  }

  console.log(`\nTotal unique labels: ${allLabels.length}`);

  // Group by genre for summary
  const genreCounts: Record<string, number> = {};
  for (const label of allLabels) {
    for (const genre of label.genres) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }
  }

  console.log("\nGenre breakdown:");
  Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([genre, count]) => {
      console.log(`  ${genre}: ${count}`);
    });

  // Count with emails
  const withEmail = allLabels.filter(l => l.submissionEmail).length;
  console.log(`\nLabels with submission email: ${withEmail}`);

  // Output JSON for import
  const outputPath = path.join(__dirname, "labels-to-import.json");
  fs.writeFileSync(outputPath, JSON.stringify({ labels: allLabels }, null, 2));
  console.log(`\nSaved to ${outputPath}`);

  // Also output a curl command for easy import
  console.log("\n=== To import, run: ===");
  console.log(`curl -X POST "YOUR_URL/api/labels/import" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "x-import-secret: YOUR_CRON_SECRET" \\`);
  console.log(`  -d @${outputPath}`);
}

main().catch(console.error);
