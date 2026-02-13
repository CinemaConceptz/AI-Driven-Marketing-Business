# Postmark DNS Validation Checklist

After adding DNS records:

1. **Wait 5–15 minutes** for propagation.
2. Go to Postmark → Sender Signatures → Domains → **verifiedsoundar.com**.
3. Click **Verify DNS**.
4. Confirm:
   - **DKIM = Verified**
   - **SPF = Verified**
   - No **duplicate SPF** error

If errors appear:
- **DKIM missing** → DNS Name or Data incorrect
- **SPF missing** → SPF record missing or duplicated
- **DMARC missing** → `_dmarc` TXT record not present
