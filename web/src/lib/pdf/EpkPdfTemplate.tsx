import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";

// ============================================
// TYPES
// ============================================

export type EpkTier = "tier1" | "tier2" | "tier3";

export type TrackInfo = {
  title: string;
  description?: string;
  streamingUrl?: string;
  qrCodeDataUrl?: string; // Base64 QR code image
};

export type PressQuote = {
  quote: string;
  source: string;
  logoUrl?: string;
};

export type EpkBrandSettings = {
  accentColor: string;
  backgroundColor: "dark" | "light" | "custom";
  customBgColor?: string;
  fontStyle: "modern" | "editorial" | "minimal";
  logoUrl?: string;
};

export type EpkStats = {
  monthlyListeners?: number;
  totalStreams?: number;
  followers?: number;
  tracks?: number;
  venues?: string[];
  awards?: string[];
};

export type EpkPdfData = {
  // Core info
  artistName: string;
  tagline?: string;
  bio?: string;
  genre?: string;
  location?: string;
  contactEmail?: string;
  website?: string;
  
  // Enhanced content
  quote?: string;
  achievements?: string[];
  tracks?: TrackInfo[];
  pressQuotes?: PressQuote[];
  stats?: EpkStats;
  
  // Social links
  links?: {
    spotify?: string;
    soundcloud?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  
  // Media
  pressImages: { url: string; width: number; height: number }[];
  
  // Tier & Branding
  tier: EpkTier;
  brandSettings?: EpkBrandSettings;
};

// ============================================
// COLOR SCHEMES BY TIER
// ============================================

const getColors = (tier: EpkTier, brandSettings?: EpkBrandSettings) => {
  // Tier III uses custom brand settings
  if (tier === "tier3" && brandSettings) {
    const bgMode = brandSettings.backgroundColor;
    return {
      background: bgMode === "dark" ? "#0a0a0a" : bgMode === "light" ? "#ffffff" : brandSettings.customBgColor || "#0a0a0a",
      text: bgMode === "light" ? "#1a1a1a" : "#ffffff",
      textSecondary: bgMode === "light" ? "#64748b" : "#94a3b8",
      accent: brandSettings.accentColor || "#10b981",
      cardBg: bgMode === "light" ? "#f1f5f9" : "#1a1a2e",
    };
  }
  
  // Tier II uses dark theme with accent
  if (tier === "tier2") {
    return {
      background: "#0a0a0a",
      text: "#ffffff",
      textSecondary: "#94a3b8",
      accent: "#10b981",
      cardBg: "#1a1a2e",
    };
  }
  
  // Tier I uses clean black/white
  return {
    background: "#ffffff",
    text: "#1a1a1a",
    textSecondary: "#64748b",
    accent: "#1a1a1a",
    cardBg: "#f8fafc",
  };
};

// ============================================
// TIER I — BASIC TEMPLATE (Clean, Minimal)
// ============================================

const tier1Styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 50,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 30,
  },
  heroImage: {
    width: 250,
    height: 250,
    objectFit: "cover",
    marginBottom: 30,
  },
  contact: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  bioText: {
    fontSize: 11,
    lineHeight: 1.7,
    color: "#374151",
  },
  trackItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  trackTitle: {
    fontSize: 12,
    fontWeight: "bold",
  },
  trackLink: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridImage: {
    width: "48%",
    height: 150,
    objectFit: "cover",
  },
  watermark: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#cbd5e1",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 9,
    color: "#94a3b8",
  },
});

function Tier1Cover({ data }: { data: EpkPdfData }) {
  return (
    <Page size="A4" style={tier1Styles.page}>
      <View style={tier1Styles.coverPage}>
        <Text style={tier1Styles.title}>{data.artistName}</Text>
        {data.tagline && <Text style={tier1Styles.tagline}>{data.tagline}</Text>}
        {data.pressImages[0] && (
          <Image src={data.pressImages[0].url} style={tier1Styles.heroImage} />
        )}
        {data.contactEmail && <Text style={tier1Styles.contact}>{data.contactEmail}</Text>}
        {data.location && <Text style={tier1Styles.contact}>{data.location}</Text>}
      </View>
      <Text style={tier1Styles.watermark}>Powered by Verified Sound</Text>
    </Page>
  );
}

function Tier1Bio({ data }: { data: EpkPdfData }) {
  return (
    <Page size="A4" style={tier1Styles.page}>
      <Text style={tier1Styles.sectionTitle}>About</Text>
      {data.bio && <Text style={tier1Styles.bioText}>{data.bio}</Text>}
      {data.pressImages[1] && (
        <Image
          src={data.pressImages[1].url}
          style={{ width: 150, height: 150, objectFit: "cover", marginTop: 20 }}
        />
      )}
      <View style={tier1Styles.footer}>
        <Text style={tier1Styles.footerText}>{data.artistName}</Text>
        <Text style={tier1Styles.footerText}>2</Text>
      </View>
      <Text style={tier1Styles.watermark}>Powered by Verified Sound</Text>
    </Page>
  );
}

