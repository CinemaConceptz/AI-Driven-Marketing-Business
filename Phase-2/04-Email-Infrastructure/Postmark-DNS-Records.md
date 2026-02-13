# Postmark DNS Records — verifiedsoundar.com (Google DNS)

> **IMPORTANT:** Replace all `{{PLACEHOLDER}}` values with the exact DNS records shown in Postmark → Sender Signatures → Domains → verifiedsoundar.com. Do not guess.

## DNS Records (from Postmark)

| Record | Host | Type | Value | TTL |
|---|---|---|---|---|
| DKIM TXT | 20260213033206pm._domainkey. | TXT | k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCTcUP9shBjkVJy+Aj5OM3rcB1PdaFmGLJ+OOeUXhCVUh0MiFTPzDolcNrRr2/p1gAotXgjFoCKKQmicZ27/WMN509N2zhLv9EIfyMgjRxvigfS7vVA/I+ROPIDZCG/d8k/IhhPUtbnaOu7VEgnT8K/cZlL4s7QF43ak0ud6fFWPQIDAQAB | 3600 |
| Return-Path CNAME | pm-bounces | CNAME | pm.mtasv.net | Auto/Default |

## SPF TXT (Google Workspace + Postmark — single record only)

Record | Host | Type | Value
---|---|---|---
SPF | @ | TXT | v=spf1 include:_spf.google.com include:spf.mtasv.net ~all

**Important:**
- There must be **ONLY ONE** SPF record.
- If an SPF record already exists, **edit it** to include Postmark (do not add a second record).
- Remove duplicate SPF entries if found.

## DMARC TXT (monitoring mode)

Host:
```
_dmarc
```

Value:
```
v=DMARC1; p=none; rua=mailto:dmarc@verifiedsoundar.com;
```

**Explanation:** `p=none` means monitoring-only. We can tighten later.

## Google DNS — Click Path

1. Google Domains / Cloud DNS → **DNS**
2. **Custom records** → **Add**
3. Add each Postmark record exactly as shown above.

## Postmark Verification

After DNS is saved:
- Postmark → Sender Signatures → Domains → **verifiedsoundar.com** → **Verify DNS**
- **Verified** = all records found
- Errors:
  - **DKIM missing** → CNAME host/value incorrect or not propagated
  - **SPF missing** → SPF TXT missing or multiple SPF records
  - **Return-Path missing** → CNAME not added or incorrect
