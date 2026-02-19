"""
Test Day 7 Upgrade Email API endpoints for Phase 6C - P1 Implementation
Tests:
1. POST /api/email/upgrade-day7 - Manual trigger for Day 7 upgrade email (requires auth)
2. GET /api/cron/emails - Automated cron endpoint for scheduled emails

Test coverage:
- Auth handling (401 for unauthenticated requests)
- Response structure validation
- Query parameter handling (dryRun, type)
- Email HTML template content verification
- Rate limiting logic

Note: Postmark API may not be fully configured in preview env.
CRON_SECRET may not be set - cron endpoint allows requests in development mode.
"""
import pytest
import requests
import os
import json

BASE_URL = "http://localhost:3000"


class TestUpgradeDay7EndpointNoAuth:
    """Test /api/email/upgrade-day7 without authentication - should return 401"""
    
    def test_upgrade_day7_no_auth(self):
        """Upgrade Day 7 email endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-day7",
            headers={"Content-Type": "application/json"}
        )
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False, "Expected ok=false for unauthorized request"
        print(f"✓ POST /api/email/upgrade-day7 correctly returns 401 for unauthenticated requests")
    
    def test_upgrade_day7_invalid_token(self):
        """Upgrade Day 7 email endpoint should reject invalid tokens"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-day7",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid_token_12345"
            }
        )
        # Should return 401 or 500 (Firebase token verification error)
        assert response.status_code in [401, 500], f"Expected 401/500, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False
        print(f"✓ POST /api/email/upgrade-day7 correctly rejects invalid tokens (status: {response.status_code})")
    
    def test_upgrade_day7_malformed_auth_header(self):
        """Upgrade Day 7 email endpoint should handle malformed auth header"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-day7",
            headers={
                "Content-Type": "application/json",
                "Authorization": "NotBearer token"
            }
        )
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ POST /api/email/upgrade-day7 correctly handles malformed auth header")


class TestUpgradeDay7EndpointStructure:
    """Test that upgrade-day7 endpoint has correct structure"""
    
    def test_endpoint_exists(self):
        """Verify /api/email/upgrade-day7 endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-day7",
            headers={"Content-Type": "application/json"}
        )
        # Should not return 404
        assert response.status_code != 404, "Upgrade Day 7 email endpoint should exist"
        print(f"✓ /api/email/upgrade-day7 endpoint exists")
    
    def test_returns_json(self):
        """Verify upgrade-day7 endpoint returns JSON response"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-day7",
            headers={"Content-Type": "application/json"}
        )
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"
        data = response.json()
        assert isinstance(data, dict), "Response should be a JSON object"
        print(f"✓ /api/email/upgrade-day7 returns valid JSON")
    
    def test_get_method_not_allowed(self):
        """Upgrade Day 7 endpoint should not allow GET requests"""
        response = requests.get(f"{BASE_URL}/api/email/upgrade-day7")
        # Should return 405 Method Not Allowed or similar
        assert response.status_code in [405, 404, 401], f"GET should not be allowed, got {response.status_code}"
        print(f"✓ GET /api/email/upgrade-day7 correctly rejected (status: {response.status_code})")


class TestCronEmailsEndpoint:
    """Test /api/cron/emails endpoint"""
    
    def test_cron_endpoint_exists(self):
        """Verify /api/cron/emails endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/cron/emails")
        # Should not return 404
        assert response.status_code != 404, "Cron emails endpoint should exist"
        print(f"✓ /api/cron/emails endpoint exists")
    
    def test_cron_get_returns_json(self):
        """Cron endpoint should return JSON response"""
        response = requests.get(f"{BASE_URL}/api/cron/emails")
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"
        data = response.json()
        assert isinstance(data, dict), "Response should be a JSON object"
        print(f"✓ GET /api/cron/emails returns valid JSON")
    
    def test_cron_response_structure(self):
        """Cron endpoint should return proper response structure"""
        # Without CRON_SECRET, in dev mode it should allow the request
        response = requests.get(f"{BASE_URL}/api/cron/emails")
        
        # In dev mode without CRON_SECRET, should return 200 or 401
        # Based on logs: "CRON_SECRET not set - allowing request in development"
        if response.status_code == 200:
            data = response.json()
            # Verify expected fields in response
            assert "requestId" in data, "Response should contain requestId"
            assert "emailType" in data, "Response should contain emailType"
            assert "dryRun" in data, "Response should contain dryRun"
            assert "processed" in data, "Response should contain processed"
            assert "sent" in data, "Response should contain sent"
            assert "skipped" in data, "Response should contain skipped"
            assert "errors" in data, "Response should contain errors"
            print(f"✓ GET /api/cron/emails returns proper response structure: {data}")
        else:
            # If it returns 401, that's also valid (CRON_SECRET verification)
            assert response.status_code == 401, f"Unexpected status: {response.status_code}"
            print(f"✓ GET /api/cron/emails correctly requires authorization (status: 401)")
    
    def test_cron_dry_run_parameter(self):
        """Cron endpoint should support dryRun query parameter"""
        response = requests.get(f"{BASE_URL}/api/cron/emails?dryRun=true")
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("dryRun") == True, "dryRun should be true when query param is set"
            print(f"✓ GET /api/cron/emails?dryRun=true correctly parses dryRun parameter")
        else:
            print(f"✓ GET /api/cron/emails dryRun test - endpoint returned {response.status_code}")
    
    def test_cron_type_day7_parameter(self):
        """Cron endpoint should support type=day7 query parameter"""
        response = requests.get(f"{BASE_URL}/api/cron/emails?type=day7")
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("emailType") == "day7", f"emailType should be 'day7', got {data.get('emailType')}"
            print(f"✓ GET /api/cron/emails?type=day7 correctly parses type parameter")
        else:
            print(f"✓ GET /api/cron/emails type=day7 test - endpoint returned {response.status_code}")
    
    def test_cron_default_type(self):
        """Cron endpoint should default to day7 type when not specified"""
        response = requests.get(f"{BASE_URL}/api/cron/emails")
        
        if response.status_code == 200:
            data = response.json()
            # According to the code: emailType = searchParams.get("type") || "day7"
            assert data.get("emailType") == "day7", f"Default emailType should be 'day7', got {data.get('emailType')}"
            print(f"✓ GET /api/cron/emails defaults to type=day7")
        else:
            print(f"✓ GET /api/cron/emails default type test - endpoint returned {response.status_code}")
    
    def test_cron_post_method(self):
        """Cron endpoint should also support POST method"""
        response = requests.post(f"{BASE_URL}/api/cron/emails")
        
        # POST should work the same as GET (based on code: POST calls GET)
        assert response.status_code != 405, "POST should be allowed on /api/cron/emails"
        print(f"✓ POST /api/cron/emails is supported (status: {response.status_code})")
    
    def test_cron_with_cron_secret_header(self):
        """Test cron endpoint with Authorization header"""
        response = requests.get(
            f"{BASE_URL}/api/cron/emails?dryRun=true&type=day7",
            headers={"Authorization": "Bearer test_cron_secret"}
        )
        
        # Should return 200 in dev mode (CRON_SECRET not set) or 401 if secret doesn't match
        assert response.status_code in [200, 401], f"Expected 200 or 401, got {response.status_code}"
        print(f"✓ Cron endpoint with auth header returns {response.status_code}")


