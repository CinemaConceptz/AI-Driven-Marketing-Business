# Postmark DNS Records — verifiedsoundar.com (Squarespace)

> **IMPORTANT:** Replace all `{{PLACEHOLDER}}` values with the exact DNS records shown in Postmark → Sender Signatures → Domains → verifiedsoundar.com. Do not guess.

## DNS Records (from Postmark)

| Record | Host/Name | Type | Value | TTL |
|---|---|---|---|---|
| DKIM CNAME #1 | {{POSTMARK_DKIM1_HOST}} | CNAME | {{POSTMARK_DKIM1_VALUE}} | Auto/Default |
| DKIM CNAME #2 | {{POSTMARK_DKIM2_HOST}} | CNAME | {{POSTMARK_DKIM2_VALUE}} | Auto/Default |
| Return-Path CNAME | {{POSTMARK_RETURN_PATH_HOST}} | CNAME | {{POSTMARK_RETURN_PATH_VALUE}} | Auto/Default |

## SPF TXT (single record only — choose one)

**If ONLY Postmark:**
```
v=spf1 include:spf.mtasv.net ~all
```

**If Google Workspace + Postmark:**
```
v=spf1 include:_spf.google.com include:spf.mtasv.net ~all
```

> Ensure there is **only one** SPF TXT record at host `@`. Merge includes if an SPF already exists.

## DMARC TXT (monitoring mode)

Host/Name:
```
_dmarc
```

Value:
```
v=DMARC1; p=none; rua=mailto:dmarc@verifiedsoundar.com;
```

## Squarespace DNS — Click Path

1. Squarespace → **Settings** → **Domains**
2. Select **verifiedsoundar.com**
3. **DNS Settings** → **Add Record**
4. Add each Postmark record exactly as shown above.

## Postmark Verification

After DNS is saved:
- Postmark → Sender Signatures → Domains → **verifiedsoundar.com** → **Verify DNS**
- **Verified** = all records found
- Errors:
  - **DKIM missing** → CNAME host/value incorrect or not propagated
  - **SPF missing** → SPF TXT missing or multiple SPF records
  - **Return-Path missing** → CNAME not added or incorrect
