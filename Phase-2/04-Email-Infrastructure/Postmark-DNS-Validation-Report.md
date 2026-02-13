# Postmark DNS Validation Report — verifiedsoundar.com

## Summary
DNS lookups show **DKIM, Return-Path, and DMARC are present**. **SPF is still missing the Postmark include**.

## Authoritative Nameservers (from DNS lookup)
- ns-cloud-a1.googledomains.com
- ns-cloud-a2.googledomains.com
- ns-cloud-a3.googledomains.com
- ns-cloud-a4.googledomains.com

> Authoritative nameservers resolved to the `ns-cloud-a*` set.

## Record Checks (Authoritative Query)
- **DKIM TXT** `20260213033206pm._domainkey.verifiedsoundar.com` → **FOUND**
- **Return-Path CNAME** `pm-bounces.verifiedsoundar.com` → **FOUND** → `pm.mtasv.net`
- **SPF TXT** `verifiedsoundar.com` → `v=spf1 include:_spf.google.com ~all` (**Postmark include missing**)
- **DMARC TXT** `_dmarc.verifiedsoundar.com` → **FOUND**

## Postmark Status (Expected)
- DKIM: **Likely Verified**
- SPF: **Unverified** (Postmark include missing)
- Return-Path: **Likely Verified**

## Required Fixes in Google Cloud DNS
1) Update SPF to: `v=spf1 include:_spf.google.com include:spf.mtasv.net ~all`

> DKIM, Return-Path, and DMARC are already present based on authoritative DNS lookup.

After updates:
- Wait 5–15 minutes
- In Postmark: **Verify DNS**
- Confirm DKIM/SPF/Return-Path = Verified
