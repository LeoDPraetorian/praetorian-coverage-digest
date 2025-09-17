---
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(git remote show:*), Read, Glob, Grep, LS, Task
description: Complete a security review of the pending changes on the current branch
---

You are a senior security engineer conducting a focused security review of the changes on this branch.

## Context Detection and Analysis Mode Selection

**Arguments provided**: $ARGUMENTS

```bash
# Intelligent context detection for dual-mode operation
SECURITY_CONTEXT_MODE="standalone"
FEATURE_CONTEXT_AVAILABLE=false

echo "=== Security Review Context Detection ==="

# Mode 1: Explicit feature ID provided (Einstein pipeline)
if [[ "$ARGUMENTS" =~ ^[a-z0-9-]+_[0-9]{8}_[0-9]{6}$ ]]; then
    FEATURE_ID="$ARGUMENTS"
    FEATURE_DIR=".claude/features/${FEATURE_ID}"
    if [ -d "$FEATURE_DIR" ]; then
        SECURITY_CONTEXT_MODE="einstein_pipeline"
        FEATURE_CONTEXT_AVAILABLE=true
        echo "🎯 **EINSTEIN PIPELINE MODE**: Feature workspace detected"
        echo "   Feature ID: ${FEATURE_ID}"
        echo "   Workspace: ${FEATURE_DIR}"
    fi

# Mode 2: Current feature active (Einstein pipeline)
elif [ -f ".claude/features/current_feature.env" ]; then
    source .claude/features/current_feature.env
    if [ -d ".claude/features/${FEATURE_ID}" ]; then
        FEATURE_DIR=".claude/features/${FEATURE_ID}"
        SECURITY_CONTEXT_MODE="einstein_pipeline"
        FEATURE_CONTEXT_AVAILABLE=true
        echo "🎯 **EINSTEIN PIPELINE MODE**: Current feature workspace detected"
        echo "   Feature ID: ${FEATURE_ID}"
        echo "   Workspace: ${FEATURE_DIR}"
    fi

# Mode 3: Check if recent changes match any feature (Smart detection)
elif [ -d ".claude/features" ]; then
    echo "🔍 Checking if git changes match any recent feature development..."
    
    # Get changed files
    CHANGED_FILES=$(git diff --name-only origin/HEAD... 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null || echo "")
    
    # Look for features with recent implementation activity
    RECENT_FEATURE=$(find .claude/features -name "metadata.json" -newermt "$(date -d '7 days ago' +%Y-%m-%d)" -exec dirname {} \; | head -1 | xargs basename 2>/dev/null || echo "")
    
    if [ -n "$RECENT_FEATURE" ] && [ -d ".claude/features/${RECENT_FEATURE}/implementation" ]; then
        echo "   📋 Recent feature found: ${RECENT_FEATURE}"
        echo "   Checking if changes relate to this feature..."
        
        # Basic heuristic: if some changed files are in implementation workspace, likely related
        IMPLEMENTATION_DIR=".claude/features/${RECENT_FEATURE}/implementation"
        if [ -d "$IMPLEMENTATION_DIR" ]; then
            FEATURE_ID="$RECENT_FEATURE"
            FEATURE_DIR=".claude/features/${FEATURE_ID}"
            SECURITY_CONTEXT_MODE="einstein_pipeline"
            FEATURE_CONTEXT_AVAILABLE=true
            echo "🎯 **EINSTEIN PIPELINE MODE**: Changes appear related to recent feature"
            echo "   Feature ID: ${FEATURE_ID}"
        fi
    fi
fi

# Mode 4: Standalone mode (existing behavior)
if [ "$FEATURE_CONTEXT_AVAILABLE" = false ]; then
    echo "📋 **STANDALONE MODE**: No feature context detected"
    echo "   Using git-only security analysis (existing behavior)"
    echo "   This maintains full backward compatibility"
fi

echo "========================================"
```

## Security Analysis Context

**Security Review Mode**: ${SECURITY_CONTEXT_MODE}

### Git Changes Analysis (Always Available)

GIT STATUS:

```
!`git status`
```

FILES MODIFIED:

```
!`git diff --name-only origin/HEAD...`
```

COMMITS:

```
!`git log --no-decorate origin/HEAD...`
```

DIFF CONTENT:

```
!`git diff --merge-base origin/HEAD`
```

Review the complete diff above. This contains all code changes in the PR.

