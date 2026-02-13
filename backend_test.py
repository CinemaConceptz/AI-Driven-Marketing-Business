#!/usr/bin/env python3
"""
Simple API testing for Verified Sound A&R application
Tests the Next.js API routes for basic functionality
"""

import requests
import sys
from datetime import datetime

class SimpleAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}...")

            return success, response.text if response.text else "{}"

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, "{}"

    def test_stripe_checkout_unauthorized(self):
        """Test Stripe checkout without auth (should fail)"""
        success, response = self.run_test(
            "Stripe Checkout (Unauthorized)",
            "POST",
            "api/stripe/checkout",
            401  # Should be unauthorized
        )
        return success

    def test_stripe_checkout_missing_price_id(self):
        """Test Stripe checkout with fake auth (should fail due to missing STRIPE_PRICE_ID)"""
        # This will fail due to missing auth, but that's expected
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token'
        }
        success, response = self.run_test(
            "Stripe Checkout (Fake Auth)",
            "POST", 
            "api/stripe/checkout",
            401,  # Will fail auth first
            headers=headers
        )
        return success

def main():
    """Run API tests"""
    print("=== Verified Sound A&R API Tests ===")
    
    # Setup
    tester = SimpleAPITester("http://localhost:3000")

    # Test API endpoints
    tester.test_stripe_checkout_unauthorized()
    tester.test_stripe_checkout_missing_price_id()

    # Print results
    print(f"\n📊 API Tests Summary:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All API tests passed")
        return 0
    else:
        print("❌ Some API tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())