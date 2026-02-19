"""
Test email API endpoints for Phase 6C - P0 Email Implementation
Tests:
1. POST /api/email/welcome - Welcome email endpoint
2. POST /api/email/upgrade-limit - Upgrade limit email endpoint

Both endpoints require Firebase Auth tokens.
Note: Postmark API may not be configured in preview env, so actual sending may fail,
but the endpoint structure and auth handling should be testable.
"""
import pytest
import requests
import os
import json

# Use the preview URL
BASE_URL = "http://localhost:3000"

class TestEmailEndpointsNoAuth:
    """Test email endpoints without authentication - should return 401"""
    
    def test_welcome_email_no_auth(self):
        """Welcome email endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email/welcome",
            headers={"Content-Type": "application/json"}
        )
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False, "Expected ok=false for unauthorized request"
        print(f"✓ Welcome email endpoint correctly returns 401 for unauthenticated requests")
    
    def test_upgrade_limit_email_no_auth(self):
        """Upgrade limit email endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-limit",
            headers={"Content-Type": "application/json"},
            json={"limitType": "press_images", "currentValue": "3/3 images"}
        )
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False, "Expected ok=false for unauthorized request"
        print(f"✓ Upgrade limit email endpoint correctly returns 401 for unauthenticated requests")


class TestEmailEndpointsInvalidAuth:
    """Test email endpoints with invalid/malformed authentication"""
    
    def test_welcome_email_invalid_token(self):
        """Welcome email endpoint should reject invalid tokens"""
        response = requests.post(
            f"{BASE_URL}/api/email/welcome",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid_token_12345"
            }
        )
        # Should return 401 Unauthorized for invalid token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False
        print(f"✓ Welcome email endpoint correctly rejects invalid tokens")
    
    def test_upgrade_limit_email_invalid_token(self):
        """Upgrade limit email endpoint should reject invalid tokens"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-limit",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid_token_12345"
            },
            json={"limitType": "press_images", "currentValue": "3/3 images"}
        )
        # Should return 401 Unauthorized for invalid token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == False
        print(f"✓ Upgrade limit email endpoint correctly rejects invalid tokens")
    
    def test_welcome_email_malformed_auth_header(self):
        """Welcome email endpoint should handle malformed auth header"""
        response = requests.post(
            f"{BASE_URL}/api/email/welcome",
            headers={
                "Content-Type": "application/json",
                "Authorization": "NotBearer token"
            }
        )
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Welcome email endpoint correctly handles malformed auth header")


class TestEmailEndpointStructure:
    """Test that email endpoints exist and have correct response structure"""
    
    def test_welcome_endpoint_exists(self):
        """Verify /api/email/welcome endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/email/welcome",
            headers={"Content-Type": "application/json"}
        )
        # Should not return 404
        assert response.status_code != 404, "Welcome email endpoint should exist"
        print(f"✓ Welcome email endpoint exists at /api/email/welcome")
    
    def test_upgrade_limit_endpoint_exists(self):
        """Verify /api/email/upgrade-limit endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-limit",
            headers={"Content-Type": "application/json"}
        )
        # Should not return 404
        assert response.status_code != 404, "Upgrade limit email endpoint should exist"
        print(f"✓ Upgrade limit email endpoint exists at /api/email/upgrade-limit")
    
    def test_welcome_returns_json(self):
        """Verify welcome endpoint returns JSON response"""
        response = requests.post(
            f"{BASE_URL}/api/email/welcome",
            headers={"Content-Type": "application/json"}
        )
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"
        # Should be valid JSON
        data = response.json()
        assert isinstance(data, dict), "Response should be a JSON object"
        print(f"✓ Welcome email endpoint returns valid JSON")
    
    def test_upgrade_limit_returns_json(self):
        """Verify upgrade limit endpoint returns JSON response"""
        response = requests.post(
            f"{BASE_URL}/api/email/upgrade-limit",
            headers={"Content-Type": "application/json"}
        )
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"
        # Should be valid JSON
        data = response.json()
        assert isinstance(data, dict), "Response should be a JSON object"
        print(f"✓ Upgrade limit email endpoint returns valid JSON")


class TestEmailEndpointMethods:
    """Test that email endpoints only accept POST method"""
    
    def test_welcome_get_not_allowed(self):
        """Welcome email endpoint should not allow GET requests"""
        response = requests.get(f"{BASE_URL}/api/email/welcome")
        # Should return 405 Method Not Allowed or similar
        assert response.status_code in [405, 404, 401], f"GET should not be allowed, got {response.status_code}"
        print(f"✓ Welcome email endpoint correctly rejects GET requests (status: {response.status_code})")
    
    def test_upgrade_limit_get_not_allowed(self):
        """Upgrade limit email endpoint should not allow GET requests"""
        response = requests.get(f"{BASE_URL}/api/email/upgrade-limit")
        # Should return 405 Method Not Allowed or similar
        assert response.status_code in [405, 404, 401], f"GET should not be allowed, got {response.status_code}"
        print(f"✓ Upgrade limit email endpoint correctly rejects GET requests (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