### Feature Context Analysis (When Available)

```bash
if [ "$FEATURE_CONTEXT_AVAILABLE" = true ]; then
    echo "=== ENHANCED CONTEXT AVAILABLE ==="
    echo "Feature workspace: ${FEATURE_DIR}"
    
    # Display available context sources
    echo "Available context sources:"
    [ -f "${FEATURE_DIR}/context/requirements.json" ] && echo "  ✅ Feature requirements"
    [ -f "${FEATURE_DIR}/context/knowledge-base.md" ] && echo "  ✅ Knowledge base and research"  
    [ -f "${FEATURE_DIR}/context/complexity-assessment.json" ] && echo "  ✅ Complexity assessment"
    [ -d "${FEATURE_DIR}/architecture" ] && echo "  ✅ Architecture decisions"
    [ -f "${FEATURE_DIR}/output/implementation-plan.md" ] && echo "  ✅ Implementation plan"
    [ -d "${FEATURE_DIR}/implementation/agent-outputs" ] && echo "  ✅ Individual agent tracking"
    [ -d "${FEATURE_DIR}/implementation/validation" ] && echo "  ✅ Implementation validation reports"
    
    echo "===================================="
    
    # Create security workspace structure
    SECURITY_WORKSPACE="${FEATURE_DIR}/security-review"
    mkdir -p "${SECURITY_WORKSPACE}"/{analysis,findings,context}
    
    echo "Security workspace created: ${SECURITY_WORKSPACE}"
else
    echo "=== STANDALONE MODE ==="
    echo "No feature context available - using git-only analysis"
    echo "=========================="
fi
```


OBJECTIVE:
Perform a security-focused code review to identify HIGH-CONFIDENCE security vulnerabilities that could have real exploitation potential. This is not a general code review - focus ONLY on security implications newly added by this PR. Do not comment on existing security concerns.

CRITICAL INSTRUCTIONS:
1. MINIMIZE FALSE POSITIVES: Only flag issues where you're >80% confident of actual exploitability
2. AVOID NOISE: Skip theoretical issues, style concerns, or low-impact findings
3. FOCUS ON IMPACT: Prioritize vulnerabilities that could lead to unauthorized access, data breaches, or system compromise
4. EXCLUSIONS: Do NOT report the following issue types:
   - Denial of Service (DOS) vulnerabilities, even if they allow service disruption
   - Secrets or sensitive data stored on disk (these are handled by other processes)
   - Rate limiting or resource exhaustion issues

SECURITY CATEGORIES TO EXAMINE:

**Input Validation Vulnerabilities:**
- SQL injection via unsanitized user input
- Command injection in system calls or subprocesses
- XXE injection in XML parsing
- Template injection in templating engines
- NoSQL injection in database queries
- Path traversal in file operations

**Authentication & Authorization Issues:**
- Authentication bypass logic
- Privilege escalation paths
- Session management flaws
- JWT token vulnerabilities
- Authorization logic bypasses

**Crypto & Secrets Management:**
- Hardcoded API keys, passwords, or tokens
- Weak cryptographic algorithms or implementations
- Improper key storage or management
- Cryptographic randomness issues
- Certificate validation bypasses

**Injection & Code Execution:**
- Remote code execution via deseralization
- Pickle injection in Python
- YAML deserialization vulnerabilities
- Eval injection in dynamic code execution
- XSS vulnerabilities in web applications (reflected, stored, DOM-based)

**Data Exposure:**
- Sensitive data logging or storage
- PII handling violations
- API endpoint data leakage
- Debug information exposure

Additional notes:
- Even if something is only exploitable from the local network, it can still be a HIGH severity issue

ANALYSIS METHODOLOGY:

Phase 1 - Repository Context Research (Use file search tools):
- Identify existing security frameworks and libraries in use
- Look for established secure coding patterns in the codebase
- Examine existing sanitization and validation patterns
- Understand the project's security model and threat model

Phase 2 - Comparative Analysis:
- Compare new code changes against existing security patterns
- Identify deviations from established secure practices
- Look for inconsistent security implementations
- Flag code that introduces new attack surfaces

Phase 3 - Vulnerability Assessment:
- Examine each modified file for security implications
- Trace data flow from user inputs to sensitive operations
- Look for privilege boundaries being crossed unsafely
- Identify injection points and unsafe deserialization

