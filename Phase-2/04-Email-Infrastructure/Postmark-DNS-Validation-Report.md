# Postmark DNS Validation Report — verifiedsoundar.com

## Summary
DNS lookups show **DKIM, Return-Path, SPF, and DMARC are present**. DMARC appears truncated in the resolver output and should be double-checked in Google Cloud DNS.

## Authoritative Nameservers (from DNS lookup)
- ns-cloud-a1.googledomains.com
- ns-cloud-a2.googledomains.com
- ns-cloud-a3.googledomains.com
- ns-cloud-a4.googledomains.com

> Authoritative nameservers resolved to the `ns-cloud-a*` set.

## Record Checks (Authoritative Query)
- **DKIM TXT** `20260213033206pm._domainkey.verifiedsoundar.com` → **FOUND**
- **Return-Path CNAME** `pm-bounces.verifiedsoundar.com` → **FOUND** → `pm.mtasv.net`
- **SPF TXT** `verifiedsoundar.com` → `v=spf1 include:_spf.google.com include:spf.mtasv.net ~all` ✅
- **DMARC TXT** `_dmarc.verifiedsoundar.com` → **FOUND** (value appears truncated in DNS lookup)

## Postmark Status (Expected)
- DKIM: **Likely Verified**
- SPF: **Likely Verified**
- Return-Path: **Likely Verified**

## Required Fixes in Google Cloud DNS
- No required fixes detected for DKIM/Return-Path/SPF.
- **Verify DMARC value** in Google Cloud DNS to ensure it fully matches:
  `v=DMARC1; p=none; rua=mailto:dmarc@verifiedsoundar.com;`

After updates:
- Wait 5–15 minutes
- In Postmark: **Verify DNS**
- Confirm DKIM/SPF/Return-Path = Verified
