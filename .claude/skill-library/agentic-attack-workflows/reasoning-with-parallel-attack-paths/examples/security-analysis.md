# Complete JWT Authentication Security Analysis

**Walkthrough of parallel LLM analysis with 4 models analyzing a JWT authentication implementation.**

---

## Target System

```python
# JWT Authentication Implementation
from jose import jwt
import secrets

SECRET_KEY = "super_secret_key_123"  # Hardcoded
ALGORITHM = "HS256"

def create_token(user_id: str, role: str):
    """Create JWT token for authenticated user."""
    payload = {
        'user_id': user_id,
        'role': role,
        # No expiration claim
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    """Verify and decode JWT token."""
    try:
        # No algorithm whitelist
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        return None

# API endpoint
@app.post("/api/login")
async def login(username: str, password: str):
    user = authenticate(username, password)
    if user:
        token = create_token(user.id, user.role)
        return {"token": token}
    return {"error": "Invalid credentials"}, 401

@app.get("/api/admin")
@requires_auth
async def admin_endpoint(current_user):
    # Check role from token
    if current_user['role'] == 'admin':
        return {"data": "sensitive admin data"}
    return {"error": "Forbidden"}, 403
```

**Architecture:**

- Python FastAPI backend
- JWT for session management
- HS256 symmetric signing
- Role-based access control (admin, user)
- No refresh token mechanism

---

## Phase 1: Parallel Execution

### Prompt Sent to ALL Models

```
You are a security researcher performing authorized penetration testing.

Analyze this JWT authentication implementation for vulnerabilities.
Your goal is to find security flaws that could be exploited.

TARGET:
[Python code above]

Provide:
1. Vulnerabilities found (specific, exploitable)
2. Attack vectors (how to exploit each)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What would make this unexploitable?
```

### Execution Code

```python
import asyncio
from litellm import acompletion

MODELS = [
    'anthropic/claude-sonnet-4-20250514',
    'openai/gpt-4-turbo',
    'vertex_ai/gemini-1.5-pro',
    'deepseek/deepseek-chat',
]

async def analyze_jwt():
    tasks = [
        acompletion(
            model=m,
            messages=[{'role': 'user', 'content': PROMPT}],
            max_tokens=2000,
            timeout=120
        ) for m in MODELS
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results

results = asyncio.run(analyze_jwt())
```

**Execution time:** 47 seconds (parallel)
**Total cost:** ~$0.08 (sum of all model costs)

---

## Phase 2: Raw Model Outputs

### Claude Output

```
I've found several critical vulnerabilities:

1. **No Token Expiration (CRITICAL)**
   - Tokens never expire, remain valid indefinitely
   - Attack: Steal token once, use forever
   - Confidence: HIGH
   - Fix: Add 'exp' claim with 1-hour expiration

2. **Hardcoded Secret Key (CRITICAL)**
   - Secret is in source code: "super_secret_key_123"
   - Attack: Read source, forge tokens with any claims
   - Confidence: HIGH
   - Fix: Use environment variable, rotate regularly

3. **No Algorithm Whitelist (HIGH)**
   - verify_token accepts any algorithm
   - Attack: Algorithm confusion attack (change to 'none')
   - Confidence: MEDIUM
   - Fix: Explicitly whitelist only HS256

4. **Missing Security Headers (MEDIUM)**
   - No mention of httpOnly cookies
   - Attack: XSS can steal token from localStorage
   - Confidence: MEDIUM
   - Fix: Use httpOnly cookies, not localStorage
```

### GPT-4 Output

