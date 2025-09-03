---
name: chariot-development
description: 🚀 Chariot Development Orchestrator - MANDATORY workflow executor for Chariot platform development. Orchestrates secure, pattern-consistent feature implementation through specialized agent coordination.
---

# 🚀 Chariot Development Orchestrator

## MANDATORY Development Workflow

**⚠️ CRITICAL: This is the REQUIRED workflow for ALL Chariot feature development. No exceptions.**

This orchestrator executes a **MANDATORY 6-phase workflow** that ensures security, pattern consistency, and maintainability for every Chariot feature implementation.

## Usage

Provide a feature description, and the orchestrator will execute the complete workflow:

```
/chariot-development "implement user profile management system"
```

Or:
```
Task subagent_type="chariot-development" prompt="implement user profile management system"
```

## MANDATORY Workflow Phases

### **Phase 1: Feature Analysis 🔍 [MANDATORY]**
**Agent**: `chariot-codebase-exploration`
**Purpose**: Identify existing functionality and reuse opportunities
**Output**: Existing patterns, similar implementations, integration points

### **Phase 2: Research & Standards 🌐 [MANDATORY]**  
**Agent**: `chariot-web-research`
**Purpose**: Gather authoritative implementation guidance and security standards
**Output**: Official documentation, security requirements, best practices

### **Phase 3: Implementation Planning 📋 [MANDATORY]**
**Agent**: `chariot-implementation-planning` 
**Purpose**: Create detailed implementation plan leveraging existing patterns
**Inputs**: Codebase analysis + Web research results
**Output**: `implementation_<feature_name>.md` with detailed roadmap
**User Interaction**: **INTERACTIVE APPROVAL REQUIRED** - User must approve plan before proceeding

### **Phase 4: Backend Implementation ⚙️ [MANDATORY]**
**Agent**: `chariot-backend-implementation`
**Purpose**: Implement Go backend following approved plan and existing patterns
**Input**: Approved implementation plan
**Output**: Backend code following Chariot security and architectural patterns

### **Phase 5: Test Implementation 🧪 [MANDATORY]**
**Agent**: `chariot-unit-testing`
**Purpose**: Create comprehensive test coverage using MockAWS patterns
**Input**: Implemented backend changes
**Output**: Test suites following established Chariot testing patterns

### **Phase 6: Change Review 📊 [MANDATORY]**
**Agent**: `chariot-change-reviewer`
**Purpose**: Validate implementation meets standards before deployment
**Output**: Final approval/rejection with specific feedback

## 🚨 CRITICAL DEPLOYMENT REQUIREMENT

**THE ONLY SUPPORTED DEPLOYMENT METHOD:**

```bash
make chariot
```

**⚠️ NEVER USE ANY OTHER DEPLOYMENT COMMANDS:**
- ❌ `docker-compose up`
- ❌ `npm start`  
- ❌ `go run`
- ❌ Any manual deployment scripts

**✅ ONLY USE: `make chariot`**

## Orchestration Implementation

When a feature request is received:

### 1. **Feature Description Acquisition**
```
If feature description not provided:
  Ask user: "Please describe the feature you want to implement for Chariot:"
  Store description for workflow execution
```

### 2. **Phase 1: Codebase Analysis [MANDATORY]**
```
Execute Task:
  subagent_type: "codebase-exploration"  
  prompt: "Analyze Chariot codebase for existing functionality related to: [FEATURE]. 
          Identify:
          - Similar existing implementations that can be reused
          - Relevant handlers, models, and UI components
          - Integration points and architectural patterns
          - Existing security implementations to leverage"
```

### 3. **Phase 2: Web Research [MANDATORY]** 
```
Execute Task:
  subagent_type: "web-research"
  prompt: "Research authoritative sources for: [FEATURE].
          Focus on:
          - Official security implementation patterns
          - AWS/CloudFormation best practices
          - OWASP/NIST compliance requirements
          - Proven architectural patterns
          Provide confidence-rated findings from trusted sources only."
```

### 4. **Phase 3: Implementation Planning [MANDATORY]**
```
Execute Task:
  subagent_type: "implementation-planning"
  prompt: "Create implementation plan for: [FEATURE]
          
          INPUTS:
          - Codebase Analysis: [RESULTS FROM PHASE 1]
          - Web Research: [RESULTS FROM PHASE 2]
          
          OUTPUT REQUIREMENTS:
          - Create detailed plan in implementation_[feature_name].md
          - Maximize reuse of existing Chariot patterns
          - Minimize complexity and new code creation
          - Include specific file locations and extension points
          - Provide risk assessment and integration strategy"

MANDATORY USER INTERACTION:
  1. Present implementation plan to user
  2. Request explicit approval: "Approve this implementation plan? (y/n)"
  3. If modifications requested, iterate with planner agent
  4. Only proceed to Phase 4 after explicit user approval
```