function Tier1Music({ data }: { data: EpkPdfData }) {
  if (!data.tracks || data.tracks.length === 0) return null;
  
  return (
    <Page size="A4" style={tier1Styles.page}>
      <Text style={tier1Styles.sectionTitle}>Music</Text>
      {data.tracks.slice(0, 3).map((track, idx) => (
        <View key={idx} style={tier1Styles.trackItem}>
          <Text style={tier1Styles.trackTitle}>{track.title}</Text>
          {track.streamingUrl && (
            <Link src={track.streamingUrl} style={tier1Styles.trackLink}>
              {track.streamingUrl}
            </Link>
          )}
        </View>
      ))}
      <View style={tier1Styles.footer}>
        <Text style={tier1Styles.footerText}>{data.artistName}</Text>
        <Text style={tier1Styles.footerText}>3</Text>
      </View>
      <Text style={tier1Styles.watermark}>Powered by Verified Sound</Text>
    </Page>
  );
}

function Tier1Images({ data }: { data: EpkPdfData }) {
  const images = data.pressImages.slice(0, 4);
  if (images.length === 0) return null;
  
  return (
    <Page size="A4" style={tier1Styles.page}>
      <Text style={tier1Styles.sectionTitle}>Press Images</Text>
      <View style={tier1Styles.imageGrid}>
        {images.map((img, idx) => (
          <Image key={idx} src={img.url} style={tier1Styles.gridImage} />
        ))}
      </View>
      <View style={tier1Styles.footer}>
        <Text style={tier1Styles.footerText}>{data.artistName}</Text>
        <Text style={tier1Styles.footerText}>4</Text>
      </View>
      <Text style={tier1Styles.watermark}>Powered by Verified Sound</Text>
    </Page>
  );
}

// ============================================
// TIER II — PROFESSIONAL TEMPLATE
// ============================================

const createTier2Styles = (colors: ReturnType<typeof getColors>) => StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    padding: 40,
    fontFamily: "Helvetica",
    color: colors.text,
  },
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: colors.accent,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 30,
  },
  genreBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 25,
  },
  genreText: {
    fontSize: 10,
    color: colors.background === "#0a0a0a" ? "#000000" : "#ffffff",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  heroImage: {
    width: 280,
    height: 280,
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: 30,
  },
  contact: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  divider: {
    height: 2,
    backgroundColor: colors.accent,
    width: 60,
    marginVertical: 25,
    alignSelf: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.accent,
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  bioText: {
    fontSize: 11,
    lineHeight: 1.8,
    color: colors.text,
  },
  quote: {
    fontSize: 13,
    fontStyle: "italic",
    color: colors.accent,
    paddingLeft: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    marginVertical: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 25,
  },
  statBox: {
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    minWidth: 110,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.accent,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: "uppercase",
  },
  trackItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: colors.cardBg,
    borderRadius: 8,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.text,
  },
  trackDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  trackLink: {
    fontSize: 10,
    color: colors.accent,
    marginTop: 6,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridImage: {
    width: "48%",
    height: 170,
    objectFit: "cover",
    borderRadius: 6,
  },
  linksContainer: {
    marginTop: 25,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.cardBg,
    borderRadius: 6,
  },
  linkLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    width: 90,
  },
  linkValue: {
    fontSize: 11,
    color: colors.accent,
    textDecoration: "none",
  },
  contactSection: {
    marginTop: 25,
    padding: 20,
    backgroundColor: colors.cardBg,
    borderRadius: 8,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 12,
  },
  contactInfo: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
});

function Tier2Cover({ data, styles }: { data: EpkPdfData; styles: ReturnType<typeof createTier2Styles> }) {
  const colors = getColors(data.tier, data.brandSettings);
  
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coverPage}>
        <Text style={styles.title}>{data.artistName}</Text>
        {data.tagline && <Text style={styles.tagline}>{data.tagline}</Text>}
        {data.genre && (
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{data.genre}</Text>
          </View>
        )}
        {data.pressImages[0] && (
          <Image src={data.pressImages[0].url} style={styles.heroImage} />
        )}
        <View style={styles.divider} />
        {data.contactEmail && <Text style={styles.contact}>{data.contactEmail}</Text>}
        {data.location && <Text style={styles.contact}>{data.location}</Text>}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Electronic Press Kit</Text>
        <Text style={styles.footerText}>1</Text>
      </View>
    </Page>
  );
}