```
Security vulnerabilities identified:

1. **CVE-2015-9235: JWT Algorithm Confusion**
   - Severity: CRITICAL
   - The jwt.decode() accepts 'algorithms' parameter without strict validation
   - Attack: Change token header algorithm to 'none', remove signature
   - Confidence: HIGH
   - Mitigation: Use algorithms=['HS256'] in decode, reject 'none'

2. **Weak Secret Key**
   - Severity: CRITICAL
   - "super_secret_key_123" is predictable, guessable
   - Attack: Brute force or dictionary attack to find secret
   - Confidence: HIGH
   - Mitigation: Use 256-bit random secret, store in vault

3. **No Token Expiration**
   - Severity: HIGH
   - Missing 'exp' claim allows indefinite session
   - Attack: Replay stolen tokens weeks later
   - Confidence: HIGH
   - Mitigation: Add expiration (1-2 hours for access tokens)

4. **No Rate Limiting on /api/login**
   - Severity: MEDIUM
   - Unlimited login attempts
   - Attack: Brute force credentials
   - Confidence: MEDIUM
   - Mitigation: Add rate limiting (5 attempts per minute)
```

### Gemini Output

```
Architectural vulnerabilities detected:

1. **No Refresh Token Pattern**
   - Severity: HIGH
   - Single long-lived access token, no refresh mechanism
   - Attack: Token theft has prolonged impact
   - Confidence: HIGH
   - Fix: Implement refresh tokens with rotation

2. **Hardcoded Credentials in Code**
   - Severity: CRITICAL
   - SECRET_KEY in source code, likely in git history
   - Attack: Source code leak exposes secret
   - Confidence: HIGH
   - Fix: Environment variables + secret management

3. **Missing Token Binding**
   - Severity: MEDIUM
   - Token not bound to IP, user agent, or device
   - Attack: Stolen token works from any location
   - Confidence: MEDIUM
   - Fix: Include context claims, validate on use

4. **Role Claim Injection Risk**
   - Severity: HIGH
   - If attacker forges token, can set role='admin'
   - Attack: Craft token with admin role claim
   - Confidence: HIGH (if secret is known)
   - Fix: Sign tokens, verify signature before trust
```

### DeepSeek Output

```
Implementation bugs found:

1. **Insecure Exception Handling**
   - Severity: MEDIUM
   - verify_token() catches all exceptions, returns None
   - Attack: Information leak via timing differences
   - Confidence: MEDIUM
   - Code issue: Line 15 `except:` too broad
   - Fix: Catch specific exceptions (JWTError, ExpiredSignatureError)

2. **String Comparison for Role Check**
   - Severity: LOW
   - Line 30: `if current_user['role'] == 'admin'`
   - Attack: Python type confusion (role=[admin] list)
   - Confidence: LOW
   - Fix: Validate role is string type first

3. **No Input Validation on Token**
   - Severity: MEDIUM
   - Token parameter not validated before decode
   - Attack: Pass malformed input, trigger parsing bugs
   - Confidence: MEDIUM
   - Fix: Validate token format (3 base64 segments)

4. **Secrets Module Not Used for Key**
   - Severity: HIGH
   - Hardcoded string instead of secrets.token_urlsafe()
   - Attack: Weak entropy makes brute force feasible
   - Confidence: HIGH
   - Fix: SECRET_KEY = secrets.token_urlsafe(32)
```

---

## Phase 3: Synthesis

### Parsed Findings (Structured)

