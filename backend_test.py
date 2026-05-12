#!/usr/bin/env python3
"""
Backend API Tests for PromptScore Phase 4
Tests all endpoints at https://prompt-grade.preview.emergentagent.com/api
"""

import requests
import json
import sys

BASE_URL = "https://prompt-grade.preview.emergentagent.com/api"

def test_setup_db():
    """Test GET /api/setup-db endpoint"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/setup-db")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/setup-db", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        data = response.json()
        
        # Check if response has expected structure
        if 'success' in data:
            if data['success'] is True and 'message' in data:
                print("✅ PASS: Table ready response received")
                return True
            elif data['success'] is False and data.get('needsManualSetup') is True and 'sql' in data:
                print("✅ PASS: Manual setup required response received (expected)")
                return True
            else:
                print("❌ FAIL: Unexpected success response structure")
                return False
        else:
            print("❌ FAIL: Response missing 'success' field")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred - {str(e)}")
        return False


def test_improve_prompt_basic():
    """Test POST /api/improve-prompt with basic prompt"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/improve-prompt (basic prompt)")
    print("="*80)
    
    try:
        payload = {"prompt": "Help me write a blog post about AI"}
        print(f"Request Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/improve-prompt",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data.get('success') is True and 'improvedPrompt' in data:
            improved = data['improvedPrompt']
            if len(improved) > len(payload['prompt']):
                print(f"✅ PASS: Received improved prompt ({len(improved)} chars vs {len(payload['prompt'])} chars)")
                print(f"Improved Prompt Preview: {improved[:200]}...")
                return True
            else:
                print("❌ FAIL: Improved prompt is not longer than original")
                return False
        else:
            print("❌ FAIL: Response missing 'success' or 'improvedPrompt' field")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred - {str(e)}")
        return False


def test_improve_prompt_rich():
    """Test POST /api/improve-prompt with richer prompt"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/improve-prompt (richer prompt)")
    print("="*80)
    
    try:
        payload = {"prompt": "You are an expert. Write me a summary about machine learning."}
        print(f"Request Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/improve-prompt",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data.get('success') is True and 'improvedPrompt' in data:
            improved = data['improvedPrompt']
            print(f"✅ PASS: Received detailed improved prompt ({len(improved)} chars)")
            print(f"Improved Prompt Preview: {improved[:200]}...")
            return True
        else:
            print("❌ FAIL: Response missing 'success' or 'improvedPrompt' field")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred - {str(e)}")
        return False


def test_improve_prompt_empty():
    """Test POST /api/improve-prompt with empty prompt (error case)"""
    print("\n" + "="*80)
    print("TEST 4: POST /api/improve-prompt (empty prompt - error case)")
    print("="*80)
    
    try:
        payload = {"prompt": ""}
        print(f"Request Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/improve-prompt",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 400:
            print(f"❌ FAIL: Expected status 400, got {response.status_code}")
            return False
        
        data = response.json()
        
        if 'error' in data and data['error'] == 'Prompt required':
            print("✅ PASS: Correct error response for empty prompt")
            return True
        else:
            print("❌ FAIL: Expected error message 'Prompt required'")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred - {str(e)}")
        return False


def test_save_lead_valid():
    """Test POST /api/save-lead with valid data"""
    print("\n" + "="*80)
    print("TEST 5: POST /api/save-lead (valid email)")
    print("="*80)
    
    try:
        payload = {"email": "test@example.com", "score": 75}
        print(f"Request Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/save-lead",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # According to review_request: should return success:true even if table doesn't exist
        if data.get('success') is True:
            print("✅ PASS: Lead save returned success (graceful handling)")
            return True
        else:
            print("❌ FAIL: Expected success:true in response")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred - {str(e)}")
        return False


def test_save_lead_invalid():
    """Test POST /api/save-lead with invalid email (error case)"""
    print("\n" + "="*80)
    print("TEST 6: POST /api/save-lead (invalid email - error case)")
    print("="*80)
    
    try:
        payload = {"email": "", "score": 50}
        print(f"Request Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/save-lead",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code != 400:
            print(f"❌ FAIL: Expected status 400, got {response.status_code}")
            return False
        
        data = response.json()
        
        if 'error' in data and data['error'] == 'Email required':
            print("✅ PASS: Correct error response for empty email")
            return True
        else:
            print("❌ FAIL: Expected error message 'Email required'")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred - {str(e)}")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("PROMPTSCORE PHASE 4 - BACKEND API TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    
    results = []
    
    # Run all tests
    results.append(("GET /api/setup-db", test_setup_db()))
    results.append(("POST /api/improve-prompt (basic)", test_improve_prompt_basic()))
    results.append(("POST /api/improve-prompt (rich)", test_improve_prompt_rich()))
    results.append(("POST /api/improve-prompt (empty)", test_improve_prompt_empty()))
    results.append(("POST /api/save-lead (valid)", test_save_lead_valid()))
    results.append(("POST /api/save-lead (invalid)", test_save_lead_invalid()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
