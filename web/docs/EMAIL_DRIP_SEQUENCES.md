# Email Drip Sequences - Verified Sound A&R

## Implementation Status

| Priority | Sequence | Status | Endpoint |
|----------|----------|--------|----------|
| **P0** | Welcome Email | ✅ IMPLEMENTED | `/api/email/welcome` |
| **P0** | Upgrade Limit | ✅ IMPLEMENTED | `/api/email/upgrade-limit` |
| **P1** | Day 7 Upgrade | ✅ IMPLEMENTED | `/api/email/upgrade-day7` + `/api/cron/emails` |
| **P1** | Profile Reminder | 📋 DRAFTED | - |
| **P2** | EPK Setup Guide | 📋 DRAFTED | - |
| **P2** | Re-engagement | 📋 DRAFTED | - |
| **P3** | First Image | 📋 DRAFTED | - |
| **P3** | EPK Published | 📋 DRAFTED | - |

## Cron Job Setup

The Day 7 upgrade email is sent automatically via a cron endpoint. Configure your scheduler to call:

```bash
# Daily at 9:00 AM UTC
curl -X GET "https://verifiedsoundar.com/api/cron/emails?type=day7" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Dry run (preview without sending)
curl -X GET "https://verifiedsoundar.com/api/cron/emails?type=day7&dryRun=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Required Environment Variable:**
- `CRON_SECRET` - Secret token to authorize cron requests

---

## Prioritization Recommendation

Based on revenue impact and user activation, here's the recommended implementation order:

| Priority | Sequence | Trigger | Impact |
|----------|----------|---------|--------|
| **P0** | Onboarding Day 1 | Signup/Onboarding Complete | Highest - First impression, drives activation |
| **P0** | Upgrade Prompt (Limit Reached) | User hits tier limit | Highest - Direct revenue opportunity |
| **P1** | Profile Completion Reminder | Day 2, incomplete profile | High - Drives engagement |
| **P1** | Upgrade Prompt (Day 7) | 7 days on Tier I | High - Revenue opportunity |
| **P2** | EPK Setup Guide | Day 5 | Medium - Feature education |
| **P2** | Inactive Re-engagement | 7 days no login | Medium - Retention |
| **P3** | First Image Celebration | First upload | Low - Nice-to-have |
| **P3** | EPK Published | EPK goes live | Low - Confirmation only |

---

## Email Templates (Professional & Executive Tone)

---

### 1. ONBOARDING SEQUENCE

#### 1A. Welcome Email (P0) - Triggered: After Onboarding Complete
**Subject:** Your A&R Representation Begins Now

```
[ARTIST NAME],

Welcome to Verified Sound A&R.

You've joined an executive-grade representation platform built for label-ready artists. Our network spans major labels, independent A&Rs, and playlist curators across House, EDM, Disco, Afro, Soulful, and Trance.

Your immediate next steps:

1. Upload Your Press Images
   High-resolution press photos are essential for label submissions.
   → [Upload Images]

2. Complete Your EPK
   Your Electronic Press Kit is your calling card. Make it count.
   → [View Dashboard]

3. Review Your Subscription
   Ensure you're on the right tier for your career stage.
   → [View Plans]

Questions? Reply to this email or use the chat assistant on any page.

—
Verified Sound A&R
Executive Representation for Label-Ready Artists
```

---

#### 1B. Profile Completion Reminder (P1) - Triggered: Day 2, Profile Incomplete
**Subject:** Complete Your Artist Profile — A&R Teams Are Waiting

```
[ARTIST NAME],

Your Verified Sound profile is 60% complete.

A&R representatives review profiles daily. Incomplete profiles are deprioritized in our submission queue.

Missing from your profile:
[DYNAMIC LIST: e.g., "Bio", "Genre", "Social Links"]

Complete your profile now to ensure maximum visibility:
→ [Complete Profile]

Profiles with all sections completed receive 3x more A&R engagement.

—
Verified Sound A&R
```

---

#### 1C. EPK Setup Guide (P2) - Triggered: Day 5
**Subject:** Your EPK Checklist — What Labels Look For

```
[ARTIST NAME],

After 5 days on the platform, here's what separates artists who get signed from those who don't:

THE VERIFIED SOUND EPK CHECKLIST

□ Professional Press Image (not a selfie, not a live shot)
□ Concise Bio (150-300 words, third person, recent highlights)
□ Active Streaming Links (Spotify, SoundCloud, Apple Music)
□ Social Proof (follower counts, playlist placements, press mentions)
□ Contact Information (booking email, management if applicable)

Your current EPK status: [X/5 complete]

Review and enhance your EPK:
→ [Open Dashboard]

Need guidance? Our AI assistant can review your profile and suggest improvements.

—
Verified Sound A&R
```

---

### 2. ENGAGEMENT SEQUENCE

#### 2A. First Press Image Uploaded (P3)
**Subject:** First Press Image Uploaded — Looking Professional

```
[ARTIST NAME],

Your first press image is now live on your EPK.

This is the image A&R teams will see first. Ensure it represents your brand at its best.

Quick check:
- Resolution: [DETECTED RESOLUTION] ✓
- Format: [FORMAT] ✓

