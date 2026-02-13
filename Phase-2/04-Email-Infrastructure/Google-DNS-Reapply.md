# Google DNS Re-Apply — Postmark Records

When moving DNS to Google Domains/Cloud DNS, re-create the **exact same records** from Postmark.

## Records Table (copy from Postmark-DNS-Records.md)

| Record | Host/Name | Type | Value | TTL |
|---|---|---|---|---|
| DKIM CNAME #1 | {{POSTMARK_DKIM1_HOST}} | CNAME | {{POSTMARK_DKIM1_VALUE}} | Auto/Default |
| DKIM CNAME #2 | {{POSTMARK_DKIM2_HOST}} | CNAME | {{POSTMARK_DKIM2_VALUE}} | Auto/Default |
| Return-Path CNAME | {{POSTMARK_RETURN_PATH_HOST}} | CNAME | {{POSTMARK_RETURN_PATH_VALUE}} | Auto/Default |
| SPF TXT | @ | TXT | (choose correct SPF from below) | Auto/Default |
| DMARC TXT | _dmarc | TXT | v=DMARC1; p=none; rua=mailto:dmarc@verifiedsoundar.com; | Auto/Default |

## SPF Options

**If ONLY Postmark:**
```
v=spf1 include:spf.mtasv.net ~all
```

**If Google Workspace + Postmark:**
```
v=spf1 include:_spf.google.com include:spf.mtasv.net ~all
```

## Notes
- Recreate records exactly, then wait for DNS propagation.
- Re-verify in Postmark after DNS updates.
