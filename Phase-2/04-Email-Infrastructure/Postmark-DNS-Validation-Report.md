# Postmark DNS Validation Report — verifiedsoundar.com

## Summary
DNS lookups indicate the Postmark records are **not yet present** on the authoritative nameservers.

## Authoritative Nameservers (from DNS lookup)
- ns-cloud-a1.googledomains.com
- ns-cloud-a2.googledomains.com
- ns-cloud-a3.googledomains.com
- ns-cloud-a4.googledomains.com

> This does **not** match the `ns-cloud-b*` set you provided. Please confirm which NS set is active in Google Cloud DNS.

## Record Checks (Authoritative Query)
- **DKIM TXT** `20260213033206pm._domainkey.verifiedsoundar.com` → **NOT FOUND**
- **Return-Path CNAME** `pm-bounces.verifiedsoundar.com` → **NOT FOUND**
- **SPF TXT** `verifiedsoundar.com` → `v=spf1 include:_spf.google.com ~all` (**Postmark include missing**)
- **DMARC TXT** `_dmarc.verifiedsoundar.com` → **NOT FOUND**

## Postmark Status (Expected)
- DKIM: **Unverified**
- SPF: **Unverified** (Postmark include missing)
- Return-Path: **Unverified** (CNAME missing)

## Required Fixes in Google Cloud DNS
1) Add DKIM TXT record (provided in DNS docs)
2) Add Return-Path CNAME: `pm-bounces` → `pm.mtasv.net`
3) Update SPF to: `v=spf1 include:_spf.google.com include:spf.mtasv.net ~all`
4) Add DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@verifiedsoundar.com;`

After updates:
- Wait 5–15 minutes
- In Postmark: **Verify DNS**
- Confirm DKIM/SPF/Return-Path = Verified
