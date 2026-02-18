import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  Link,
} from "@react-pdf/renderer";

// Register fonts (using system fonts for reliability)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

// Types
export type EpkPdfData = {
  artistName: string;
  tagline?: string;
  bio?: string;
  genre?: string;
  location?: string;
  contactEmail?: string;
  website?: string;
  quote?: string;
  achievements?: string[];
  stats?: {
    monthlyListeners?: number;
    followers?: number;
    tracks?: number;
  };
  links?: {
    spotify?: string;
    soundcloud?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  pressImages: { url: string; width: number; height: number }[];
  tier: "tier1" | "tier2" | "tier3";
  brandColor?: string;
  logoUrl?: string;
};

// Styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0a0a0a",
    padding: 40,
    fontFamily: "Helvetica",
    color: "#ffffff",
  },
  // Cover Page
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  coverTitle: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 4,
  },
  coverTagline: {
    fontSize: 16,
    color: "#10b981",
    marginBottom: 40,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  coverImage: {
    width: 300,
    height: 300,
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: 40,
  },
  coverContact: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 20,
  },
  // Bio Page
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  bioText: {
    fontSize: 12,
    color: "#e2e8f0",
    lineHeight: 1.8,
    marginBottom: 20,
  },
  quote: {
    fontSize: 14,
    color: "#10b981",
    fontStyle: "italic",
    paddingLeft: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    marginVertical: 20,
  },
  // Stats
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 30,
  },
  statBox: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    minWidth: 120,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#10b981",
  },
  statLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
    textTransform: "uppercase",
  },
  // Links
  linksContainer: {
    marginTop: 20,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  linkLabel: {
    fontSize: 12,
    color: "#94a3b8",
    width: 100,
  },
  linkValue: {
    fontSize: 12,
    color: "#10b981",
    textDecoration: "none",
  },
  // Press Images
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  pressImage: {
    width: "48%",
    height: 200,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 10,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#64748b",
  },
  pageNumber: {
    fontSize: 10,
    color: "#64748b",
  },
  // Watermark (Tier 1)
  watermark: {
    position: "absolute",
    top: "45%",
    left: "25%",
    fontSize: 48,
    color: "rgba(255, 255, 255, 0.08)",
    transform: "rotate(-30deg)",
  },
  // Logo (Tier 3)
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  // Genre badge
  genreBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  genreText: {
    fontSize: 10,
    color: "#000000",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  // Achievements
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  achievementBullet: {
    width: 6,
    height: 6,
    backgroundColor: "#10b981",
    borderRadius: 3,
    marginRight: 10,
  },
  achievementText: {
    fontSize: 11,
    color: "#e2e8f0",
  },
  // Contact section
  contactSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  contactInfo: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 6,
  },
});

// Cover Page Component
function CoverPage({ data }: { data: EpkPdfData }) {
  const accentColor = data.tier === "tier3" && data.brandColor ? data.brandColor : "#10b981";
  
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coverPage}>
        {/* Watermark for Tier 1 */}
        {data.tier === "tier1" && (
          <Text style={styles.watermark}>VERIFIED SOUND</Text>
        )}
        
        {/* Logo for Tier 3 */}
        {data.tier === "tier3" && data.logoUrl && (
          <Image src={data.logoUrl} style={styles.logo} />
        )}
        
        <Text style={styles.coverTitle}>{data.artistName}</Text>
        
        {data.tagline && (
          <Text style={[styles.coverTagline, { color: accentColor }]}>
            {data.tagline}
          </Text>
        )}
        
        {data.genre && (
          <View style={[styles.genreBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.genreText}>{data.genre}</Text>
          </View>
        )}
        
        {data.pressImages[0] && (
          <Image src={data.pressImages[0].url} style={styles.coverImage} />
        )}
        
        {data.contactEmail && (
          <Text style={styles.coverContact}>{data.contactEmail}</Text>
        )}
        
        {data.location && (
          <Text style={styles.coverContact}>{data.location}</Text>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Electronic Press Kit</Text>
        <Text style={styles.pageNumber}>1</Text>
      </View>
    </Page>
  );
}

// Bio Page Component
function BioPage({ data }: { data: EpkPdfData }) {
  const accentColor = data.tier === "tier3" && data.brandColor ? data.brandColor : "#10b981";
  
  return (
    <Page size="A4" style={styles.page}>
      {data.tier === "tier1" && (
        <Text style={styles.watermark}>VERIFIED SOUND</Text>
      )}
      
      <Text style={[styles.sectionTitle, { color: accentColor }]}>About</Text>
      
      {data.bio && (
        <Text style={styles.bioText}>{data.bio}</Text>
      )}
      
      {data.quote && (
        <Text style={[styles.quote, { borderLeftColor: accentColor, color: accentColor }]}>
          "{data.quote}"
        </Text>
      )}
      
      {data.achievements && data.achievements.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { fontSize: 16, color: accentColor }]}>
            Achievements
          </Text>
          {data.achievements.map((achievement, index) => (
            <View key={index} style={styles.achievementItem}>
              <View style={[styles.achievementBullet, { backgroundColor: accentColor }]} />
              <Text style={styles.achievementText}>{achievement}</Text>
            </View>
          ))}
        </View>
      )}
      
      {data.pressImages[1] && (
        <Image 
          src={data.pressImages[1].url} 
          style={{ 
            width: 200, 
            height: 200, 
            objectFit: "cover", 
            borderRadius: 8,
            marginTop: 20,
            alignSelf: "center",
          }} 
        />
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.pageNumber}>2</Text>
      </View>
    </Page>
  );
}