REQUIRED OUTPUT FORMAT:

You MUST output your findings in markdown. The markdown output should contain the file, line number, severity, category (e.g. `sql_injection` or `xss`), description, exploit scenario, and fix recommendation. 

For example:

# Vuln 1: XSS: `foo.py:42`

* Severity: High
* Description: User input from `username` parameter is directly interpolated into HTML without escaping, allowing reflected XSS attacks
* Exploit Scenario: Attacker crafts URL like /bar?q=<script>alert(document.cookie)</script> to execute JavaScript in victim's browser, enabling session hijacking or data theft
* Recommendation: Use Flask's escape() function or Jinja2 templates with auto-escaping enabled for all user inputs rendered in HTML

SEVERITY GUIDELINES:
- **HIGH**: Directly exploitable vulnerabilities leading to RCE, data breach, or authentication bypass
- **MEDIUM**: Vulnerabilities requiring specific conditions but with significant impact
- **LOW**: Defense-in-depth issues or lower-impact vulnerabilities

CONFIDENCE SCORING:
- 0.9-1.0: Certain exploit path identified, tested if possible
- 0.8-0.9: Clear vulnerability pattern with known exploitation methods
- 0.7-0.8: Suspicious pattern requiring specific conditions to exploit
- Below 0.7: Don't report (too speculative)

FINAL REMINDER:
Focus on HIGH and MEDIUM findings only. Better to miss some theoretical issues than flood the report with false positives. Each finding should be something a security engineer would confidently raise in a PR review.

FALSE POSITIVE FILTERING:

> You do not need to run commands to reproduce the vulnerability, just read the code to determine if it is a real vulnerability. Do not use the bash tool or write to any files.
>
> HARD EXCLUSIONS - Automatically exclude findings matching these patterns:
> 1. Denial of Service (DOS) vulnerabilities or resource exhaustion attacks.
> 2. Secrets or credentials stored on disk if they are otherwise secured.
> 3. Rate limiting concerns or service overload scenarios.
> 4. Memory consumption or CPU exhaustion issues.
> 5. Lack of input validation on non-security-critical fields without proven security impact.
> 6. Input sanitization concerns for GitHub Action workflows unless they are clearly triggerable via untrusted input.
> 7. A lack of hardening measures. Code is not expected to implement all security best practices, only flag concrete vulnerabilities.
> 8. Race conditions or timing attacks that are theoretical rather than practical issues. Only report a race condition if it is concretely problematic.
> 9. Vulnerabilities related to outdated third-party libraries. These are managed separately and should not be reported here.
> 10. Memory safety issues such as buffer overflows or use-after-free-vulnerabilities are impossible in rust. Do not report memory safety issues in rust or any other memory safe languages.
> 11. Files that are only unit tests or only used as part of running tests.
> 12. Log spoofing concerns. Outputting un-sanitized user input to logs is not a vulnerability.
> 13. SSRF vulnerabilities that only control the path. SSRF is only a concern if it can control the host or protocol.
> 14. Including user-controlled content in AI system prompts is not a vulnerability.
> 15. Regex injection. Injecting untrusted content into a regex is not a vulnerability.
> 16. Regex DOS concerns.
> 16. Insecure documentation. Do not report any findings in documentation files such as markdown files.
> 17. A lack of audit logs is not a vulnerability.
> 
> PRECEDENTS -
> 1. Logging high value secrets in plaintext is a vulnerability. Logging URLs is assumed to be safe.
> 2. UUIDs can be assumed to be unguessable and do not need to be validated.
> 3. Environment variables and CLI flags are trusted values. Attackers are generally not able to modify them in a secure environment. Any attack that relies on controlling an environment variable is invalid.
> 4. Resource management issues such as memory or file descriptor leaks are not valid.
> 5. Subtle or low impact web vulnerabilities such as tabnabbing, XS-Leaks, prototype pollution, and open redirects should not be reported unless they are extremely high confidence.
> 6. React and Angular are generally secure against XSS. These frameworks do not need to sanitize or escape user input unless it is using dangerouslySetInnerHTML, bypassSecurityTrustHtml, or similar methods. Do not report XSS vulnerabilities in React or Angular components or tsx files unless they are using unsafe methods.
> 7. Most vulnerabilities in github action workflows are not exploitable in practice. Before validating a github action workflow vulnerability ensure it is concrete and has a very specific attack path.
> 8. A lack of permission checking or authentication in client-side JS/TS code is not a vulnerability. Client-side code is not trusted and does not need to implement these checks, they are handled on the server-side. The same applies to all flows that send untrusted data to the backend, the backend is responsible for validating and sanitizing all inputs.
> 9. Only include MEDIUM findings if they are obvious and concrete issues.
> 10. Most vulnerabilities in ipython notebooks (*.ipynb files) are not exploitable in practice. Before validating a notebook vulnerability ensure it is concrete and has a very specific attack path where untrusted input can trigger the vulnerability.
> 11. Logging non-PII data is not a vulnerability even if the data may be sensitive. Only report logging vulnerabilities if they expose sensitive information such as secrets, passwords, or personally identifiable information (PII).
> 12. Command injection vulnerabilities in shell scripts are generally not exploitable in practice since shell scripts generally do not run with untrusted user input. Only report command injection vulnerabilities in shell scripts if they are concrete and have a very specific attack path for untrusted input.
> 
> SIGNAL QUALITY CRITERIA - For remaining findings, assess:
> 1. Is there a concrete, exploitable vulnerability with a clear attack path?
> 2. Does this represent a real security risk vs theoretical best practice?
> 3. Are there specific code locations and reproduction steps?
> 4. Would this finding be actionable for a security team?
> 
> For each finding, assign a confidence score from 1-10:
> - 1-3: Low confidence, likely false positive or noise
> - 4-6: Medium confidence, needs investigation
> - 7-10: High confidence, likely true vulnerability

