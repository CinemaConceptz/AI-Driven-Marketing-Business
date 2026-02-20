import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdmin";
import { getRequestIp, rateLimit } from "@/lib/rateLimit";

type EpkContent = {
  enhancedBio: string;
  tagline: string;
  pressRelease: string;
  highlights: string[];
  styleDescription: string;
};

type UserProfile = {
  artistName?: string;
  bio?: string;
  genre?: string;
  genres?: string[];
  location?: string;
  contactEmail?: string;
  email?: string;
  epkContent?: EpkContent;
  links?: {
    spotify?: string;
    soundcloud?: string;
    bandcamp?: string;
    appleMusic?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  subscriptionTier?: string;
};

function spellCheck(text: string): string {
  // Common misspellings dictionary
  const corrections: Record<string, string> = {
    "recieve": "receive",
    "occured": "occurred",
    "seperate": "separate",
    "definately": "definitely",
    "occurance": "occurrence",
    "accomodate": "accommodate",
    "acheive": "achieve",
    "aquire": "acquire",
    "begining": "beginning",
    "beleive": "believe",
    "concious": "conscious",
    "enviroment": "environment",
    "existance": "existence",
    "independant": "independent",
    "millenium": "millennium",
    "neccessary": "necessary",
    "noticable": "noticeable",
    "occurence": "occurrence",
    "persistant": "persistent",
    "posession": "possession",
    "priviledge": "privilege",
    "publically": "publicly",
    "recomend": "recommend",
    "refered": "referred",
    "relevent": "relevant",
    "rythm": "rhythm",
    "seige": "siege",
    "succesful": "successful",
    "supercede": "supersede",
    "suprise": "surprise",
    "tommorow": "tomorrow",
    "truely": "truly",
    "untill": "until",
    "wierd": "weird",
  };

  let corrected = text;
  for (const [wrong, right] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");
    corrected = corrected.replace(regex, right);
  }

  return corrected;
}

function generatePdfHtml(profile: UserProfile): string {
  const artistName = profile.artistName || "Artist";
  const genres = profile.genres?.length ? profile.genres.join(", ") : (profile.genre || "Music");
  const location = profile.location || "";
  const contactEmail = profile.contactEmail || profile.email || "";

  const epk = profile.epkContent;
  const bio = spellCheck(epk?.enhancedBio || profile.bio || "");
  const tagline = spellCheck(epk?.tagline || "");
  const pressRelease = spellCheck(epk?.pressRelease || "");
  const highlights = epk?.highlights || [];
  const styleDescription = spellCheck(epk?.styleDescription || "");

  const links = profile.links || {};

  // Build social links HTML
  const socialLinksHtml = [
    links.spotify && `<a href="${links.spotify}" style="color: #1DB954;">Spotify</a>`,
    links.soundcloud && `<a href="${links.soundcloud}" style="color: #FF5500;">SoundCloud</a>`,
    links.bandcamp && `<a href="${links.bandcamp}" style="color: #629AA9;">Bandcamp</a>`,
    links.appleMusic && `<a href="${links.appleMusic}" style="color: #FC3C44;">Apple Music</a>`,
    links.youtube && `<a href="${links.youtube}" style="color: #FF0000;">YouTube</a>`,
    links.instagram && `<a href="${links.instagram}" style="color: #E4405F;">Instagram</a>`,
    links.website && `<a href="${links.website}" style="color: #4A90D9;">Website</a>`,
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${artistName} - Electronic Press Kit</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      color: #ffffff;
      min-height: 100vh;
      padding: 40px;
      line-height: 1.6;
    }

    .epk-container {
      max-width: 800px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      padding: 48px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 48px;
      padding-bottom: 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .artist-name {
      font-size: 48px;
      font-weight: 700;
      letter-spacing: -1px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .tagline {
      font-size: 18px;
      color: #94a3b8;
      font-style: italic;
      margin-bottom: 16px;
    }

    .meta {
      font-size: 14px;
      color: #64748b;
    }

    .meta span {
      margin: 0 8px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #10B981;
      margin-bottom: 16px;
    }

    .bio {
      font-size: 16px;
      color: #e2e8f0;
      line-height: 1.8;
    }

    .style-box {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 24px;
      font-size: 15px;
      color: #a7f3d0;
      text-align: center;
      font-style: italic;
    }

    .highlights {
      list-style: none;
    }

    .highlights li {
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 15px;
      color: #cbd5e1;
      display: flex;
      align-items: center;
    }

    .highlights li:before {
      content: "✓";
      color: #10B981;
      font-weight: bold;
      margin-right: 12px;
    }

    .highlights li:last-child {
      border-bottom: none;
    }

    .press-release {
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid #10B981;
      padding: 24px;
      font-size: 15px;
      color: #cbd5e1;
      line-height: 1.7;
    }

    .contact-section {
      background: rgba(16, 185, 129, 0.05);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
    }

    .contact-email {
      font-size: 20px;
      font-weight: 600;
      color: #10B981;
      margin-bottom: 16px;
    }

    .social-links {
      font-size: 14px;
      color: #94a3b8;
    }

    .social-links a {
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .social-links a:hover {
      opacity: 0.8;
    }

    .footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 12px;
      color: #475569;
    }

    .verified-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      color: #10B981;
      font-weight: 500;
    }

    @media print {
      body {
        background: #ffffff;
        color: #000000;
        padding: 20px;
      }

      .epk-container {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: none;
      }

      .artist-name {
        background: none;
        -webkit-text-fill-color: #10B981;
        color: #10B981;
      }

      .tagline, .meta, .bio, .highlights li, .press-release {
        color: #374151;
      }

      .section-title {
        color: #10B981;
      }
    }
  </style>
</head>
<body>
  <div class="epk-container">
    <header class="header">
      <h1 class="artist-name">${artistName}</h1>
      ${tagline ? `<p class="tagline">"${tagline}"</p>` : ""}
      <p class="meta">
        <span>${genres}</span>
        ${location ? `<span>•</span><span>${location}</span>` : ""}
      </p>
    </header>

    ${styleDescription ? `
    <section class="section">
      <div class="style-box">
        ${styleDescription}
      </div>
    </section>
    ` : ""}

    <section class="section">
      <h2 class="section-title">Biography</h2>
      <p class="bio">${bio}</p>
    </section>

    ${highlights.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Highlights</h2>
      <ul class="highlights">
        ${highlights.map(h => `<li>${spellCheck(h)}</li>`).join("")}
      </ul>
    </section>
    ` : ""}

    ${pressRelease ? `
    <section class="section">
      <h2 class="section-title">Press Release</h2>
      <div class="press-release">
        ${pressRelease}
      </div>
    </section>
    ` : ""}

    <section class="section contact-section">
      <h2 class="section-title">Contact & Links</h2>
      ${contactEmail ? `<p class="contact-email">${contactEmail}</p>` : ""}
      ${socialLinksHtml ? `<p class="social-links">${socialLinksHtml}</p>` : ""}
    </section>

    <footer class="footer">
      <div class="verified-badge">
        <span>✓</span> Verified Sound A&R
      </div>
      <p style="margin-top: 12px;">Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    </footer>
  </div>
</body>
</html>
  `.trim();
}

export async function GET(req: Request) {
  try {
    const { uid } = await verifyAuth(req);
    const ip = getRequestIp(req);

    // Rate limit: 10 PDF downloads per hour
    const limit = rateLimit(`epk:pdf:${uid}:${ip}`, 10, 3600);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // Get user profile
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { ok: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    const profile = userDoc.data() as UserProfile;

    // Generate HTML for PDF
    const html = generatePdfHtml(profile);

    // Return HTML (client will use browser print or a PDF library)
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${profile.artistName || "artist"}-epk.html"`,
      },
    });

  } catch (error: any) {
    console.error("[epk/pdf] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate PDF" },
      { status: error?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
