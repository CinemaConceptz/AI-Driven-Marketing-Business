# Google Cloud DNS — Step-by-Step (Postmark Records)

> Domain: **verifiedsoundar.com** (Google DNS confirmed)

## Open DNS Zone
1. Google Cloud Console → **Network Services** → **Cloud DNS**
2. Click the zone for **verifiedsoundar.com**
3. Click **Add standard** to create a new record set

---

## SECTION A — DKIM TXT
**DNS Name:**
```
20260213033206pm._domainkey.
```

**Resource Record Type:**
```
TXT
```

**TTL:**
```
3600
```

**Data:**
```
k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCTcUP9shBjkVJy+Aj5OM3rcB1PdaFmGLJ+OOeUXhCVUh0MiFTPzDolcNrRr2/p1gAotXgjFoCKKQmicZ27/WMN509N2zhLv9EIfyMgjRxvigfS7vVA/I+ROPIDZCG/d8k/IhhPUtbnaOu7VEgnT8K/cZlL4s7QF43ak0ud6fFWPQIDAQAB
```

Click **Save**.

---



## SECTION B — Return-Path CNAME
**DNS Name:**
```
pm-bounces
```

**Resource Record Type:**
```
CNAME
```

**TTL:**
```
3600
```

**Data:**
```
pm.mtasv.net
```

Click **Save**.

---

## SECTION C — SPF TXT (Merged Google + Postmark)
**Before adding:**
- Check if an SPF TXT record already exists at host `verifiedsoundar.com.` or `@`.
- If it exists, **edit** it instead of creating a duplicate.
- Ensure there is **only ONE** SPF record.

**DNS Name:**
```
verifiedsoundar.com.
```

**Resource Record Type:**
```
TXT
```

**TTL:**
```
3600
```

**Data (final SPF):**
```
v=spf1 include:_spf.google.com include:spf.mtasv.net ~all
```

Click **Save**.

---

## SECTION D — DMARC TXT
**DNS Name:**
```
_dmarc.verifiedsoundar.com.
```

**Resource Record Type:**
```
TXT
```

**TTL:**
```
3600
```

**Data:**
```
v=DMARC1; p=none; rua=mailto:dmarc@verifiedsoundar.com;
```

Click **Save**.
