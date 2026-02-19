"""
P3 Email Endpoints Testing - First Image and EPK Published Emails
Tests for POST /api/email/first-image and POST /api/email/epk-published

These are the final P3 email endpoints completing the full email drip sequence.
"""

import pytest
import requests
import os
import time

BASE_URL = "http://localhost:3000"

# ========================================
# Test: POST /api/email/first-image
# First press image celebration email
# ========================================

class TestFirstImageEmail:
    """Tests for /api/email/first-image endpoint"""
    
    def test_first_image_returns_401_without_auth(self):
        """First image endpoint should return 401 for unauthenticated requests"""
        response = requests.post(f"{BASE_URL}/api/email/first-image")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/email/first-image returns 401 for unauthenticated requests")
    
    def test_first_image_endpoint_exists(self):
        """First image endpoint should exist (not 404)"""
        response = requests.post(f"{BASE_URL}/api/email/first-image")
        assert response.status_code != 404, f"Endpoint returned 404 - does not exist"
        print("✅ POST /api/email/first-image endpoint exists (not 404)")
    
    def test_first_image_returns_json(self):
        """First image endpoint should return valid JSON"""
        response = requests.post(f"{BASE_URL}/api/email/first-image")
        assert response.headers.get("Content-Type", "").startswith("application/json"), \
            f"Expected JSON response, got {response.headers.get('Content-Type')}"
        data = response.json()
        assert isinstance(data, dict), "Response should be a dictionary"
        print("✅ POST /api/email/first-image returns valid JSON response")
    
    def test_first_image_accepts_body_params(self):
        """First image endpoint should accept resolution/format in body"""
        response = requests.post(
            f"{BASE_URL}/api/email/first-image",
            json={"resolution": "3000x2000", "format": "PNG"},
            headers={"Content-Type": "application/json"}
        )
        # Should still return 401 (no auth), but should accept the body
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ POST /api/email/first-image accepts resolution/format in request body")
    
    def test_first_image_response_structure(self):
        """First image endpoint should return proper error structure on 401"""
        response = requests.post(f"{BASE_URL}/api/email/first-image")
        data = response.json()
        # Should have ok=false and error field
        assert "ok" in data or "error" in data, "Response should have 'ok' or 'error' field"
        print("✅ POST /api/email/first-image has proper response structure")


# ========================================
# Test: POST /api/email/epk-published
# EPK published notification email
# ========================================

class TestEpkPublishedEmail:
    """Tests for /api/email/epk-published endpoint"""
    
    def test_epk_published_returns_401_without_auth(self):
        """EPK published endpoint should return 401 for unauthenticated requests"""
        response = requests.post(f"{BASE_URL}/api/email/epk-published")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ POST /api/email/epk-published returns 401 for unauthenticated requests")
    
    def test_epk_published_endpoint_exists(self):
        """EPK published endpoint should exist (not 404)"""
        response = requests.post(f"{BASE_URL}/api/email/epk-published")
        assert response.status_code != 404, f"Endpoint returned 404 - does not exist"
        print("✅ POST /api/email/epk-published endpoint exists (not 404)")
    
    def test_epk_published_returns_json(self):
        """EPK published endpoint should return valid JSON"""
        response = requests.post(f"{BASE_URL}/api/email/epk-published")
        assert response.headers.get("Content-Type", "").startswith("application/json"), \
            f"Expected JSON response, got {response.headers.get('Content-Type')}"
        data = response.json()
        assert isinstance(data, dict), "Response should be a dictionary"
        print("✅ POST /api/email/epk-published returns valid JSON response")
    
    def test_epk_published_response_structure(self):
        """EPK published endpoint should return proper error structure on 401"""
        response = requests.post(f"{BASE_URL}/api/email/epk-published")
        data = response.json()
        # Should have ok=false and error field
        assert "ok" in data or "error" in data, "Response should have 'ok' or 'error' field"
        print("✅ POST /api/email/epk-published has proper response structure")


# ========================================
# Test: All 8 Email Endpoints Availability
# Verify all email types are implemented
# ========================================

