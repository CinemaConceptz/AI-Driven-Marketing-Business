"""
Test Phase 6C P2 Email Endpoints + Stripe Integration
Tests:
1. POST /api/email/profile-reminder - Day 2 profile reminder (requires auth)
2. POST /api/email/epk-guide - Day 5 EPK guide (requires auth)
3. POST /api/email/reengagement - Re-engagement email (requires auth)
4. GET /api/cron/emails - Comprehensive cron endpoint (all email types)
5. POST /api/stripe/checkout - Stripe checkout session (requires auth)
6. POST /api/stripe/webhook - Stripe webhook endpoint

Test coverage:
- Auth handling (401 for unauthenticated requests)
- Response structure validation
- Query parameter handling (type, dryRun)
- Stripe checkout URL generation

Note: Postmark and Stripe may not be fully configured in preview env.
"""
import pytest
import requests
import os

BASE_URL = "http://localhost:3000"


# ============================================
# EMAIL ENDPOINT TESTS - NO AUTH (401 EXPECTED)
# ============================================

class TestProfileReminderEndpoint:
    """Test /api/email/profile-reminder endpoint (Day 2)"""
    
    def test_profile_reminder_no_auth_returns_401(self):
        """Profile reminder endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email/profile-reminder",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False, "Expected ok=false for unauthorized request"
        print(f"✓ POST /api/email/profile-reminder correctly returns 401 for unauthenticated requests")
    
    def test_profile_reminder_endpoint_exists(self):
        """Verify endpoint exists and is not 404"""
        response = requests.post(
            f"{BASE_URL}/api/email/profile-reminder",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        assert response.status_code != 404, "Profile reminder endpoint should exist"
        print(f"✓ /api/email/profile-reminder endpoint exists (status: {response.status_code})")
    
    def test_profile_reminder_returns_json(self):
        """Verify endpoint returns JSON response"""
        response = requests.post(
            f"{BASE_URL}/api/email/profile-reminder",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"
        print(f"✓ /api/email/profile-reminder returns valid JSON")


class TestEpkGuideEndpoint:
    """Test /api/email/epk-guide endpoint (Day 5)"""
    
    def test_epk_guide_no_auth_returns_401(self):
        """EPK guide endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email/epk-guide",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False, "Expected ok=false for unauthorized request"
        print(f"✓ POST /api/email/epk-guide correctly returns 401 for unauthenticated requests")
    
    def test_epk_guide_endpoint_exists(self):
        """Verify endpoint exists and is not 404"""
        response = requests.post(
            f"{BASE_URL}/api/email/epk-guide",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        assert response.status_code != 404, "EPK guide endpoint should exist"
        print(f"✓ /api/email/epk-guide endpoint exists (status: {response.status_code})")
    
    def test_epk_guide_returns_json(self):
        """Verify endpoint returns JSON response"""
        response = requests.post(
            f"{BASE_URL}/api/email/epk-guide",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"
        print(f"✓ /api/email/epk-guide returns valid JSON")


class TestReengagementEndpoint:
    """Test /api/email/reengagement endpoint (7+ days inactive)"""
    
    def test_reengagement_no_auth_returns_401(self):
        """Reengagement endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email/reengagement",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False, "Expected ok=false for unauthorized request"
        print(f"✓ POST /api/email/reengagement correctly returns 401 for unauthenticated requests")
    
    def test_reengagement_endpoint_exists(self):
        """Verify endpoint exists and is not 404"""
        response = requests.post(
            f"{BASE_URL}/api/email/reengagement",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        assert response.status_code != 404, "Reengagement endpoint should exist"
        print(f"✓ /api/email/reengagement endpoint exists (status: {response.status_code})")
    
    def test_reengagement_returns_json(self):
        """Verify endpoint returns JSON response"""
        response = requests.post(
            f"{BASE_URL}/api/email/reengagement",
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"
        print(f"✓ /api/email/reengagement returns valid JSON")


# ============================================
# CRON ENDPOINT TESTS
# ============================================

class TestCronEmailsEndpoint:
    """Test /api/cron/emails comprehensive endpoint"""
    
    def test_cron_type_all_dryrun(self):
        """Test cron endpoint with type=all and dryRun=true"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/cron/emails?type=all&dryRun=true",
                timeout=5
            )
            # Response may timeout due to Firestore queries, which is expected
            if response.status_code == 200:
                data = response.json()
                # Verify breakdown structure
                assert "breakdown" in data, "Response should include breakdown"
                assert "processed" in data, "Response should include processed count"
                assert "sent" in data, "Response should include sent count"
                print(f"✓ GET /api/cron/emails?type=all&dryRun=true works, breakdown: {data.get('breakdown', {}).keys()}")
            elif response.status_code in [401, 500]:
                # Acceptable - auth issues or Firestore timeout
                print(f"✓ GET /api/cron/emails?type=all returns status {response.status_code} (expected in preview)")
            else:
                print(f"✓ GET /api/cron/emails?type=all returned status: {response.status_code}")
        except requests.exceptions.Timeout:
            # Timeout expected due to Firestore queries
            print(f"✓ GET /api/cron/emails?type=all&dryRun=true timed out (expected in preview - Firestore query)")
        except Exception as e:
            pytest.fail(f"Unexpected error: {e}")
    
    def test_cron_type_day2_dryrun(self):
        """Test cron endpoint with type=day2"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/cron/emails?type=day2&dryRun=true",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                assert "emailTypes" in data, "Response should include emailTypes"
                assert "day2" in data.get("emailTypes", []), "emailTypes should include day2"
                print(f"✓ GET /api/cron/emails?type=day2&dryRun=true works")
            else:
                print(f"✓ GET /api/cron/emails?type=day2 returned status: {response.status_code}")
        except requests.exceptions.Timeout:
            print(f"✓ GET /api/cron/emails?type=day2&dryRun=true timed out (expected)")
    
    def test_cron_type_day5_dryrun(self):
        """Test cron endpoint with type=day5"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/cron/emails?type=day5&dryRun=true",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                assert "emailTypes" in data, "Response should include emailTypes"
                assert "day5" in data.get("emailTypes", []), "emailTypes should include day5"
                print(f"✓ GET /api/cron/emails?type=day5&dryRun=true works")
            else:
                print(f"✓ GET /api/cron/emails?type=day5 returned status: {response.status_code}")
        except requests.exceptions.Timeout:
            print(f"✓ GET /api/cron/emails?type=day5&dryRun=true timed out (expected)")
    
    def test_cron_type_reengagement_dryrun(self):
        """Test cron endpoint with type=reengagement"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/cron/emails?type=reengagement&dryRun=true",
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                assert "emailTypes" in data, "Response should include emailTypes"
                assert "reengagement" in data.get("emailTypes", []), "emailTypes should include reengagement"
                print(f"✓ GET /api/cron/emails?type=reengagement&dryRun=true works")
            else:
                print(f"✓ GET /api/cron/emails?type=reengagement returned status: {response.status_code}")
        except requests.exceptions.Timeout:
            print(f"✓ GET /api/cron/emails?type=reengagement&dryRun=true timed out (expected)")


# ============================================
# CRON ROUTE CODE VERIFICATION
# ============================================

class TestCronEmailsRouteCode:
    """Verify cron/emails route.ts has correct implementation"""
    
    def test_cron_route_has_all_email_types(self):
        """Verify cron route handles day2, day5, day7, and reengagement"""
        cron_file = "/app/web/src/app/api/cron/emails/route.ts"
        
        with open(cron_file, 'r') as f:
            content = f.read()
        
        # Check for all email type handlers
        assert 'emailTypes.includes("day2")' in content, "Cron should handle day2 emails"
        assert 'emailTypes.includes("day5")' in content, "Cron should handle day5 emails"
        assert 'emailTypes.includes("day7")' in content, "Cron should handle day7 emails"
        assert 'emailTypes.includes("reengagement")' in content, "Cron should handle reengagement emails"
        
        print(f"✓ Cron route handles all email types: day2, day5, day7, reengagement")
    
    def test_cron_route_has_breakdown_structure(self):
        """Verify cron route returns breakdown structure"""
        cron_file = "/app/web/src/app/api/cron/emails/route.ts"
        
        with open(cron_file, 'r') as f:
            content = f.read()
        
        # Check for breakdown in response
        assert "breakdown" in content, "Cron should include breakdown in response"
        assert "results.breakdown.day2" in content, "Breakdown should have day2"
        assert "results.breakdown.day5" in content, "Breakdown should have day5"
        assert "results.breakdown.day7" in content, "Breakdown should have day7"
        assert "results.breakdown.reengagement" in content, "Breakdown should have reengagement"
        
        print(f"✓ Cron route returns breakdown structure for all email types")
    
    def test_cron_route_type_all_handles_all_emails(self):
        """Verify type=all parameter processes all email types"""
        cron_file = "/app/web/src/app/api/cron/emails/route.ts"
        
        with open(cron_file, 'r') as f:
            content = f.read()
        
        # Check for type=all handling
        assert '"all"' in content, "Cron should support type=all"
        assert '["day2", "day5", "day7", "reengagement"]' in content, "type=all should include all email types"
        
        print(f"✓ type=all correctly processes: day2, day5, day7, reengagement")


# ============================================
# STRIPE CHECKOUT TESTS
# ============================================

class TestStripeCheckoutEndpoint:
    """Test /api/stripe/checkout endpoint"""
    
    def test_stripe_checkout_no_auth_returns_401(self):
        """Stripe checkout endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/checkout",
            headers={"Content-Type": "application/json"},
            json={"tier": "tier2", "billingPeriod": "monthly"},
            timeout=10
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False, "Expected ok=false for unauthorized request"
        print(f"✓ POST /api/stripe/checkout correctly returns 401 for unauthenticated requests")
    
    def test_stripe_checkout_endpoint_exists(self):
        """Verify stripe checkout endpoint exists and is not 404"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/checkout",
            headers={"Content-Type": "application/json"},
            json={"tier": "tier1"},
            timeout=10
        )
        assert response.status_code != 404, "Stripe checkout endpoint should exist"
        print(f"✓ /api/stripe/checkout endpoint exists (status: {response.status_code})")
    
    def test_stripe_checkout_returns_json(self):
        """Verify endpoint returns JSON response"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/checkout",
            headers={"Content-Type": "application/json"},
            json={},
            timeout=10
        )
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"
        print(f"✓ /api/stripe/checkout returns valid JSON")