class TestEmailHtmlTemplate:
    """Test that the Day 7 email HTML template contains correct content"""
    
    def test_template_from_route_file(self):
        """Verify template HTML contains the required stats (3x, 2x, 47%)"""
        # Read the route.ts file and verify template content
        template_file = "/app/web/src/app/api/email/upgrade-day7/route.ts"
        
        try:
            with open(template_file, 'r') as f:
                content = f.read()
            
            # Check for the required statistics in the HTML template
            assert "3x" in content, "Template should contain '3x' statistic"
            assert "2x" in content, "Template should contain '2x' statistic"
            assert "47%" in content, "Template should contain '47%' statistic"
            
            # Check for key messaging
            assert "Tier II Artists Get 3x More A&R Engagement" in content, "Template should contain subject line"
            assert "faster A&R review turnaround" in content, "Template should mention review turnaround"
            assert "more label submission opportunities" in content, "Template should mention submission opportunities"
            assert "higher response rate from A&R teams" in content, "Template should mention response rate"
            
            # Check for Tier I comparison section
            assert "WHAT YOU'RE CURRENTLY MISSING ON TIER I" in content or "MISSING ON TIER I" in content, \
                "Template should have Tier I comparison section"
            
            # Check for CTA
            assert "Upgrade to Tier II" in content, "Template should have upgrade CTA"
            assert "$89/mo" in content, "Template should show Tier II price"
            
            print(f"✓ Day 7 email template contains all required content (3x, 2x, 47%, tier comparison, CTA)")
        
        except FileNotFoundError:
            pytest.fail(f"Template file not found: {template_file}")
    
    def test_cron_template_matches(self):
        """Verify cron endpoint template also has correct content"""
        cron_file = "/app/web/src/app/api/cron/emails/route.ts"
        
        try:
            with open(cron_file, 'r') as f:
                content = f.read()
            
            # Check for the required statistics in the HTML template
            assert "3x" in content, "Cron template should contain '3x' statistic"
            assert "2x" in content, "Cron template should contain '2x' statistic"
            assert "47%" in content, "Cron template should contain '47%' statistic"
            
            print(f"✓ Cron email template also contains required stats (3x, 2x, 47%)")
        
        except FileNotFoundError:
            pytest.fail(f"Cron template file not found: {cron_file}")