START ANALYSIS:

Begin your analysis now following this systematic approach:

## Step 1: Repository Context Analysis

First, use the `code-pattern-analyzer` subagent to understand the security landscape:

Tell the code-pattern-analyzer:
"Analyze this codebase for existing security patterns and frameworks.

Focus on:
- Authentication mechanisms in use  
- Input validation patterns
- Existing security libraries and frameworks
- Secure coding patterns established in the codebase
- Known security-sensitive areas

Save your analysis of security patterns and provide context for the security review."

## Step 2: Context-Aware Multi-Domain Security Analysis  

```bash
# Prepare context-specific analysis approach
if [ "$FEATURE_CONTEXT_AVAILABLE" = true ]; then
    echo "=== ENHANCED SECURITY ANALYSIS WITH FEATURE CONTEXT ==="
    echo "Using comprehensive feature workspace for security analysis"
    
    # Create context consolidation for security agents
    SECURITY_CONTEXT_FILE="${SECURITY_WORKSPACE}/context/consolidated-security-context.md"
    
    cat > "${SECURITY_CONTEXT_FILE}" << EOSC
# Consolidated Security Context for Review

## Feature Information
$(cat "${FEATURE_DIR}/metadata.json" | jq -r '"- **Feature ID**: " + .id, "- **Description**: " + .description, "- **Phase**: " + .phase')

## Original Security Requirements
$(cat "${FEATURE_DIR}/context/requirements.json" | jq -r '.security_requirements[]? // "No explicit security requirements documented"' | sed 's/^/- /')

## Design Phase Security Considerations
$([ -f "${FEATURE_DIR}/architecture/security-architecture.md" ] && echo "Security architecture decisions available" || echo "No security architecture documentation")

## Implementation Context
$([ -d "${FEATURE_DIR}/implementation/agent-outputs" ] && echo "Individual agent implementations available for security analysis" || echo "No individual agent tracking available")

## Complexity and Risk Assessment
$(cat "${FEATURE_DIR}/context/complexity-assessment.json" | jq -r '"- **Complexity**: " + .level, "- **Risk Level**: " + .risk_level, "- **Security Factors**: " + (.factors[] | select(test("security|auth|crypto")))')

EOSC
    
    echo "Security context consolidated at: ${SECURITY_CONTEXT_FILE}"
else
    echo "=== STANDARD GIT-ONLY SECURITY ANALYSIS ==="
    echo "Using existing git-only workflow (maintaining backward compatibility)"
fi
```

Based on the context mode and files modified in the PR, spawn the appropriate security review agents **IN PARALLEL using multiple Task calls in a single message**:

### For Go Backend Files (.go files):