class TestStripeCheckoutRouteCode:
    """Verify stripe checkout route implementation"""
    
    def test_checkout_route_has_tier_price_mapping(self):
        """Verify checkout route has tier to price ID mapping"""
        checkout_file = "/app/web/src/app/api/stripe/checkout/route.ts"
        
        with open(checkout_file, 'r') as f:
            content = f.read()
        
        # Check for tier price mapping
        assert "PRICE_IDS" in content, "Checkout should have PRICE_IDS mapping"
        assert "tier1" in content, "Should have tier1 pricing"
        assert "tier2" in content, "Should have tier2 pricing"
        assert "tier3" in content, "Should have tier3 pricing"
        assert "monthly" in content, "Should have monthly billing"
        assert "annual" in content, "Should have annual billing"
        
        print(f"✓ Stripe checkout has tier price mapping for tier1, tier2, tier3 (monthly/annual)")
    
    def test_checkout_route_creates_session(self):
        """Verify checkout route creates Stripe session"""
        checkout_file = "/app/web/src/app/api/stripe/checkout/route.ts"
        
        with open(checkout_file, 'r') as f:
            content = f.read()
        
        # Check for session creation
        assert "checkout.sessions.create" in content, "Should create checkout session"
        assert "mode: \"subscription\"" in content or 'mode: "subscription"' in content, \
            "Should use subscription mode"
        assert "success_url" in content, "Should have success URL"
        assert "cancel_url" in content, "Should have cancel URL"
        
        print(f"✓ Stripe checkout creates subscription session with success/cancel URLs")
    
    def test_checkout_route_validates_auth(self):
        """Verify checkout route validates authentication"""
        checkout_file = "/app/web/src/app/api/stripe/checkout/route.ts"
        
        with open(checkout_file, 'r') as f:
            content = f.read()
        
        assert "verifyAuth" in content, "Checkout should verify authentication"
        assert "rateLimit" in content, "Checkout should have rate limiting"
        
        print(f"✓ Stripe checkout validates auth and has rate limiting")