function Tier2Bio({ data, styles }: { data: EpkPdfData; styles: ReturnType<typeof createTier2Styles> }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>About</Text>
      {data.bio && <Text style={styles.bioText}>{data.bio}</Text>}
      {data.quote && <Text style={styles.quote}>"{data.quote}"</Text>}
      
      {data.achievements && data.achievements.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { fontSize: 14 }]}>Achievements</Text>
          {data.achievements.map((achievement, idx) => (
            <View key={idx} style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ color: getColors(data.tier, data.brandSettings).accent, marginRight: 8 }}>•</Text>
              <Text style={{ fontSize: 10, color: getColors(data.tier, data.brandSettings).text }}>{achievement}</Text>
            </View>
          ))}
        </View>
      )}
      
      {data.pressImages[1] && (
        <Image
          src={data.pressImages[1].url}
          style={{ width: 180, height: 180, objectFit: "cover", borderRadius: 8, marginTop: 20, alignSelf: "center" }}
        />
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.footerText}>2</Text>
      </View>
    </Page>
  );
}

function Tier2Stats({ data, styles }: { data: EpkPdfData; styles: ReturnType<typeof createTier2Styles> }) {
  const colors = getColors(data.tier, data.brandSettings);
  
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Stats & Connect</Text>
      
      {data.stats && (
        <View style={styles.statsContainer}>
          {data.stats.monthlyListeners !== undefined && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.stats.monthlyListeners.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Monthly Listeners</Text>
            </View>
          )}
          {data.stats.followers !== undefined && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.stats.followers.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
          )}
          {data.stats.tracks !== undefined && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.stats.tracks}</Text>
              <Text style={styles.statLabel}>Tracks</Text>
            </View>
          )}
        </View>
      )}
      
      {data.links && (
        <View style={styles.linksContainer}>
          {data.links.spotify && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Spotify</Text>
              <Link src={data.links.spotify} style={styles.linkValue}>{data.links.spotify}</Link>
            </View>
          )}
          {data.links.soundcloud && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>SoundCloud</Text>
              <Link src={data.links.soundcloud} style={styles.linkValue}>{data.links.soundcloud}</Link>
            </View>
          )}
          {data.links.instagram && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Instagram</Text>
              <Link src={data.links.instagram} style={styles.linkValue}>{data.links.instagram}</Link>
            </View>
          )}
          {data.links.youtube && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>YouTube</Text>
              <Link src={data.links.youtube} style={styles.linkValue}>{data.links.youtube}</Link>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Bookings & Inquiries</Text>
        {data.contactEmail && <Text style={styles.contactInfo}>Email: {data.contactEmail}</Text>}
        {data.website && <Text style={styles.contactInfo}>Web: {data.website}</Text>}
        {data.location && <Text style={styles.contactInfo}>Based in: {data.location}</Text>}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.footerText}>3</Text>
      </View>
    </Page>
  );
}

function Tier2Music({ data, styles }: { data: EpkPdfData; styles: ReturnType<typeof createTier2Styles> }) {
  if (!data.tracks || data.tracks.length === 0) return null;
  
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Music</Text>
      {data.tracks.slice(0, 5).map((track, idx) => (
        <View key={idx} style={styles.trackItem}>
          <Text style={styles.trackTitle}>{track.title}</Text>
          {track.description && <Text style={styles.trackDesc}>{track.description}</Text>}
          {track.streamingUrl && (
            <Link src={track.streamingUrl} style={styles.trackLink}>{track.streamingUrl}</Link>
          )}
          {track.qrCodeDataUrl && data.tier !== "tier1" && (
            <Image src={track.qrCodeDataUrl} style={{ width: 60, height: 60, marginTop: 8 }} />
          )}
        </View>
      ))}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.footerText}>4</Text>
      </View>
    </Page>
  );
}

