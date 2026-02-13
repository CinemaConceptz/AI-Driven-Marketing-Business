# Google DNS Record Set — Postmark (Current)

Use this table when adding/re-applying records in **Google DNS**.

| Record | Host | Type | Value | TTL |
|---|---|---|---|---|
| DKIM CNAME #1 | {{POSTMARK_DKIM1_HOST}} | CNAME | {{POSTMARK_DKIM1_VALUE}} | Auto/Default |
| DKIM CNAME #2 | {{POSTMARK_DKIM2_HOST}} | CNAME | {{POSTMARK_DKIM2_VALUE}} | Auto/Default |
| Return-Path CNAME | {{POSTMARK_RETURN_PATH_HOST}} | CNAME | {{POSTMARK_RETURN_PATH_VALUE}} | Auto/Default |
| SPF TXT | @ | TXT | v=spf1 include:_spf.google.com include:spf.mtasv.net ~all | Auto/Default |
| DMARC TXT | _dmarc | TXT | v=DMARC1; p=none; rua=mailto:dmarc@verifiedsoundar.com; | Auto/Default |

## Notes
- Keep **one** SPF record only.
- After updates, verify in Postmark.
