# Google DNS Record Set — Postmark (Current)

Use this table when adding/re-applying records in **Google DNS**.

| Record | Host | Type | Value | TTL |
|---|---|---|---|---|
| DKIM TXT | 20260213033206pm._domainkey. | TXT | k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCTcUP9shBjkVJy+Aj5OM3rcB1PdaFmGLJ+OOeUXhCVUh0MiFTPzDolcNrRr2/p1gAotXgjFoCKKQmicZ27/WMN509N2zhLv9EIfyMgjRxvigfS7vVA/I+ROPIDZCG/d8k/IhhPUtbnaOu7VEgnT8K/cZlL4s7QF43ak0ud6fFWPQIDAQAB | 3600 |
| Return-Path CNAME (if provided) | {{POSTMARK_RETURN_PATH_HOST}} | CNAME | {{POSTMARK_RETURN_PATH_VALUE}} | Auto/Default |
| SPF TXT | @ | TXT | v=spf1 include:_spf.google.com include:spf.mtasv.net ~all | Auto/Default |
| DMARC TXT | _dmarc | TXT | v=DMARC1; p=none; rua=mailto:dmarc@verifiedsoundar.com; | Auto/Default |

## Notes
- Keep **one** SPF record only.
- After updates, verify in Postmark.