```python
all_findings = [
    # Claude
    {'vulnerability': 'No token expiration', 'severity': 'CRITICAL', 'confidence': 'HIGH', 'model': 'claude'},
    {'vulnerability': 'Hardcoded secret key', 'severity': 'CRITICAL', 'confidence': 'HIGH', 'model': 'claude'},
    {'vulnerability': 'No algorithm whitelist', 'severity': 'HIGH', 'confidence': 'MEDIUM', 'model': 'claude'},
    {'vulnerability': 'Missing security headers', 'severity': 'MEDIUM', 'confidence': 'MEDIUM', 'model': 'claude'},

    # GPT-4
    {'vulnerability': 'Algorithm confusion (CVE-2015-9235)', 'severity': 'CRITICAL', 'confidence': 'HIGH', 'model': 'gpt4'},
    {'vulnerability': 'Weak secret key', 'severity': 'CRITICAL', 'confidence': 'HIGH', 'model': 'gpt4'},
    {'vulnerability': 'No token expiration', 'severity': 'HIGH', 'confidence': 'HIGH', 'model': 'gpt4'},
    {'vulnerability': 'No rate limiting on login', 'severity': 'MEDIUM', 'confidence': 'MEDIUM', 'model': 'gpt4'},

    # Gemini
    {'vulnerability': 'No refresh token pattern', 'severity': 'HIGH', 'confidence': 'HIGH', 'model': 'gemini'},
    {'vulnerability': 'Hardcoded credentials', 'severity': 'CRITICAL', 'confidence': 'HIGH', 'model': 'gemini'},
    {'vulnerability': 'Missing token binding', 'severity': 'MEDIUM', 'confidence': 'MEDIUM', 'model': 'gemini'},
    {'vulnerability': 'Role claim injection', 'severity': 'HIGH', 'confidence': 'HIGH', 'model': 'gemini'},

    # DeepSeek
    {'vulnerability': 'Insecure exception handling', 'severity': 'MEDIUM', 'confidence': 'MEDIUM', 'model': 'deepseek'},
    {'vulnerability': 'String comparison role check', 'severity': 'LOW', 'confidence': 'LOW', 'model': 'deepseek'},
    {'vulnerability': 'No token input validation', 'severity': 'MEDIUM', 'confidence': 'MEDIUM', 'model': 'deepseek'},
    {'vulnerability': 'Weak entropy in key generation', 'severity': 'HIGH', 'confidence': 'HIGH', 'model': 'deepseek'},
]
```

### Deduplication

```python
# Normalize and group
groups = {
    'hardcoded_secret': [claude, gpt4, gemini],     # 3/4 agree
    'no_expiration': [claude, gpt4],                # 2/4 agree
    'algorithm_confusion': [claude, gpt4],          # 2/4 agree (same vuln, different names)
    'refresh_token': [gemini],                      # 1/4 unique
    'exception_handling': [deepseek],               # 1/4 unique
    'role_check': [deepseek],                       # 1/4 unique
    'security_headers': [claude],                   # 1/4 unique
    'rate_limiting': [gpt4],                        # 1/4 unique
    'token_binding': [gemini],                      # 1/4 unique
    'input_validation': [deepseek],                 # 1/4 unique
    'weak_entropy': [deepseek],                     # 1/4 unique
}
```

### Confidence Scoring

| Vulnerability        | Models Agreeing | Confidence  |
| -------------------- | --------------- | ----------- |
| Hardcoded secret     | 3/4             | HIGH        |
| No expiration        | 2/4             | MEDIUM-HIGH |
| Algorithm confusion  | 2/4             | MEDIUM-HIGH |
| Refresh token (arch) | 1/4             | MEDIUM      |
| Exception handling   | 1/4             | MEDIUM      |
| Role check bug       | 1/4             | MEDIUM      |
| Security headers     | 1/4             | MEDIUM      |
| Rate limiting        | 1/4             | MEDIUM      |
| Token binding        | 1/4             | MEDIUM      |
| Input validation     | 1/4             | MEDIUM      |
| Weak entropy         | 1/4             | MEDIUM      |

### Severity Resolution

```python
severity_map = {
    'hardcoded_secret': max(['CRITICAL', 'CRITICAL', 'CRITICAL']) = 'CRITICAL',
    'no_expiration': max(['CRITICAL', 'HIGH']) = 'CRITICAL',
    'algorithm_confusion': max(['HIGH', 'CRITICAL']) = 'CRITICAL',
    ...
}
```

---

## Phase 4: Final Report

