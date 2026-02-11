Onboarding Conversation Framework
Verified Sound Representative

Phase-1 – Conversation Architecture

Objective

Design a structured onboarding conversation that:

• Builds authority
• Gathers complete artist data
• Filters unserious applicants
• Captures compliance confirmations
• Prepares EPK generation inputs
• Maps directly to backend database structure

Conversation Flow Structure

The onboarding process is divided into 8 structured phases.

Each phase has a psychological and operational purpose.

Phase 1 – Professional Welcome & Positioning

Purpose:
Establish authority and seriousness.

Representative Opening:

“Welcome to Verified Sound. I will be guiding you through the structured representation onboarding process. This process allows us to evaluate your positioning and prepare your strategic placement profile.”

No hype.
No promises.

Phase 2 – Artist Identity Capture

Collect:

• Legal Name
• Artist Name
• Email
• Phone (optional)
• Location (City / State / Country)
• Years active
• Primary genre
• Secondary genres

Backend Mapping:
users collection
artist_profile collection

Phase 3 – Musical Positioning & Style Analysis

Questions:

• How would you describe your sound?
• Name 3 artists your sound aligns with.
• Are you currently releasing music independently?
• Have you previously signed with a label?
• Are you under any exclusive contract?

Purpose:
Determine market alignment and conflict risk.

Phase 4 – Release & Catalog Assessment

Collect:

• Number of released tracks
• DSP links (Spotify, Apple, Beatport, etc.)
• Upcoming releases
• Performance metrics (optional)

Purpose:
Assess readiness for outreach.

Phase 5 – Branding & Narrative Development

Questions:

• What makes your project distinct?
• What audience are you targeting?
• What markets are you focused on?
• Long-term career goal?

This feeds:
Bio generation
Press narrative
Strategic positioning summary

Phase 6 – Rights & Compliance Confirmation

Mandatory confirmation:

“I confirm that I own or control all rights to the music I submit and that no contractual conflicts prevent demo submission.”

Must be checkbox-style confirmation.

This protects against copyright risk.

Phase 7 – Targeting Preferences

Collect:

• Preferred labels (optional)
• Geographic focus (U.S., EU, Global)
• Major vs boutique preference
• Release frequency goals

Feeds:
Compatibility scoring engine later.

Phase 8 – Campaign Readiness Summary

Representative outputs:

• Artist Positioning Summary
• Compatibility Outlook
• Recommended Tier
• Strategic Notes
• Next Step: EPK Generation

Artist must confirm:

“Proceed with representation setup.”

No outreach begins without this approval.

Structural Safeguards

Onboarding should:

• Prevent skipping required fields
• Block submission without rights confirmation
• Flag contractual conflicts
• Identify genre outside launch scope
• Pause onboarding if red flags appear

Psychological Strategy

The flow must:

• Feel structured and professional
• Create seriousness
• Filter casual hobbyists
• Build trust
• Reinforce authority

This is not a chatbot conversation.

This is structured digital representation intake.

Backend Alignment Note

Every question must later map directly to:

Firestore fields
Compatibility scoring inputs
EPK generation variables
Submission targeting filters

No unnecessary questions.

Everything has operational purpose.

END OF DOCUMENT