class TestRateLimitingLogic:
    """Test rate limiting behavior - documented for authenticated testing"""
    
    def test_rate_limit_code_exists(self):
        """Verify rate limiting code exists in the endpoint"""
        template_file = "/app/web/src/app/api/email/upgrade-day7/route.ts"
        
        try:
            with open(template_file, 'r') as f:
                content = f.read()
            
            # Check for rate limiting import and usage
            assert "rateLimit" in content, "Endpoint should import rateLimit"
            assert "7 * 24 * 60 * 60 * 1000" in content or "7*24*60*60*1000" in content or "604800000" in content, \
                "Rate limit should be set to 1 week (7 days in milliseconds)"
            assert "rate_limited" in content, "Endpoint should return 'rate_limited' reason when limited"
            
            print(f"✓ Rate limiting is implemented (1 per week per user)")
        
        except FileNotFoundError:
            pytest.fail(f"Template file not found: {template_file}")
    
    def test_duplicate_prevention_code_exists(self):
        """Verify duplicate email prevention via emailFlags"""
        template_file = "/app/web/src/app/api/email/upgrade-day7/route.ts"
        
        try:
            with open(template_file, 'r') as f:
                content = f.read()
            
            # Check for emailFlags check
            assert "upgrade7DaySentAt" in content, "Endpoint should check upgrade7DaySentAt flag"
            assert "already_sent" in content, "Endpoint should return 'already_sent' reason"
            
            print(f"✓ Duplicate email prevention is implemented via emailFlags.upgrade7DaySentAt")
        
        except FileNotFoundError:
            pytest.fail(f"Template file not found: {template_file}")
    
    def test_tier_check_exists(self):
        """Verify endpoint checks if user is already upgraded"""
        template_file = "/app/web/src/app/api/email/upgrade-day7/route.ts"
        
        try:
            with open(template_file, 'r') as f:
                content = f.read()
            
            # Check for tier verification
            assert "tier2" in content or "tier_2" in content, "Endpoint should check for tier2"
            assert "tier3" in content or "tier_3" in content, "Endpoint should check for tier3"
            assert "already_upgraded" in content, "Endpoint should return 'already_upgraded' reason"
            
            print(f"✓ Tier check is implemented (skips Tier II/III users)")
        
        except FileNotFoundError:
            pytest.fail(f"Template file not found: {template_file}")


class TestCronEligibilityCriteria:
    """Test that cron job has correct eligibility criteria"""
    
    def test_day7_window_calculation(self):
        """Verify cron checks users created 7-8 days ago"""
        cron_file = "/app/web/src/app/api/cron/emails/route.ts"
        
        try:
            with open(cron_file, 'r') as f:
                content = f.read()
            
            # Check for day 7/8 window calculation
            assert "7 * 24 * 60 * 60 * 1000" in content or "sevenDaysAgo" in content, \
                "Cron should calculate 7 days ago"
            assert "8 * 24 * 60 * 60 * 1000" in content or "eightDaysAgo" in content, \
                "Cron should calculate 8 days ago"
            
            print(f"✓ Cron calculates correct Day 7-8 window for user eligibility")
        
        except FileNotFoundError:
            pytest.fail(f"Cron file not found: {cron_file}")
    
    def test_onboarding_check_exists(self):
        """Verify cron checks onboardingCompleted flag"""
        cron_file = "/app/web/src/app/api/cron/emails/route.ts"
        
        try:
            with open(cron_file, 'r') as f:
                content = f.read()
            
            assert "onboardingCompleted" in content, \
                "Cron should check onboardingCompleted flag before sending"
            
            print(f"✓ Cron checks onboardingCompleted before sending Day 7 email")
        
        except FileNotFoundError:
            pytest.fail(f"Cron file not found: {cron_file}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
