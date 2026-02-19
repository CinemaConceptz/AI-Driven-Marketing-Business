/**
 * Submission System Types and Utilities
 * Core infrastructure for A&R submission system
 */

import { SubscriptionTier, normalizeTier, isSubscriptionActive } from "./subscription";

// ============================================
// TYPES
// ============================================

export type SubmissionMethod = "email" | "webform" | "portal" | "none";

export type SubmissionStatus = 
  | "pending"      // In campaign queue
  | "sent"         // Email sent or form submitted
  | "delivered"    // Email confirmed delivered
  | "bounced"      // Email bounced
  | "opened"       // Email opened (if tracking)
  | "replied"      // Got a response
  | "rejected"     // Label rejected
  | "signed"       // Success! Label interest
  | "failed";      // Submission failed

export type CampaignStatus = 
  | "draft"        // Being prepared
  | "active"       // Submissions in progress
  | "paused"       // Temporarily stopped
  | "completed"    // All submissions done
  | "cancelled";   // User cancelled

export interface Label {
  id: string;
  name: string;
  genres: string[];
  submissionMethod: SubmissionMethod;
  submissionEmail?: string;
  submissionUrl?: string;
  requiredFields?: string[];
  fileRequirements?: {
    acceptsMP3?: boolean;
    acceptsWAV?: boolean;
    acceptsPDF?: boolean;
    maxFileSize?: number; // MB
  };
  notes?: string;
  website?: string;
  country?: string;
  confidenceScore?: number; // 0-100, how reliable is this info
  lastVerified?: Date;
  addedBy?: "system" | "admin" | "user";
  userId?: string; // If added by user
  isActive: boolean;
}

export interface SubmissionLog {
  id: string;
  userId: string;
  campaignId?: string;
  labelId: string;
  labelName: string;
  method: SubmissionMethod;
  status: SubmissionStatus;
  
  // Email details
  sentTo?: string;
  sentFrom?: string;
  subject?: string;
  pitchUsed?: "short" | "medium" | "long";
  
  // Tracking
  postmarkMessageId?: string;
  deliveredAt?: Date;
  openedAt?: Date;
  
  // Proof
  screenshotUrl?: string;
  confirmationText?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface SubmissionCampaign {
  id: string;
  userId: string;
  name: string;
  status: CampaignStatus;
  
  // Targets
  labelIds: string[];
  totalLabels: number;
  
  // Progress
  submitted: number;
  delivered: number;
  opened: number;
  replied: number;
  failed: number;
  
  // Content
  pitchVersion?: string; // Which pitch was used
  trackUrl?: string;
  
  // Dates
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ArtistPitch {
  userId: string;
  
  // Core info (extracted from EPK)
  artistName: string;
  genre: string;
  subGenres?: string[];
  
  // Generated pitches
  hookLine: string;          // One-liner
  shortPitch: string;        // 100 words
  mediumPitch: string;       // 300 words
  subjectLine: string;       // Email subject
  
  // Links
  trackUrl: string;          // Best track to submit
  epkUrl: string;
  spotifyUrl?: string;
  soundcloudUrl?: string;
  
  // Press
  pressHighlights?: string[];
  monthlyListeners?: number;
  
  // Contact
  contactEmail: string;
  contactName?: string;
  
  // Metadata
  generatedAt: Date;
  updatedAt: Date;
}

// ============================================
// SUBMISSION LIMITS PER TIER
// ============================================

export const SUBMISSION_LIMITS: Record<SubscriptionTier, number> = {
  tier1: 5,
  tier2: 10,
  tier3: 20,
};

/**
 * Get monthly submission limit for a tier
 */
export function getSubmissionLimit(
  rawTier?: string | null,
  status?: string | null
): number {
  if (!isSubscriptionActive(status)) return 0;
  const tier = normalizeTier(rawTier);
  return SUBMISSION_LIMITS[tier];
}

/**
 * Check if user can submit (hasn't exceeded monthly limit)
 */
export function canSubmit(
  currentMonthCount: number,
  rawTier?: string | null,
  status?: string | null
): { allowed: boolean; remaining: number; limit: number } {
  const limit = getSubmissionLimit(rawTier, status);
  const remaining = Math.max(0, limit - currentMonthCount);
  return {
    allowed: remaining > 0,
    remaining,
    limit,
  };
}

// ============================================
// GENRE MATCHING
// ============================================

const GENRE_HIERARCHY: Record<string, string[]> = {
  "House": ["Deep House", "Tech House", "Progressive House", "Minimal House", "Afro House", "Soulful House"],
  "EDM": ["Big Room", "Future Bass", "Dubstep", "Trap", "Electro", "Hardstyle"],
  "Disco": ["Nu-Disco", "Disco House", "Italo Disco", "Funk"],
  "Afro": ["Afro House", "Afrobeats", "Amapiano", "Afro Tech"],
  "Soulful": ["Soulful House", "Gospel House", "Vocal House"],
  "Trance": ["Progressive Trance", "Uplifting Trance", "Psytrance", "Tech Trance"],
  "Techno": ["Melodic Techno", "Hard Techno", "Minimal Techno", "Industrial Techno"],
};

/**
 * Calculate genre match score between artist and label
 */
export function calculateGenreMatch(
  artistGenres: string[],
  labelGenres: string[]
): number {
  if (!artistGenres.length || !labelGenres.length) return 0;

  let matchScore = 0;
  const artistLower = artistGenres.map(g => g.toLowerCase());
  const labelLower = labelGenres.map(g => g.toLowerCase());

  for (const artistGenre of artistLower) {
    // Direct match
    if (labelLower.includes(artistGenre)) {
      matchScore += 100;
      continue;
    }

    // Check parent/child relationships
    for (const [parent, children] of Object.entries(GENRE_HIERARCHY)) {
      const parentLower = parent.toLowerCase();
      const childrenLower = children.map(c => c.toLowerCase());

      // Artist has parent, label has child (or vice versa)
      if (
        (artistGenre === parentLower && labelLower.some(l => childrenLower.includes(l))) ||
        (childrenLower.includes(artistGenre) && labelLower.includes(parentLower))
      ) {
        matchScore += 75;
      }

      // Both are children of same parent
      if (
        childrenLower.includes(artistGenre) &&
        labelLower.some(l => childrenLower.includes(l))
      ) {
        matchScore += 50;
      }
    }
  }

  // Normalize to 0-100
  return Math.min(100, Math.round(matchScore / artistGenres.length));
}

/**
 * Recommend labels for an artist based on genre
 */
export function rankLabelsByGenreMatch(
  artistGenres: string[],
  labels: Label[]
): Array<Label & { matchScore: number }> {
  return labels
    .filter(l => l.isActive && l.submissionMethod !== "none")
    .map(label => ({
      ...label,
      matchScore: calculateGenreMatch(artistGenres, label.genres),
    }))
    .filter(l => l.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}