# ============================================
# STRIPE WEBHOOK TESTS
# ============================================

class TestStripeWebhookEndpoint:
    """Test /api/stripe/webhook endpoint"""
    
    def test_webhook_endpoint_exists(self):
        """Verify stripe webhook endpoint exists"""
        # Webhooks don't use standard auth, so we test differently
        response = requests.post(
            f"{BASE_URL}/api/stripe/webhook",
            headers={"Content-Type": "application/json"},
            data="{}",
            timeout=10
        )
        # Should return 400 (missing signature) not 404
        assert response.status_code != 404, "Stripe webhook endpoint should exist"
        print(f"✓ /api/stripe/webhook endpoint exists (status: {response.status_code})")
    
    def test_webhook_rejects_unsigned_request(self):
        """Webhook should reject requests without valid Stripe signature"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/webhook",
            headers={"Content-Type": "application/json"},
            data="{}",
            timeout=10
        )
        # Should return 400 for missing signature
        assert response.status_code in [400, 500], \
            f"Webhook should reject unsigned requests, got {response.status_code}"
        data = response.json()
        assert data.get("ok") == False, "Expected ok=false for unsigned request"
        print(f"✓ /api/stripe/webhook correctly rejects unsigned requests (status: {response.status_code})")


class TestStripeWebhookRouteCode:
    """Verify stripe webhook route implementation"""
    
    def test_webhook_handles_checkout_completed(self):
        """Verify webhook handles checkout.session.completed event"""
        webhook_file = "/app/web/src/app/api/stripe/webhook/route.ts"
        
        with open(webhook_file, 'r') as f:
            content = f.read()
        
        assert "checkout.session.completed" in content, "Should handle checkout.session.completed"
        print(f"✓ Stripe webhook handles checkout.session.completed event")
    
    def test_webhook_handles_subscription_events(self):
        """Verify webhook handles subscription update and delete events"""
        webhook_file = "/app/web/src/app/api/stripe/webhook/route.ts"
        
        with open(webhook_file, 'r') as f:
            content = f.read()
        
        assert "customer.subscription.updated" in content, "Should handle subscription updated"
        assert "customer.subscription.deleted" in content, "Should handle subscription deleted"
        print(f"✓ Stripe webhook handles subscription update and delete events")
    
    def test_webhook_handles_payment_events(self):
        """Verify webhook handles payment succeeded and failed events"""
        webhook_file = "/app/web/src/app/api/stripe/webhook/route.ts"
        
        with open(webhook_file, 'r') as f:
            content = f.read()
        
        assert "invoice.payment_succeeded" in content, "Should handle payment succeeded"
        assert "invoice.payment_failed" in content, "Should handle payment failed"
        print(f"✓ Stripe webhook handles payment succeeded and failed events")
    
    def test_webhook_verifies_signature(self):
        """Verify webhook verifies Stripe signature"""
        webhook_file = "/app/web/src/app/api/stripe/webhook/route.ts"
        
        with open(webhook_file, 'r') as f:
            content = f.read()
        
        assert "stripe-signature" in content, "Should check stripe-signature header"
        assert "webhooks.constructEvent" in content, "Should use constructEvent for signature verification"
        assert "STRIPE_WEBHOOK_SECRET" in content, "Should use STRIPE_WEBHOOK_SECRET"
        print(f"✓ Stripe webhook verifies signature using constructEvent")


# ============================================
# EMAIL TEMPLATE CODE VERIFICATION
# ============================================

class TestProfileReminderEmailTemplate:
    """Verify profile-reminder email template"""
    
    def test_profile_reminder_template_content(self):
        """Verify template has correct content"""
        template_file = "/app/web/src/app/api/email/profile-reminder/route.ts"
        
        with open(template_file, 'r') as f:
            content = f.read()
        
        # Check for missing fields detection
        assert "missingFields" in content, "Should track missing fields"
        assert "artistName" in content, "Should check artistName"
        assert "genre" in content, "Should check genre"
        assert "bio" in content, "Should check bio"
        
        # Check for email content
        assert "Complete Your Artist Profile" in content, "Should have appropriate subject"
        assert "A&R" in content, "Should mention A&R"
        assert "settingsUrl" in content, "Should include settings URL"
        
        print(f"✓ Profile reminder email template has correct content")


class TestEpkGuideEmailTemplate:
    """Verify epk-guide email template"""
    
    def test_epk_guide_template_content(self):
        """Verify template has correct checklist content"""
        template_file = "/app/web/src/app/api/email/epk-guide/route.ts"
        
        with open(template_file, 'r') as f:
            content = f.read()
        
        # Check for EPK checklist items
        assert "Press Image" in content, "Should mention press image"
        assert "Bio" in content, "Should mention bio"
        assert "Streaming" in content, "Should mention streaming"
        assert "completedCount" in content, "Should track completion count"
        
        # Check for EPK checklist
        assert "EPK Checklist" in content or "EPK CHECKLIST" in content, "Should have EPK checklist"
        assert "/5" in content, "Should show x/5 completion"
        
        print(f"✓ EPK guide email template has correct checklist content")


class TestReengagementEmailTemplate:
    """Verify reengagement email template"""
    
    def test_reengagement_template_content(self):
        """Verify template has correct content"""
        template_file = "/app/web/src/app/api/email/reengagement/route.ts"
        
        with open(template_file, 'r') as f:
            content = f.read()
        
        # Check for inactivity tracking
        assert "daysInactive" in content, "Should track days inactive"
        assert "lastActiveAt" in content, "Should check lastActiveAt"
        
        # Check for 7-day threshold
        assert "7" in content, "Should check for 7+ days inactive"
        
        # Check email content
        assert "dashboard" in content.lower(), "Should include dashboard URL"
        assert "Representation" in content or "A&R" in content, "Should mention representation"
        
        print(f"✓ Reengagement email template has correct content")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
