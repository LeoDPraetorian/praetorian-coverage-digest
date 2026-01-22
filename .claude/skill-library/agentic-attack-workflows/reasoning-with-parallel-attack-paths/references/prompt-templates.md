# Prompt Templates

**Domain-specific attacker prompts for different security analysis contexts.**

---

## Core Principle

**ALL models receive the SAME prompt.** Diversity emerges from model architecture differences, not prompt variations.

**Template structure:**

1. Role definition (security researcher, authorized testing)
2. Target description
3. Analysis instructions
4. Output format requirements

---

## Universal Attacker Template

Base template for all domains:

```
You are a security researcher performing authorized penetration testing.

Analyze this system for vulnerabilities. Your goal is to find security flaws that could be exploited.

TARGET:
{target_description}

Provide:
1. Vulnerabilities found (specific, exploitable)
2. Attack vectors (how to exploit each)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What would make this unexploitable?
```

**Use this when:** No specific domain context is needed.

---

## Authentication & Authorization

```
You are a security researcher performing authorized penetration testing.

Analyze this authentication and authorization system for vulnerabilities. Focus on:
- Authentication bypass opportunities
- Session management flaws
- Authorization logic errors
- Token handling issues
- Privilege escalation paths

TARGET:
{auth_system_description}

For each vulnerability provide:
1. Vulnerability name and type
2. Specific attack vector (step-by-step exploit)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What defensive controls would prevent this?
```

**Use this when:** Analyzing login systems, JWT implementations, OAuth flows, RBAC systems.

**Example target description:**

```
JWT-based authentication API:
- POST /api/login → returns JWT with user_id, role claims
- JWT signed with HS256, secret key unknown
- Authorization header: Bearer {token}
- Role-based access: admin, user, guest
- No token expiration visible in claims
- Refresh endpoint: POST /api/refresh
```

---

## API Security

```
You are a security researcher performing authorized penetration testing.

Analyze this API for vulnerabilities. Focus on:
- Input validation bypasses
- Mass assignment vulnerabilities
- Rate limiting gaps
- Authentication/authorization flaws
- Injection vulnerabilities (SQL, NoSQL, command)
- SSRF opportunities
- Insecure direct object references

TARGET:
{api_specification}

For each vulnerability provide:
1. Affected endpoint(s)
2. Attack payload (specific exploit)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What would make this unexploitable?
```

**Use this when:** Analyzing REST APIs, GraphQL endpoints, gRPC services.

**Example target description:**

```
REST API Endpoints:
- GET /api/users/{id} - Returns user profile
- POST /api/users - Creates new user (admin only)
- PUT /api/users/{id} - Updates user (owner or admin)
- DELETE /api/assets/{id} - Deletes asset (owner only)

Authentication: JWT Bearer token
Authorization: Role-based (admin, user)
Input validation: Zod schema validation on POST/PUT
Database: PostgreSQL via Prisma ORM
```

---

## Cloud Infrastructure

```
You are a security researcher performing authorized penetration testing.

Analyze this cloud infrastructure for vulnerabilities. Focus on:
- IAM misconfigurations
- Public S3 buckets or storage
- Overly permissive security groups
- Exposed secrets in environment variables
- Lambda/function privilege escalation
- Cross-account access issues
- Unencrypted data at rest/in transit

TARGET:
{infrastructure_description}

For each vulnerability provide:
1. Resource(s) affected
2. Attack scenario (how an attacker would exploit)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What IAM policy or configuration would prevent this?
```

**Use this when:** Analyzing AWS/Azure/GCP architectures, CloudFormation/Terraform configurations.

**Example target description:**

```
AWS Infrastructure:
- API Gateway → Lambda → DynamoDB
- S3 bucket for user uploads (chariot-user-uploads)
- IAM role for Lambda: AmazonDynamoDBFullAccess, AmazonS3FullAccess
- Security group: 0.0.0.0/0 on port 443
- No WAF configured
- CloudWatch logging enabled
- Secrets in Lambda environment variables
```

---

## Web Application

```
You are a security researcher performing authorized penetration testing.

Analyze this web application for vulnerabilities. Focus on:
- Cross-site scripting (XSS) - reflected, stored, DOM-based
- Cross-site request forgery (CSRF)
- Open redirects
- Insecure deserialization
- Client-side validation bypasses
- Sensitive data exposure
- Clickjacking vulnerabilities

TARGET:
{web_app_description}

For each vulnerability provide:
1. Affected page/component
2. Exploit payload (specific attack)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What would make this unexploitable?
```

**Use this when:** Analyzing React/Vue/Angular frontends, server-rendered applications.

**Example target description:**

```
React SPA:
- User profile page with editable bio field
- Search functionality with query params reflected in DOM
- File upload for avatars (PNG/JPG only)
- No Content-Security-Policy header
- Session cookies without SameSite attribute
- Password reset via email link (token in URL)
```

---

## Container & Kubernetes