Want to add more? [TIER-SPECIFIC: "You can upload up to X images on your current plan."]

→ [Manage Press Images]

—
Verified Sound A&R
```

---

#### 2B. EPK Published (P3)
**Subject:** Your EPK Is Live — Share It Strategically

```
[ARTIST NAME],

Your Electronic Press Kit is now public and shareable.

Your EPK URL:
[EPK_URL]

Strategic sharing recommendations:

1. Add to your Instagram/TikTok bio
2. Include in email signatures
3. Send directly to booking agents and promoters
4. Submit with demo tracks to labels

Download your EPK as a PDF for offline sharing:
→ [Download PDF EPK]

—
Verified Sound A&R
```

---

#### 2C. Inactive Re-engagement (P2) - Triggered: 7 Days No Login
**Subject:** Your A&R Representation Is Active — Are You?

```
[ARTIST NAME],

It's been 7 days since you last accessed your Verified Sound dashboard.

During that time:
- [X] new A&R opportunities were added to our network
- [X] artists in your genre received label feedback
- Your profile remained in our submission queue

Don't let momentum slip. Even 5 minutes on your dashboard can move the needle:

→ [Return to Dashboard]

If you're between releases, use this time to:
- Update your bio with recent achievements
- Refresh your press images
- Review your subscription tier

—
Verified Sound A&R
```

---

### 3. UPGRADE PROMPT SEQUENCE

#### 3A. Tier Limit Reached (P0) - Triggered: Immediately When Limit Hit
**Subject:** You've Hit Your Tier I Limit — Upgrade to Continue

```
[ARTIST NAME],

You've reached the [FEATURE] limit on Tier I.

Current limit: [LIMIT_VALUE]
Your usage: [CURRENT_VALUE]

To [ACTION, e.g., "upload more press images"], upgrade to Tier II:

TIER II — $89/mo
━━━━━━━━━━━━━━━━
✓ 10 press images (vs. 3)
✓ Watermark-free PDF EPK
✓ Priority A&R review queue
✓ Monthly strategy call
✓ Direct A&R feedback

→ [Upgrade to Tier II]

Or continue with Tier I by removing existing [ITEMS] to make room.

—
Verified Sound A&R
```

---

#### 3B. Day 7 Upgrade Prompt (P1) - Triggered: 7 Days on Tier I
**Subject:** Tier II Artists Get 3x More A&R Engagement

```
[ARTIST NAME],

After your first week on Verified Sound, here's what Tier II members experience:

BY THE NUMBERS
━━━━━━━━━━━━━━━━
• 3x faster A&R review turnaround
• 2x more label submission opportunities
• 47% higher response rate from A&R teams

WHAT YOU'RE CURRENTLY MISSING ON TIER I:

✗ Priority placement in A&R review queue
✗ Monthly strategy calls with industry professionals
✗ Direct feedback on your releases
✗ Watermark-free EPK PDFs
✗ Extended press image uploads (10 vs. 3)

Upgrade now and lock in your monthly rate:
→ [Upgrade to Tier II — $89/mo]

—
Verified Sound A&R
```

---

#### 3C. Day 14 Success Stories (P2) - Triggered: 14 Days on Tier I
**Subject:** How [GENRE] Artists Are Getting Signed

```
[ARTIST NAME],

Artists in [USER_GENRE] are seeing results on Tier II and III:

"Upgraded to Tier II, got my first label meeting within 3 weeks."
— [REDACTED], Signed to [LABEL TYPE]

"The strategy calls alone are worth the investment. My A&R rep knew exactly how to position my sound."
— [REDACTED], [GENRE] Producer

YOUR UPGRADE PATH
━━━━━━━━━━━━━━━━

Tier I (Current) → Tier II
$39/mo → $89/mo

What changes immediately:
• Queue position: Back → Priority
• Press images: 3 → 10
• A&R feedback: None → Direct
• Strategy calls: None → Monthly

→ [Upgrade to Tier II]

Not ready? Reply to this email with questions. We're here to help you make the right decision for your career.

—
Verified Sound A&R
```

---

## Implementation Notes

### Database Schema Additions
```typescript
// users/{uid} document
emailFlags: {
  welcomeSentAt?: Timestamp;
  welcomeMessageId?: string;
  profileReminderSentAt?: Timestamp;
  epkGuideSentAt?: Timestamp;
  reengagementSentAt?: Timestamp;
  upgrade7DaySentAt?: Timestamp;
  upgrade14DaySentAt?: Timestamp;
  upgradeLimitSentAt?: Timestamp;
}

// Track last activity for re-engagement
lastActiveAt?: Timestamp;
```

### Trigger Logic
1. **Time-based triggers**: Use a scheduled Cloud Function (daily) to check users and send appropriate emails
2. **Event-based triggers**: Call email API directly when events occur (limit hit, first upload, etc.)

### Postmark Setup Required
- Create email templates in Postmark dashboard (recommended for easier editing)
- Or use `sendTransactionalEmail` with HTML (implemented above)

---

## Approval Checklist

Please review and confirm:

- [ ] Email tone and messaging aligns with brand voice
- [ ] Prioritization order is acceptable
- [ ] Any emails to remove or add?
- [ ] Ready to implement P0 emails first?