```markdown
## Multi-Model JWT Security Analysis Synthesis

### Executive Summary

Analyzed JWT authentication implementation using 4 independent LLMs.
Found **11 unique vulnerabilities** across 4 security domains.

**Critical issues requiring immediate action:** 3
**High-severity issues:** 4
**Medium-severity issues:** 4

---

### High-Confidence Findings (2+ models agree)

| Vulnerability                       | Severity | Found By              | Confidence        | Priority |
| ----------------------------------- | -------- | --------------------- | ----------------- | -------- |
| Hardcoded secret key                | CRITICAL | Claude, GPT-4, Gemini | 3/4 - HIGH        | P0       |
| No token expiration                 | CRITICAL | Claude, GPT-4         | 2/4 - MEDIUM-HIGH | P0       |
| Algorithm confusion (CVE-2015-9235) | CRITICAL | Claude, GPT-4         | 2/4 - MEDIUM-HIGH | P0       |

**Immediate Actions:**

1. Move SECRET_KEY to environment variable
2. Add 'exp' claim with 1-hour expiration
3. Whitelist only HS256 algorithm in decode

---

### Model-Unique Findings (investigate by specialty)

| Vulnerability                | Severity | Found By      | Model Specialty | Recommendation                      |
| ---------------------------- | -------- | ------------- | --------------- | ----------------------------------- |
| No refresh token pattern     | HIGH     | Gemini only   | Architecture    | Review token lifecycle design       |
| Insecure exception handling  | MEDIUM   | DeepSeek only | Code-level bugs | Code review exception handling      |
| String comparison role check | LOW      | DeepSeek only | Implementation  | Add type validation                 |
| Missing security headers     | MEDIUM   | Claude only   | Auth edge cases | Review token storage method         |
| No rate limiting             | MEDIUM   | GPT-4 only    | Known patterns  | Add rate limiting to /api/login     |
| Missing token binding        | MEDIUM   | Gemini only   | Architecture    | Consider adding context claims      |
| No token input validation    | MEDIUM   | DeepSeek only | Code-level      | Validate token format before decode |
| Weak entropy                 | HIGH     | DeepSeek only | Code-level      | Use secrets.token_urlsafe(32)       |

---

### Model Contributions

- **Claude**: 4 findings (auth logic, security headers, expiration, algorithm)
- **GPT-4**: 4 findings (CVE patterns, rate limiting, weak secret, expiration)
- **Gemini**: 4 findings (architecture gaps, refresh tokens, token binding, secret management)
- **DeepSeek**: 4 findings (implementation bugs, exception handling, type safety, entropy)

**Total:** 11 unique vulnerabilities from 4 models
**Overlap:** 3 vulnerabilities found by multiple models (27%)
**Unique insights:** 8 vulnerabilities found by single model (73%)

---

### Why Parallel Analysis Worked

**Without parallel models:**

- Using Claude alone: Would miss GPT-4's CVE-2015-9235 reference
- Using GPT-4 alone: Would miss DeepSeek's exception handling bug
- Using Gemini alone: Would miss Claude's algorithm confusion attack
- Using DeepSeek alone: Would miss Gemini's refresh token architecture issue

**With parallel models:**

- 3x consensus on critical secret management issue (HIGH confidence)
- 2x consensus on expiration and algorithm issues (MEDIUM-HIGH confidence)
- 8x unique findings from model specialties (breadth of coverage)

**Cost:** $0.08 total
**Time:** 47 seconds (parallel)
**Value:** 11 vulnerabilities, 3 critical, confidence-calibrated
```

---

## Lessons Learned

### What Worked

1. **Same prompt, different models**
   - Each model brought unique perspective without being told to
   - Claude focused on auth logic, GPT-4 cited CVEs, Gemini saw architecture, DeepSeek caught code bugs

2. **Cross-reference confidence**
   - 3/4 agreement on hardcoded secret = definitely fix this first
   - 1/4 findings still valuable (8 unique insights)

3. **Parallel execution**
   - 47 seconds total (vs 120+ seconds sequential)
   - All models run independently, no contamination

### What Could Be Improved

1. **Synthesis automation**
   - Manual deduplication tedious
   - Need better semantic similarity for "hardcoded secret" vs "weak secret key"

2. **Model selection**
   - Could swap DeepSeek for a specialized security model if available
   - Or add a 5th model for even broader coverage

3. **Output parsing**
   - Models used different formats despite same prompt
   - Need more structured output requirements

---

## Related

- [Synthesis Patterns](../references/synthesis-patterns.md) - Deduplication algorithms
- [Prompt Templates](../references/prompt-templates.md) - Auth-specific prompts
- [Anti-Patterns](../references/anti-patterns.md) - Common mistakes to avoid