```
You are a security researcher performing authorized penetration testing.

Analyze this containerized application for vulnerabilities. Focus on:
- Container escape opportunities
- Privileged container misuse
- Secrets in environment variables or images
- RBAC misconfigurations
- Network policy gaps
- Admission controller bypasses
- Supply chain vulnerabilities (base images)

TARGET:
{container_description}

For each vulnerability provide:
1. Affected resource (pod, deployment, service)
2. Attack scenario (how to exploit)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What Kubernetes configuration would prevent this?
```

**Use this when:** Analyzing Dockerfiles, Kubernetes manifests, Helm charts.

**Example target description:**

```
Kubernetes Deployment:
- Pod runs as root (runAsUser: 0)
- hostPath volume mounted to /data
- Service account with cluster-admin ClusterRole
- No network policies defined
- Image: myapp:latest (from Docker Hub)
- Secrets passed via environment variables
- No pod security policy enforced
```

---

## Cryptography & Data Protection

```
You are a security researcher performing authorized penetration testing.

Analyze this cryptographic implementation for vulnerabilities. Focus on:
- Weak algorithms (MD5, SHA1, DES, RC4)
- ECB mode usage
- Hardcoded keys or predictable key generation
- Insufficient key lengths
- Missing integrity checks (HMAC)
- Plaintext secrets in storage/transit
- Timing attack vulnerabilities

TARGET:
{crypto_description}

For each vulnerability provide:
1. Affected component/function
2. Attack scenario (how to exploit weakness)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What cryptographic best practice would fix this?
```

**Use this when:** Analyzing encryption implementations, key management, secure storage.

**Example target description:**

```
Encryption Implementation:
- AES-128-ECB for database field encryption
- Encryption key stored in config.json
- JWT signed with HS256, 128-bit secret
- Password hashing: bcrypt, cost=10
- HTTPS with TLS 1.2, weak ciphers enabled
- No encryption at rest for S3 objects
```

---

## Prompt Customization Guidelines

**What to customize:**

- Target description (architecture, components, data flows)
- Domain-specific focus areas (based on attack surface)
- Output format (if you need specific structure)

**What NOT to customize:**

- Role definition - keep consistent across all models
- Analysis goal - always find exploitable vulnerabilities
- Severity/confidence requirements - maintain consistency

**Example customization:**

```python
def customize_prompt(base_template: str, target: str, focus_areas: List[str]) -> str:
    """
    Customize base template with target-specific details.
    """
    focus_bullets = '\n'.join([f'- {area}' for area in focus_areas])

    return base_template.format(
        target_description=target,
        focus_areas=focus_bullets
    )

# Usage
prompt = customize_prompt(
    base_template=AUTH_TEMPLATE,
    target=jwt_implementation,
    focus_areas=[
        'Token expiration and refresh logic',
        'Role claim validation',
        'Signature verification'
    ]
)
```

---

## Anti-Patterns

### ❌ Model-Specific Prompts

```python
# WRONG: Different prompts per model
claude_prompt = "You're an auth expert..."
gpt_prompt = "You're a CVE specialist..."
gemini_prompt = "You're an architect..."
```

**Why wrong:** Defeats the purpose of emergent diversity. You want models to bring their natural strengths, not be guided into specific roles.

**Correct:** Same prompt for all models.

### ❌ Leading Questions

```python
# WRONG: Bias toward specific findings
prompt = """
Find SQL injection in the login endpoint.
Check for XSS in the search feature.
Look for IDOR in /api/users/{id}.
"""
```

**Why wrong:** Leads models to confirm your hypothesis instead of finding real issues.

**Correct:** Open-ended analysis request.

### ❌ Overly Prescriptive Output Format

```python
# WRONG: Rigid structure
prompt = """
Return ONLY JSON in this format:
{
  "vuln_id": "string",
  "cvss_score": 0.0,
  ...
}
"""
```

**Why wrong:** Constrains model creativity. You want comprehensive analysis, not just filling out forms.

**Correct:** Request structured output but allow narrative explanation.

---

## Testing Your Prompts

Before running parallel analysis, test prompts individually:

```python
async def test_prompt(prompt: str, model: str):
    """
    Test a single prompt on one model.
    """
    response = await acompletion(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000
    )

    print(f"Model: {model}")
    print(f"Response: {response.choices[0].message.content}")
    print("\n" + "="*80 + "\n")

# Test with Claude first
await test_prompt(AUTH_TEMPLATE.format(target=jwt_spec), 'anthropic/claude-sonnet-4-20250514')
```

**Validation checklist:**

- ✅ Model understands the target
- ✅ Model provides actionable vulnerabilities
- ✅ Model includes attack vectors
- ✅ Model assigns severity correctly
- ✅ Model explains confidence level

---

## Related

- [LiteLLM Setup](litellm-setup.md) - Running prompts in parallel
- [Synthesis Patterns](synthesis-patterns.md) - Processing diverse outputs
- [Anti-Patterns](anti-patterns.md) - Common prompt mistakes