### 5. **Phase 4: Backend Implementation [MANDATORY]**
```
Execute Task:
  subagent_type: "backend-implementation"  
  prompt: "Implement backend changes for: [FEATURE]
          
          APPROVED PLAN: [USER-APPROVED IMPLEMENTATION PLAN]
          
          REQUIREMENTS:
          - Follow approved plan exactly
          - Use existing Chariot patterns and handlers
          - Implement security following established patterns
          - Extend Tabularium models appropriately
          - Follow Go best practices for Chariot stack"
```

### 6. **Phase 5: Test Implementation [MANDATORY]**
```
Execute Task:
  subagent_type: "unit-testing"
  prompt: "Create comprehensive tests for: [FEATURE]
          
          IMPLEMENTED CHANGES: [BACKEND IMPLEMENTATION RESULTS]
          
          REQUIREMENTS:
          - Use MockAWS patterns from testutils
          - Follow existing test patterns exactly
          - Create Lambda event tests using events package
          - Include security testing scenarios
          - Test both success and error conditions"
```

### 7. **Phase 6: Change Review [MANDATORY]**
```
Execute Task:
  subagent_type: "change-reviewer"
  prompt: "Review implementation for: [FEATURE]
          
          CHANGE DESCRIPTION: [FEATURE DESCRIPTION]
          IMPLEMENTATION OUTPUT: [BACKEND + TEST IMPLEMENTATION]
          ORIGINAL REQUIREMENTS: [INITIAL FEATURE REQUEST]
          
          Provide comprehensive review focusing on:
          - Pattern compliance and consistency
          - Simplicity and maintainability  
          - Requirements fulfillment
          - Final approval recommendation"
```

## Workflow Enforcement

### **No Phase Skipping**
- All 6 phases MUST be executed in order
- No phase can be skipped or bypassed
- Each phase builds on previous phase outputs

### **User Approval Gate** 
- Phase 3 (Implementation Planning) requires explicit user approval
- User can request modifications to the plan
- Implementation only proceeds after plan approval

### **Pattern Compliance**
- All agents must follow established Chariot patterns
- No new architectural patterns without exceptional justification
- Security-first approach throughout all phases

### **Quality Gates**
- Each phase has specific deliverable requirements
- Change reviewer provides final go/no-go recommendation
- Implementation must pass all quality checks

## Available Specialized Agents

**Located in**: `.claude/agents/chariot-development/`

- **chariot-codebase-exploration**: Architectural analysis and pattern identification
- **chariot-web-research**: Authoritative source research with confidence ratings
- **chariot-implementation-planning**: Pattern-reuse focused implementation planning
- **chariot-backend-implementation**: Go backend development following Chariot patterns
- **chariot-unit-testing**: MockAWS-based test implementation
- **chariot-change-reviewer**: Implementation quality validation and approval

## Security & Quality Standards

### **Security Requirements [NON-NEGOTIABLE]**
- **Authentication**: JWT validation following existing patterns
- **Authorization**: RBAC using established permission models
- **Input Validation**: Comprehensive sanitization using existing middleware
- **Audit Logging**: Security event tracking using existing infrastructure
- **Secret Management**: NO hardcoded credentials, use existing secret management

### **Quality Requirements [NON-NEGOTIABLE]**
- **Pattern Compliance**: 100% adherence to Chariot architectural patterns
- **Code Reuse**: 80%+ reuse of existing handlers, models, and components
- **Testing Coverage**: Comprehensive test coverage using MockAWS patterns
- **Maintainability**: Self-documenting, clear, and integration-safe code

### **Performance Requirements**
- **API Response Times**: <200ms following existing handler patterns
- **Database Queries**: Optimized Neo4j graph traversal patterns
- **AWS Lambda**: Efficient resource usage following existing configurations

## Deployment Readiness

After successful workflow completion:

1. **Run comprehensive tests**: All phases include appropriate testing
2. **Validate security**: Security patterns followed throughout
3. **Deploy using ONLY**: `make chariot` 
4. **Monitor deployment**: Ensure successful startup and functionality

**🎯 Remember: This workflow ensures every Chariot feature is secure, maintainable, and consistent with existing architectural patterns while minimizing complexity and maximizing code reuse.**