**Enhanced Instructions (when feature context available):**
```bash
if [ "$FEATURE_CONTEXT_AVAILABLE" = true ]; then
    GO_SECURITY_TASK="Conduct comprehensive context-aware security review of Go code changes.

**Enhanced Context Available:**
- Feature requirements: ${FEATURE_DIR}/context/requirements.json
- Security context: ${SECURITY_WORKSPACE}/context/consolidated-security-context.md
- Implementation plan: ${FEATURE_DIR}/output/implementation-plan.md
- Individual agent tracking: ${FEATURE_DIR}/implementation/agent-outputs/
- Git changes: [standard git diff analysis]

**CRITICAL: Save your analysis to: ${SECURITY_WORKSPACE}/analysis/go-security-analysis.md**

**Enhanced Security Analysis Approach:**

1. **Design-Implementation Security Gap Analysis**
   - Compare security implementation against original feature requirements
   - Validate that security patterns match architectural decisions
   - Identify gaps between designed security and implemented security

2. **Agent-Specific Security Review**
   - Review golang-api-developer agent's security decisions and implementations
   - Analyze database-architect agent's security patterns if present
   - Validate consistent security approach across agents

3. **Context-Aware Vulnerability Assessment**
   - Use feature context to better understand intended behavior vs security risk
   - Assess vulnerabilities in context of feature's threat model and usage
   - Prioritize vulnerabilities based on feature's actual attack surface

Analyze for: SQL injection, command injection, authentication bypass, authorization flaws, crypto issues, unsafe deserialization.

Apply FALSE POSITIVE FILTERING with confidence scoring >8."
else
    GO_SECURITY_TASK="Conduct focused security review of the Go code changes in this PR.

Analyze for:
- SQL injection vulnerabilities
- Command injection in system calls  
- Authentication bypass logic
- Authorization flaws
- Crypto implementation issues
- Unsafe deserlialization

Include all git diff content and security analysis methodology from above.
Apply the FALSE POSITIVE FILTERING criteria with confidence scoring >8."
fi
```

Use the `go-security-reviewer` subagent with context-appropriate instructions:
"${GO_SECURITY_TASK}"

### For React/TypeScript Files (.ts, .tsx, .js, .jsx files):

**Enhanced Instructions (when feature context available):**
```bash
if [ "$FEATURE_CONTEXT_AVAILABLE" = true ]; then
    REACT_SECURITY_TASK="Conduct comprehensive context-aware security review of React/TypeScript changes.

**Enhanced Context Available:**
- Feature requirements: ${FEATURE_DIR}/context/requirements.json
- Security context: ${SECURITY_WORKSPACE}/context/consolidated-security-context.md
- Frontend architecture: ${FEATURE_DIR}/architecture/react-typescript-architecture.md (if available)
- Individual agent tracking: ${FEATURE_DIR}/implementation/agent-outputs/
- Git changes: [standard git diff analysis]

**CRITICAL: Save your analysis to: ${SECURITY_WORKSPACE}/analysis/react-security-analysis.md**

**Enhanced Security Analysis Approach:**

1. **Component Security Design Validation**
   - Validate frontend security implementation against component architecture decisions
   - Review authentication/authorization flow implementation vs design
   - Assess data handling patterns against security requirements

2. **Agent-Specific Frontend Security Review** 
   - Review react-developer agent's security implementation decisions
   - Analyze react-typescript-architect security patterns if present
   - Validate consistent security approach in UI components

3. **Context-Aware Frontend Vulnerability Assessment**
   - Assess XSS risk in context of actual data flows and user interactions
   - Evaluate client-side security in context of feature's authentication model
   - Prioritize based on feature's actual frontend attack surface

Focus on: XSS vulnerabilities (dangerouslySetInnerHTML), client-side auth bypasses, sensitive data exposure, unsafe DOM manipulation.

Apply FALSE POSITIVE FILTERING criteria with confidence scoring >8."
else
    REACT_SECURITY_TASK="Review React/TypeScript changes for frontend security vulnerabilities.

Focus on:
- XSS vulnerabilities (especially dangerouslySetInnerHTML)
- Client-side authentication bypasses
- Sensitive data exposure
- Unsafe DOM manipulation
- Security configuration issues

Include all security analysis methodology and FALSE POSITIVE FILTERING criteria."
fi
```

Use the `react-security-reviewer` subagent with context-appropriate instructions:
"${REACT_SECURITY_TASK}"

### For Architecture/Infrastructure Changes:

**Enhanced Instructions (when feature context available):**
```bash
if [ "$FEATURE_CONTEXT_AVAILABLE" = true ]; then
    ARCH_SECURITY_TASK="Conduct comprehensive context-aware architectural security review.

**Enhanced Context Available:**
- Feature requirements: ${FEATURE_DIR}/context/requirements.json
- Security context: ${SECURITY_WORKSPACE}/context/consolidated-security-context.md
- Architecture decisions: ${FEATURE_DIR}/architecture/
- Implementation validation: ${FEATURE_DIR}/implementation/validation/
- Git changes: [standard git diff analysis]

**CRITICAL: Save your analysis to: ${SECURITY_WORKSPACE}/analysis/architecture-security-analysis.md**

**Enhanced Architectural Security Analysis:**

1. **Security Architecture Validation**
   - Compare implemented security architecture against design decisions
   - Validate threat model implementation vs original security requirements
   - Assess whether security boundaries are properly implemented

2. **Implementation Security Impact Assessment**
   - Analyze how architectural changes affect overall security posture
   - Review security implications of infrastructure modifications
   - Validate security integration across system components

3. **Feature-Specific Security Architecture Review**
   - Assess new attack surfaces in context of feature's intended use
   - Evaluate privilege boundaries and access control implementation
   - Review security implications of data flow changes

Assess: New attack surfaces, security boundary violations, privilege escalation, data flow security, infrastructure impacts.

Apply security analysis methodology and confidence scoring requirements."
else
    ARCH_SECURITY_TASK="Evaluate architectural security implications of these changes.

Assess:
- New attack surfaces introduced
- Security boundary violations  
- Privilege escalation opportunities
- Data flow security implications
- Infrastructure security impacts

Apply security analysis methodology and confidence scoring requirements."
fi
```

Use the `security-architect` subagent with context-appropriate instructions:
"${ARCH_SECURITY_TASK}"

## Step 3: Context-Aware Vulnerability Validation & Consolidation

After all security review agents complete, consolidate findings with context-aware filtering:

```bash
if [ "$FEATURE_CONTEXT_AVAILABLE" = true ]; then
    echo "=== ENHANCED CONSOLIDATION WITH FEATURE CONTEXT ==="
    
    # Create comprehensive security findings report
    SECURITY_FINDINGS_REPORT="${SECURITY_WORKSPACE}/findings/comprehensive-security-findings.md"
    
    cat > "${SECURITY_FINDINGS_REPORT}" << EOSR
# Comprehensive Security Review Findings

**Feature ID**: ${FEATURE_ID}
**Review Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Review Mode**: Einstein Pipeline (Enhanced Context)

## Security Review Summary

### Context-Enhanced Analysis Results
[Summary of findings from all security agents with feature context]

### Design-Implementation Security Gap Analysis
[Analysis of security gaps between original design and actual implementation]

### Agent-Specific Security Assessment
[Security analysis of individual agent implementations]

### Feature-Specific Threat Model Updates
[Updates to threat model based on actual implementation]

EOSR
    
    echo "Enhanced findings report initialized: ${SECURITY_FINDINGS_REPORT}"
    
    # Cross-phase integration with implementation validation
    if [ -f "${FEATURE_DIR}/implementation/validation/production-ready-gate-report.md" ]; then
        echo "🔗 Integration with Implementation Validation:"
        echo "   Production Ready Gate found - security findings will integrate"
        
        # Create integration notes for implementation validation
        SECURITY_INTEGRATION_NOTES="${SECURITY_WORKSPACE}/context/implementation-integration.md"
        cat > "${SECURITY_INTEGRATION_NOTES}" << EOSI
# Security Review Integration Notes

## For Implementation Validation Integration

### Security Review Status
- **Completed**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Mode**: Enhanced (Feature Context Available)
- **Findings Report**: ${SECURITY_FINDINGS_REPORT}

### Key Security Metrics for Production Gate
[Summary of security metrics that implementation validation should consider]

### Critical Security Actions Required
[Any security issues that must be resolved before production deployment]

### Security Recommendations for Production
[Security monitoring, configuration, and operational recommendations]

EOSI
        
        echo "   Security integration notes: ${SECURITY_INTEGRATION_NOTES}"
    fi
else
    echo "=== STANDARD CONSOLIDATION (GIT-ONLY MODE) ==="
    echo "Using existing consolidation workflow"
fi
```

