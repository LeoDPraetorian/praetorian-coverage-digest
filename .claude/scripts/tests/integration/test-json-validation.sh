#!/bin/bash
# Test script for uniform JSON validation system

# Source the path utilities with JSON validation functions
source "$(dirname "${BASH_SOURCE[0]}")/lib/path-utils.sh"

echo "=== Testing Uniform JSON Validation System ==="
echo ""

# Create test directory
TEST_DIR="/tmp/einstein-json-validation-test"
mkdir -p "${TEST_DIR}"

# Test 1: Agent Assignments Validation
echo "1. Testing Agent Assignments validation..."
cat > "${TEST_DIR}/agent-assignments.json" << 'EOF'
{
  "feature_id": "test-feature",
  "execution_strategy": "parallel",
  "assignments": [
    {
      "agent": "golang-api-developer",
      "domain": "backend",
      "tasks": ["Implement API endpoints"]
    }
  ]
}
EOF

if validate_json_comprehensive "${TEST_DIR}/agent-assignments.json" "Test Agent Assignments" "agent_assignments"; then
    echo "✓ Agent assignments validation passed"
else
    echo "✗ Agent assignments validation failed"
    exit 1
fi
echo ""

# Test 2: Quality Coordination Plan Validation
echo "2. Testing Quality Coordination Plan validation..."
cat > "${TEST_DIR}/quality-plan.json" << 'EOF'
{
  "recommendation": "comprehensive_quality",
  "rationale": "High risk feature requires comprehensive review",
  "implementation_analysis": {
    "complexity": "Medium",
    "risk_level": "High"
  }
}
EOF

if validate_json_comprehensive "${TEST_DIR}/quality-plan.json" "Test Quality Plan" "quality_coordination_plan"; then
    echo "✓ Quality coordination plan validation passed"
else
    echo "✗ Quality coordination plan validation failed"
    exit 1
fi
echo ""

# Test 3: Security Coordination Plan Validation
echo "3. Testing Security Coordination Plan validation..."
cat > "${TEST_DIR}/security-plan.json" << 'EOF'
{
  "recommendation": "focused_security",
  "rationale": "Authentication changes require security review",
  "security_assessment": {
    "risk_level": "High",
    "threat_vectors": ["Authentication", "Authorization"]
  }
}
EOF

if validate_json_comprehensive "${TEST_DIR}/security-plan.json" "Test Security Plan" "security_coordination_plan"; then
    echo "✓ Security coordination plan validation passed"
else
    echo "✗ Security coordination plan validation failed"
    exit 1
fi
echo ""

# Test 4: Testing Coordination Plan Validation
echo "4. Testing Testing Coordination Plan validation..."
cat > "${TEST_DIR}/testing-plan.json" << 'EOF'
{
  "recommendation": "comprehensive_testing",
  "rationale": "Complex feature requires comprehensive test coverage",
  "implementation_analysis": {
    "complexity": "Complex",
    "risk_level": "High"
  }
}
EOF

if validate_json_comprehensive "${TEST_DIR}/testing-plan.json" "Test Testing Plan" "testing_coordination_plan"; then
    echo "✓ Testing coordination plan validation passed"
else
    echo "✗ Testing coordination plan validation failed"
    exit 1
fi
echo ""

# Test 5: Deployment Coordination Plan Validation  
echo "5. Testing Deployment Coordination Plan validation..."
cat > "${TEST_DIR}/deployment-plan.json" << 'EOF'
{
  "recommendation": "comprehensive_deployment",
  "rationale": "Production deployment requires validation",
  "deployment_assessment": {
    "risk_level": "Medium",
    "complexity_level": "Medium"
  }
}
EOF

if validate_json_comprehensive "${TEST_DIR}/deployment-plan.json" "Test Deployment Plan" "deployment_coordination_plan"; then
    echo "✓ Deployment coordination plan validation passed"
else
    echo "✗ Deployment coordination plan validation failed"
    exit 1
fi
echo ""

# Test 6: Error Handling - Invalid JSON
echo "6. Testing error handling with invalid JSON..."
echo '{"invalid": json}' > "${TEST_DIR}/invalid.json"
if validate_json_comprehensive "${TEST_DIR}/invalid.json" "Invalid JSON Test" "agent_assignments" 2>/dev/null; then
    echo "✗ Should have failed for invalid JSON"
    exit 1
else
    echo "✓ Correctly detected invalid JSON"
fi
echo ""

# Test 7: Error Handling - Missing Required Fields
echo "7. Testing error handling with missing fields..."
echo '{"feature_id": "test"}' > "${TEST_DIR}/missing-fields.json"
if validate_json_comprehensive "${TEST_DIR}/missing-fields.json" "Missing Fields Test" "agent_assignments" 2>/dev/null; then
    echo "✗ Should have failed for missing fields"
    exit 1
else
    echo "✓ Correctly detected missing required fields"
fi
echo ""

# Test 8: Error Handling - Invalid Enum Values
echo "8. Testing error handling with invalid enum values..."
cat > "${TEST_DIR}/invalid-enum.json" << 'EOF'
{
  "recommendation": "invalid_value",
  "rationale": "Test rationale",
  "implementation_analysis": {}
}
EOF

if validate_json_comprehensive "${TEST_DIR}/invalid-enum.json" "Invalid Enum Test" "quality_coordination_plan" 2>/dev/null; then
    echo "✗ Should have failed for invalid enum value"
    exit 1
else
    echo "✓ Correctly detected invalid enum value"
fi
echo ""

# Cleanup
rm -rf "${TEST_DIR}"

echo "=== All JSON validation tests passed! ==="
echo "✅ Uniform JSON validation system is fully functional"
echo ""
echo "Validation capabilities:"
echo "- JSON syntax validation"
echo "- Required fields validation"  
echo "- Enum value validation"
echo "- Array emptiness validation"
echo "- Type-specific comprehensive validation"
echo "- Consistent error messages"
echo "- User-friendly troubleshooting"