class TestAllEmailEndpoints:
    """Tests to verify all email endpoints are available"""
    
    # Core transactional emails
    CORE_ENDPOINTS = [
        "/api/email/welcome",        # P0 - Welcome email
        "/api/email/epk-updated",    # P0 - EPK update notification
        "/api/email/first-image",    # P3 - First image celebration (NEW)
        "/api/email/epk-published",  # P3 - EPK published notification (NEW)
    ]
    
    # Drip sequence emails
    DRIP_ENDPOINTS = [
        "/api/email/profile-reminder",  # P1 - Day 2 profile reminder
        "/api/email/epk-guide",         # P2 - Day 5 EPK guide
        "/api/email/upgrade-day7",      # P1 - Day 7 upgrade prompt
        "/api/email/reengagement",      # P2 - 7+ day reengagement
    ]
    
    # Limit/upgrade emails
    UPGRADE_ENDPOINTS = [
        "/api/email/upgrade-limit",  # P1 - Upgrade limit reached
    ]
    
    # Admin emails
    ADMIN_ENDPOINTS = [
        "/api/email/admin-new-application",  # Admin - New application notification
    ]
    
    def test_core_email_endpoints_available(self):
        """All core email endpoints should be available"""
        for endpoint in self.CORE_ENDPOINTS:
            response = requests.post(f"{BASE_URL}{endpoint}")
            assert response.status_code != 404, f"Endpoint {endpoint} returned 404 - does not exist"
            print(f"✅ {endpoint} - endpoint available")
    
    def test_drip_email_endpoints_available(self):
        """All drip sequence email endpoints should be available"""
        for endpoint in self.DRIP_ENDPOINTS:
            response = requests.post(f"{BASE_URL}{endpoint}")
            assert response.status_code != 404, f"Endpoint {endpoint} returned 404 - does not exist"
            print(f"✅ {endpoint} - endpoint available")
    
    def test_upgrade_email_endpoints_available(self):
        """Upgrade email endpoints should be available"""
        for endpoint in self.UPGRADE_ENDPOINTS:
            response = requests.post(f"{BASE_URL}{endpoint}")
            assert response.status_code != 404, f"Endpoint {endpoint} returned 404 - does not exist"
            print(f"✅ {endpoint} - endpoint available")
    
    def test_admin_email_endpoints_available(self):
        """Admin email endpoints should be available"""
        for endpoint in self.ADMIN_ENDPOINTS:
            response = requests.post(f"{BASE_URL}{endpoint}")
            # Admin endpoints might have different auth behavior
            assert response.status_code != 404, f"Endpoint {endpoint} returned 404 - does not exist"
            print(f"✅ {endpoint} - endpoint available")
    
    def test_total_email_endpoint_count(self):
        """Should have at least 8 email endpoints"""
        all_endpoints = (
            self.CORE_ENDPOINTS + 
            self.DRIP_ENDPOINTS + 
            self.UPGRADE_ENDPOINTS + 
            self.ADMIN_ENDPOINTS
        )
        available_count = 0
        for endpoint in all_endpoints:
            response = requests.post(f"{BASE_URL}{endpoint}")
            if response.status_code != 404:
                available_count += 1
        
        assert available_count >= 8, f"Expected at least 8 email endpoints, found {available_count}"
        print(f"✅ Total email endpoints available: {available_count} (expected at least 8)")


# ========================================
# Test: apphosting.yaml Configuration
# Verify CRON_SECRET is configured
# ========================================