// Stats & Links Page Component
function StatsPage({ data }: { data: EpkPdfData }) {
  const accentColor = data.tier === "tier3" && data.brandColor ? data.brandColor : "#10b981";
  
  return (
    <Page size="A4" style={styles.page}>
      {data.tier === "tier1" && (
        <Text style={styles.watermark}>VERIFIED SOUND</Text>
      )}
      
      <Text style={[styles.sectionTitle, { color: accentColor }]}>Stats & Links</Text>
      
      {data.stats && (
        <View style={styles.statsContainer}>
          {data.stats.monthlyListeners !== undefined && (
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: accentColor }]}>
                {data.stats.monthlyListeners.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Monthly Listeners</Text>
            </View>
          )}
          {data.stats.followers !== undefined && (
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: accentColor }]}>
                {data.stats.followers.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
          )}
          {data.stats.tracks !== undefined && (
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: accentColor }]}>
                {data.stats.tracks}
              </Text>
              <Text style={styles.statLabel}>Tracks</Text>
            </View>
          )}
        </View>
      )}
      
      {data.links && (
        <View style={styles.linksContainer}>
          <Text style={[styles.sectionTitle, { fontSize: 16, color: accentColor }]}>
            Connect
          </Text>
          {data.links.spotify && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Spotify</Text>
              <Link src={data.links.spotify} style={styles.linkValue}>
                {data.links.spotify}
              </Link>
            </View>
          )}
          {data.links.soundcloud && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>SoundCloud</Text>
              <Link src={data.links.soundcloud} style={styles.linkValue}>
                {data.links.soundcloud}
              </Link>
            </View>
          )}
          {data.links.instagram && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Instagram</Text>
              <Link src={data.links.instagram} style={styles.linkValue}>
                {data.links.instagram}
              </Link>
            </View>
          )}
          {data.links.youtube && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>YouTube</Text>
              <Link src={data.links.youtube} style={styles.linkValue}>
                {data.links.youtube}
              </Link>
            </View>
          )}
          {data.links.website && (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Website</Text>
              <Link src={data.links.website} style={styles.linkValue}>
                {data.links.website}
              </Link>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Bookings & Inquiries</Text>
        {data.contactEmail && (
          <Text style={styles.contactInfo}>Email: {data.contactEmail}</Text>
        )}
        {data.website && (
          <Text style={styles.contactInfo}>Web: {data.website}</Text>
        )}
        {data.location && (
          <Text style={styles.contactInfo}>Based in: {data.location}</Text>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.pageNumber}>3</Text>
      </View>
    </Page>
  );
}

// Press Images Page Component
function PressImagesPage({ data }: { data: EpkPdfData }) {
  const accentColor = data.tier === "tier3" && data.brandColor ? data.brandColor : "#10b981";
  const images = data.pressImages.slice(0, 6); // Max 6 images
  
  if (images.length === 0) return null;
  
  return (
    <Page size="A4" style={styles.page}>
      {data.tier === "tier1" && (
        <Text style={styles.watermark}>VERIFIED SOUND</Text>
      )}
      
      <Text style={[styles.sectionTitle, { color: accentColor }]}>Press Images</Text>
      
      <View style={styles.imageGrid}>
        {images.map((img, index) => (
          <Image key={index} src={img.url} style={styles.pressImage} />
        ))}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.artistName} - EPK</Text>
        <Text style={styles.pageNumber}>4</Text>
      </View>
    </Page>
  );
}

// Main EPK PDF Document
export function EpkPdfDocument({ data }: { data: EpkPdfData }) {
  return (
    <Document
      title={`${data.artistName} - Electronic Press Kit`}
      author="Verified Sound A&R"
      subject="Artist Electronic Press Kit"
      creator="Verified Sound A&R"
    >
      <CoverPage data={data} />
      <BioPage data={data} />
      <StatsPage data={data} />
      {data.pressImages.length > 0 && <PressImagesPage data={data} />}
    </Document>
  );
}