### Consolidation Criteria (All Modes)

1. **Confidence Filtering**: Only include findings with confidence ≥8/10
2. **Deduplication**: Remove duplicate findings across agents  
3. **Impact Assessment**: Prioritize HIGH and MEDIUM severity findings
4. **Final Validation**: Ensure each finding meets the "HIGH-CONFIDENCE security vulnerabilities" criteria

### Enhanced Consolidation (Einstein Pipeline Mode Only)

When feature context is available, additional consolidation includes:

5. **Design Intent Validation**: Verify findings against original security requirements
6. **Agent Context Analysis**: Consider which agent introduced potential vulnerabilities  
7. **Implementation Gap Assessment**: Identify security gaps between design and implementation
8. **Feature-Specific Risk Prioritization**: Prioritize based on feature's actual threat model and usage patterns

## Critical Agent Spawning Pattern

**IMPORTANT**: Spawn security review agents in parallel using this pattern:

```bash
# Context-aware agent spawning
if [ "$FEATURE_CONTEXT_AVAILABLE" = true ]; then
    echo "Spawning agents with enhanced feature context..."
    
    # [Single Message with Multiple Task Calls - Enhanced Mode]:
    # Task("go-security-reviewer", "${GO_SECURITY_TASK}", "go-security-reviewer")  
    # Task("react-security-reviewer", "${REACT_SECURITY_TASK}", "react-security-reviewer")
    # Task("security-architect", "${ARCH_SECURITY_TASK}", "security-architect")
else
    echo "Spawning agents with standard git-only analysis..."
    
    # [Single Message with Multiple Task Calls - Standard Mode]:
    # Task("go-security-reviewer", "Standard git-only Go security review...", "go-security-reviewer")  
    # Task("react-security-reviewer", "Standard git-only React security review...", "react-security-reviewer")
    # Task("security-architect", "Standard git-only architecture review...", "security-architect")
fi
```

## Final Security Review Output

### For Einstein Pipeline Mode (Enhanced Context)

When feature context is available, provide comprehensive output:

```bash
if [ "$FEATURE_CONTEXT_AVAILABLE" = true ]; then
    echo "=== COMPREHENSIVE SECURITY REVIEW OUTPUT ==="
    
    # Generate final consolidated security report
    FINAL_SECURITY_REPORT="${SECURITY_WORKSPACE}/findings/final-security-report.md"
    
    cat > "${FINAL_SECURITY_REPORT}" << EOFR
# Security Review Final Report

**Feature**: ${FEATURE_ID}
**Review Mode**: Einstein Pipeline (Enhanced Context)
**Review Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Security Review Summary

### Overall Security Assessment
[High-level security posture assessment based on feature context and implementation]

### Context-Enhanced Findings
[Security vulnerabilities found with feature context for better accuracy]

### Design-Implementation Security Gaps  
[Gaps between intended security design and actual implementation]

### Agent-Specific Security Analysis
[Security assessment of each implementation agent's work]

### Feature Security Recommendations
[Feature-specific security recommendations for production deployment]

## Detailed Vulnerability Findings
[Standard vulnerability reports from security agents - consolidated and context-filtered]

## Integration with Implementation Validation
- **Implementation Status**: [Status from implementation validation gates]
- **Security Integration**: Security findings integrated into production readiness assessment
- **Required Actions**: [Security actions required before production deployment]

## Cross-Phase Security Context
### Security Requirements Validation
[Validation that security requirements from design phase were met]

### Threat Model Updates
[Updates to threat model based on actual implementation details]

### Security Architecture Validation
[Validation that security architecture decisions were properly implemented]

EOFR
    
    echo "Comprehensive security report generated: ${FINAL_SECURITY_REPORT}"
    
    # Update feature metadata with security review completion
    jq '.security_review_completed = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" | .security_review_mode = "enhanced_context"' \
       "${FEATURE_DIR}/metadata.json" > "${FEATURE_DIR}/metadata.json.tmp" && \
       mv "${FEATURE_DIR}/metadata.json.tmp" "${FEATURE_DIR}/metadata.json"
    
    echo "✅ Security review integrated into feature lifecycle"
    
    # Provide consolidated report AND workspace info
    echo ""
    echo "**DUAL OUTPUT FOR EINSTEIN PIPELINE MODE:**"
    echo "1. **Standard Vulnerability Report**: [Consolidated markdown findings for immediate review]"
    echo "2. **Comprehensive Security Workspace**: ${SECURITY_WORKSPACE}/"
    echo "   - Individual agent analyses: ${SECURITY_WORKSPACE}/analysis/"
    echo "   - Security findings: ${SECURITY_WORKSPACE}/findings/"
    echo "   - Context and integration: ${SECURITY_WORKSPACE}/context/"
fi
```