function Tier2Images({ data, styles }: { data: EpkPdfData; styles: ReturnType<typeof createTier2Styles> }) {
  const images = data.pressImages.slice(0, 6);
  if (images.length === 0) return null;
  
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Press Images</Text>
      <View style={styles.imageGrid}>
        {images.map((img, idx) => (
          <Image key={idx} src={img.url} style={styles.gridImage} />
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.footerText}>5</Text>
      </View>
    </Page>
  );
}

// ============================================
// TIER III — ADVANCED TEMPLATE (Premium)
// ============================================

function Tier3PressQuotes({ data, styles }: { data: EpkPdfData; styles: ReturnType<typeof createTier2Styles> }) {
  if (!data.pressQuotes || data.pressQuotes.length === 0) return null;
  const colors = getColors(data.tier, data.brandSettings);
  
  return (
    <Page size="A4" style={styles.page}>
      {data.brandSettings?.logoUrl && (
        <Image
          src={data.brandSettings.logoUrl}
          style={{ width: 50, height: 50, position: "absolute", top: 30, right: 40 }}
        />
      )}
      <Text style={styles.sectionTitle}>Press</Text>
      {data.pressQuotes.map((pq, idx) => (
        <View key={idx} style={{ marginBottom: 25, padding: 20, backgroundColor: colors.cardBg, borderRadius: 8 }}>
          <Text style={{ fontSize: 13, fontStyle: "italic", color: colors.text, lineHeight: 1.6 }}>
            "{pq.quote}"
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            {pq.logoUrl && (
              <Image src={pq.logoUrl} style={{ width: 30, height: 30, marginRight: 10 }} />
            )}
            <Text style={{ fontSize: 11, color: colors.accent, fontWeight: "bold" }}>{pq.source}</Text>
          </View>
        </View>
      ))}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.footerText}>6</Text>
      </View>
    </Page>
  );
}

function Tier3Highlights({ data, styles }: { data: EpkPdfData; styles: ReturnType<typeof createTier2Styles> }) {
  const colors = getColors(data.tier, data.brandSettings);
  const stats = data.stats;
  
  if (!stats?.venues?.length && !stats?.awards?.length) return null;
  
  return (
    <Page size="A4" style={styles.page}>
      {data.brandSettings?.logoUrl && (
        <Image
          src={data.brandSettings.logoUrl}
          style={{ width: 50, height: 50, position: "absolute", top: 30, right: 40 }}
        />
      )}
      <Text style={styles.sectionTitle}>Highlights</Text>
      
      {stats.venues && stats.venues.length > 0 && (
        <View style={{ marginBottom: 25 }}>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.accent, marginBottom: 12 }}>Notable Venues</Text>
          {stats.venues.map((venue, idx) => (
            <View key={idx} style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ color: colors.accent, marginRight: 8 }}>★</Text>
              <Text style={{ fontSize: 11, color: colors.text }}>{venue}</Text>
            </View>
          ))}
        </View>
      )}
      
      {stats.awards && stats.awards.length > 0 && (
        <View>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.accent, marginBottom: 12 }}>Awards & Recognition</Text>
          {stats.awards.map((award, idx) => (
            <View key={idx} style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ color: colors.accent, marginRight: 8 }}>🏆</Text>
              <Text style={{ fontSize: 11, color: colors.text }}>{award}</Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.footerText}>7</Text>
      </View>
    </Page>
  );
}

// ============================================
// MAIN DOCUMENT COMPONENT
// ============================================

export function EpkPdfDocument({ data }: { data: EpkPdfData }) {
  const colors = getColors(data.tier, data.brandSettings);
  const tier2Styles = createTier2Styles(colors);
  
  // TIER I — Basic (3-4 pages, minimal, watermarked)
  if (data.tier === "tier1") {
    return (
      <Document
        title={`${data.artistName} - Electronic Press Kit`}
        author="Verified Sound A&R"
        subject="Artist Electronic Press Kit"
        creator="Verified Sound A&R"
      >
        <Tier1Cover data={data} />
        <Tier1Bio data={data} />
        <Tier1Music data={data} />
        <Tier1Images data={data} />
      </Document>
    );
  }
  
  // TIER II — Professional (5 pages, enhanced styling, no watermark)
  if (data.tier === "tier2") {
    return (
      <Document
        title={`${data.artistName} - Electronic Press Kit`}
        author="Verified Sound A&R"
        subject="Artist Electronic Press Kit"
        creator="Verified Sound A&R"
      >
        <Tier2Cover data={data} styles={tier2Styles} />
        <Tier2Bio data={data} styles={tier2Styles} />
        <Tier2Stats data={data} styles={tier2Styles} />
        <Tier2Music data={data} styles={tier2Styles} />
        <Tier2Images data={data} styles={tier2Styles} />
      </Document>
    );
  }
  
  // TIER III — Advanced (6-7 pages, full branding, all features)
  return (
    <Document
      title={`${data.artistName} - Electronic Press Kit`}
      author={data.artistName}
      subject="Artist Electronic Press Kit"
      creator={data.artistName}
    >
      <Tier2Cover data={data} styles={tier2Styles} />
      <Tier2Bio data={data} styles={tier2Styles} />
      <Tier2Stats data={data} styles={tier2Styles} />
      <Tier2Music data={data} styles={tier2Styles} />
      <Tier3PressQuotes data={data} styles={tier2Styles} />
      <Tier3Highlights data={data} styles={tier2Styles} />
      <Tier2Images data={data} styles={tier2Styles} />
    </Document>
  );
}