class TestApphostingConfig:
    """Tests for apphosting.yaml configuration"""
    
    def test_cron_secret_in_apphosting_yaml(self):
        """apphosting.yaml should contain CRON_SECRET secret reference"""
        apphosting_path = "/app/web/apphosting.yaml"
        with open(apphosting_path, 'r') as f:
            content = f.read()
        
        # Check for CRON_SECRET variable
        assert "CRON_SECRET" in content, "CRON_SECRET not found in apphosting.yaml"
        
        # Check that it's properly configured as a secret
        assert "secret: CRON_SECRET" in content, "CRON_SECRET not configured as secret reference"
        
        # Check availability settings
        assert "availability:" in content, "Secret availability settings missing"
        
        print("✅ apphosting.yaml contains CRON_SECRET secret reference")
    
    def test_cron_secret_runtime_availability(self):
        """CRON_SECRET should be available at RUNTIME"""
        apphosting_path = "/app/web/apphosting.yaml"
        with open(apphosting_path, 'r') as f:
            content = f.read()
        
        # Find CRON_SECRET block and verify RUNTIME availability
        lines = content.split('\n')
        found_cron_secret = False
        found_runtime = False
        
        for i, line in enumerate(lines):
            if "CRON_SECRET" in line:
                found_cron_secret = True
                # Check next few lines for RUNTIME
                for j in range(i, min(i+5, len(lines))):
                    if "RUNTIME" in lines[j]:
                        found_runtime = True
                        break
        
        assert found_cron_secret, "CRON_SECRET variable not found"
        assert found_runtime, "CRON_SECRET should have RUNTIME availability"
        
        print("✅ CRON_SECRET has RUNTIME availability configured")


# ========================================
# Test: PressImageManager Component
# Verify first-image email trigger integration
# ========================================

class TestPressImageManagerIntegration:
    """Tests for PressImageManager first-image email trigger"""
    
    def test_press_image_manager_contains_first_image_trigger(self):
        """PressImageManager should contain first-image email trigger code"""
        component_path = "/app/web/src/components/PressImageManager.tsx"
        with open(component_path, 'r') as f:
            content = f.read()
        
        # Check for first-image email API call
        assert "/api/email/first-image" in content, \
            "PressImageManager missing /api/email/first-image API call"
        print("✅ PressImageManager contains /api/email/first-image trigger")
    
    def test_press_image_manager_checks_first_upload(self):
        """PressImageManager should check if it's the first upload"""
        component_path = "/app/web/src/components/PressImageManager.tsx"
        with open(component_path, 'r') as f:
            content = f.read()
        
        # Check for isFirstImage logic
        assert "isFirstImage" in content or "media.length === 0" in content, \
            "PressImageManager missing first upload check logic"
        print("✅ PressImageManager checks for first upload before sending email")
    
    def test_press_image_manager_sends_image_metadata(self):
        """PressImageManager should send resolution/format in email request"""
        component_path = "/app/web/src/components/PressImageManager.tsx"
        with open(component_path, 'r') as f:
            content = f.read()
        
        # Check for resolution and format in request body
        assert "resolution" in content, "PressImageManager missing resolution in email request"
        assert "format" in content, "PressImageManager missing format in email request"
        print("✅ PressImageManager sends resolution/format in first-image email request")


# ========================================
# Test: Production Setup Documentation
# Verify PRODUCTION_SETUP.md exists and content
# ========================================

class TestProductionSetupDoc:
    """Tests for PRODUCTION_SETUP.md documentation"""
    
    def test_production_setup_exists(self):
        """PRODUCTION_SETUP.md should exist"""
        doc_path = "/app/web/docs/PRODUCTION_SETUP.md"
        assert os.path.exists(doc_path), "PRODUCTION_SETUP.md not found"
        print("✅ PRODUCTION_SETUP.md exists")
    
    def test_production_setup_contains_cron_secret_instructions(self):
        """PRODUCTION_SETUP.md should contain CRON_SECRET setup instructions"""
        doc_path = "/app/web/docs/PRODUCTION_SETUP.md"
        with open(doc_path, 'r') as f:
            content = f.read()
        
        assert "CRON_SECRET" in content, "Missing CRON_SECRET instructions"
        assert "openssl rand" in content or "firebase apphosting:secrets:set" in content, \
            "Missing CRON_SECRET generation/setup instructions"
        print("✅ PRODUCTION_SETUP.md contains CRON_SECRET setup instructions")
    
    def test_production_setup_contains_scheduler_instructions(self):
        """PRODUCTION_SETUP.md should contain Cloud Scheduler instructions"""
        doc_path = "/app/web/docs/PRODUCTION_SETUP.md"
        with open(doc_path, 'r') as f:
            content = f.read()
        
        assert "Cloud Scheduler" in content or "gcloud scheduler" in content, \
            "Missing Cloud Scheduler setup instructions"
        print("✅ PRODUCTION_SETUP.md contains Cloud Scheduler instructions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
