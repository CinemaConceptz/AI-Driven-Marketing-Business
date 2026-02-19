# Rollback Procedure - Verified Sound A&R

## Quick Rollback (< 5 minutes)

### Option 1: Firebase App Hosting Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/project/verifiedsound-aec78/apphosting)
2. Click on your backend: **verifiedsoundar**
3. Click **"Rollouts"** tab
4. Find the last working deployment
5. Click **"Rollback to this version"**
6. Confirm rollback

### Option 2: Firebase CLI

```bash
# List recent rollouts
firebase apphosting:rollouts:list --backend=verifiedsoundar

# Rollback to specific rollout ID
firebase apphosting:rollouts:create --backend=verifiedsoundar --git-ref=<COMMIT_SHA>
```

---

## Full Rollback Steps

### Step 1: Identify the Problem

```bash
# Check Sentry for recent errors
# https://verifiedsound.sentry.io

# Check Cloud Scheduler logs
gcloud logging read "resource.type=cloud_scheduler_job" --limit=20

# Check Stripe webhook failures
# https://dashboard.stripe.com/webhooks
```

### Step 2: Find Last Good Commit

```bash
# View recent commits
git log --oneline -10

# Find the commit before the problem
git log --oneline --before="2025-02-19"
```

### Step 3: Rollback

**Option A: Revert commit (keeps history)**
```bash
git revert HEAD
git push origin main
# Firebase will auto-deploy the reverted code
```

**Option B: Reset to specific commit (rewrites history)**
```bash
git reset --hard <COMMIT_SHA>
git push --force origin main
# ⚠️ Use with caution - destroys commit history
```

**Option C: Deploy specific commit via Firebase**
```bash
firebase apphosting:rollouts:create --backend=verifiedsoundar --git-ref=<COMMIT_SHA>
```

---

## Rollback Checklist

- [ ] Identify the breaking change
- [ ] Notify team/stakeholders
- [ ] Choose rollback method
- [ ] Execute rollback
- [ ] Verify site is working: https://verifiedsoundar.com
- [ ] Check critical paths:
  - [ ] Homepage loads
  - [ ] Login works
  - [ ] Dashboard accessible
  - [ ] Stripe checkout works
- [ ] Monitor Sentry for new errors
- [ ] Document what went wrong

---

## Emergency Contacts

| Service | Dashboard |
|---------|-----------|
| Firebase | https://console.firebase.google.com/project/verifiedsound-aec78 |
| Sentry | https://verifiedsound.sentry.io |
| Stripe | https://dashboard.stripe.com |
| Postmark | https://account.postmarkapp.com |
| Cloud Scheduler | https://console.cloud.google.com/cloudscheduler |

---

## Hotfix Procedure

For critical fixes that can't wait:

1. Create hotfix branch: `git checkout -b hotfix/issue-name`
2. Make minimal fix
3. Test locally
4. Push and deploy: `git push origin hotfix/issue-name`
5. Create PR to main
6. After verification, merge to main

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v1.0.0 | Feb 2025 | Initial production launch |