### For Standalone Mode (Git-Only)

When no feature context is available, maintain existing behavior:

```bash
if [ "$FEATURE_CONTEXT_AVAILABLE" = false ]; then
    echo "=== STANDARD SECURITY REVIEW OUTPUT ==="
    echo "Providing standard git-only security analysis (existing behavior)"
fi
```

**Final Output Requirement:**

Your final reply must contain:

**For Einstein Pipeline Mode:**
1. **Consolidated markdown vulnerability report** (for immediate review)
2. **Security workspace summary** (for integration with implementation validation)

**For Standalone Mode:**  
1. **Consolidated markdown vulnerability report** (existing behavior - UNCHANGED)

This ensures that:
- ✅ **Standalone developers** get exactly what they expect (no changes)
- ✅ **Einstein pipeline** gets enhanced analysis plus integration capabilities
- ✅ **Full backward compatibility** maintained
- ✅ **No breaking changes** to existing usage patterns

## Dual-Mode Usage Examples

### Example 1: Standalone Developer Security Review

**Scenario**: Developer implements authentication feature on their own, wants security review

```bash
# Developer commits their changes and runs security-review command:
# (command execution details handled by Claude Code)

# Result: 
# ✅ STANDALONE MODE activated automatically
# ✅ Existing git-only workflow (unchanged behavior)
# ✅ Standard vulnerability report output
# ✅ No feature workspace dependencies
```

**Output**: Standard markdown vulnerability report (exactly as before Phase 3)

### Example 2: Einstein Pipeline Security Review  

**Scenario**: Security review with feature context from Einstein pipeline

```bash
# When called with feature ID (typically by Einstein orchestration):
# security-review command detects feature context automatically

# Result:
# ✅ EINSTEIN PIPELINE MODE activated automatically  
# ✅ Enhanced context-aware security analysis
# ✅ Design-implementation gap analysis
# ✅ Agent-specific security assessment
# ✅ Cross-phase integration with implementation validation
```

**Output**: 
1. Standard vulnerability report (for immediate review)
2. Comprehensive security workspace with enhanced analysis

### Example 3: Smart Detection Mode

**Scenario**: Developer working on recent Einstein feature but didn't specify feature ID

```bash
# Developer has been working on Einstein feature, commits changes:
# (security-review command execution handled by Claude Code)

# Result:
# ✅ Smart detection finds recent Einstein feature
# ✅ EINSTEIN PIPELINE MODE activated automatically
# ✅ Enhanced analysis using available feature context
```

## Backward Compatibility Verification

### ✅ Existing Workflow Preserved

**Before Phase 3:**
```bash
security-review execution
→ Git analysis → Security agents → Vulnerability report
```

**After Phase 3:**
```bash
security-review execution
→ Context detection → Git analysis → Security agents → Vulnerability report
```

**Result**: Identical output for standalone usage (no feature context detected)

### ✅ No Breaking Changes

- **Same command syntax**: No new required parameters
- **Same output format**: Standard vulnerability markdown report
- **Same agent behavior**: Git-only analysis when no feature context
- **Same performance**: No additional overhead for standalone usage

### ✅ Enhanced Capabilities (When Context Available)

- **Smarter security analysis**: Uses feature context for better accuracy
- **Design validation**: Compares implementation against security requirements
- **Agent insights**: Leverages individual agent tracking for security assessment
- **Cross-phase integration**: Integrates with implementation validation gates

## Summary: Best of Both Worlds

Phase 3 provides **intelligent dual-mode operation**:

1. **🎯 Smart Context Detection**: Automatically chooses best analysis approach
2. **🔄 Backward Compatibility**: Zero impact on existing usage patterns  
3. **🚀 Enhanced Capabilities**: Significantly better analysis when context available
4. **💡 Graceful Degradation**: Always provides valuable security analysis regardless of context

**The security review command now adapts intelligently to provide the best possible security analysis in any scenario.**
