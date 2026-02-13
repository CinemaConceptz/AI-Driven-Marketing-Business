# Google Cloud DNS — Current State (verifiedsoundar.com)

> **Note:** I cannot access your Google Cloud account from here. Use the steps below to capture the current state and fill in the blanks.

## Steps to Inspect Zone
1. Google Cloud Console → **Network Services** → **Cloud DNS**
2. Locate the DNS zone that controls **verifiedsoundar.com**
3. Click the zone name to open the record list

## Record Findings (fill in)
- **Zone Name:** `___________________________`
- **Zone Type:** Public / Private → `___________________________`
- **Record Count:** `___________________________`
- **Name Servers:**

## Observed Records (provided)
- **SOA:**
  - verifiedsoundar.com. SOA 21600
  - ns-cloud-b1.googledomains.com. cloud-dns-hostmaster.google.com. 1 21600 3600 259200 300
- **NS:**
  - verifiedsoundar.com. NS 21600
  - ns-cloud-b1.googledomains.com.

> Note: This NS entry conflicts with the previously provided `ns-cloud-a*` set. Please confirm the authoritative nameserver set in Cloud DNS.

  - ns-cloud-a1.googledomains.com ✅
  - ns-cloud-a2.googledomains.com ✅
  - ns-cloud-a3.googledomains.com ✅
  - ns-cloud-a4.googledomains.com ✅

## Notes
- Confirm the zone is **Public**.
- If multiple zones exist, use the one currently serving the nameservers above.
