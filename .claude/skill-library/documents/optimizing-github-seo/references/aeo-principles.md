# AEO Principles for GitHub Repositories

**Answer Engine Optimization (AEO) for AI systems like ChatGPT, Claude, Perplexity, and other LLM-based tools.**

## What is AEO?

**Answer Engine Optimization (AEO)** is the practice of optimizing content to be discovered and featured by AI answer engines rather than traditional search engines.

**Key difference from SEO:**

- **SEO**: Optimize for users clicking through search results
- **AEO**: Optimize for AI systems extracting and synthesizing information

**Why it matters:**

Users increasingly get answers directly from AI rather than clicking through search results. Your repository needs to be:

1. **Discoverable** by AI systems
2. **Parseable** for information extraction
3. **Citable** with clear attribution
4. **Comprehensive** to answer questions fully

## Core AEO Principles

### 1. Structured Content for AI Parsing

AI systems parse structured content more effectively than unstructured text.

**Use clear hierarchies:**

```markdown
# Project Title

## Overview

Clear, concise description of what the project does.

## Features

- Feature 1: Description with context
- Feature 2: Description with context
- Feature 3: Description with context

## Installation

Step-by-step instructions...

## Usage

### Basic Usage

Code example with explanation...

### Advanced Usage

Code example with explanation...
```

**Avoid:**

```markdown
# Project

Lots of text in one paragraph with no structure or headings making it
hard to parse and understand what the project does or how to use it...

Some code

More text...
```

### 2. Context Over Keywords

AI systems understand semantic meaning, not just keywords.

**Provide "why" not just "what":**

```markdown
✅ GOOD:

## Authentication

This library provides OAuth2 and JWT authentication for FastAPI applications.
OAuth2 is used for delegated authorization (allowing users to grant access
without sharing passwords), while JWT enables stateless authentication with
cryptographically signed tokens.

❌ BAD:

## Authentication

OAuth2 and JWT support.
```

**Include use cases:**

```markdown
## Use Cases

### E-commerce API

Use this library to secure your e-commerce API endpoints, ensuring that only
authenticated users can place orders and access their purchase history.

### Multi-tenant SaaS

Implement per-tenant authentication with OAuth2 scopes, allowing fine-grained
access control across different customer organizations.
```

### 3. Standard File Structures

AI systems recognize standard documentation patterns.

**Essential files:**

| File                | Purpose                       | AEO Benefit                     |
| ------------------- | ----------------------------- | ------------------------------- |
| README.md           | Primary documentation         | First source for AI information |
| CONTRIBUTING.md     | Contributor guidelines        | Shows development process       |
| SECURITY.md         | Security policy and reporting | Security-related queries        |
| CHANGELOG.md        | Version history               | Update tracking and history     |
| LICENSE             | Legal terms                   | Licensing questions             |
| CODE_OF_CONDUCT.md  | Community standards           | Community-related questions     |
| CITATION.cff        | Academic citation format      | Research and citation queries   |
| docs/               | Extended documentation        | In-depth topic coverage         |
| examples/           | Working code examples         | Implementation questions        |
| .github/FUNDING.yml | Sponsorship information       | Funding/support questions       |

**Example CITATION.cff:**

```yaml
cff-version: 1.2.0
title: FastAPI Authentication Library
message: "If you use this software, please cite it as below."
type: software
authors:
  - family-names: Doe
    given-names: John
    orcid: https://orcid.org/0000-0000-0000-0000
repository-code: "https://github.com/user/fastapi-auth"
keywords:
  - fastapi
  - authentication
  - oauth2
  - jwt
license: MIT
```

### 4. Complete Metadata

Package files should have complete, descriptive metadata.

**package.json example:**

```json
{
  "name": "fastapi-auth-client",
  "version": "1.0.0",
  "description": "FastAPI authentication client with OAuth2 and JWT support for Node.js applications",
  "keywords": ["fastapi", "authentication", "oauth2", "jwt", "api-client"],
  "author": {
    "name": "John Doe",
    "email": "john@example.com",
    "url": "https://example.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/user/fastapi-auth-client"
  },
  "bugs": {
    "url": "https://github.com/user/fastapi-auth-client/issues"
  },
  "homepage": "https://github.com/user/fastapi-auth-client#readme"
}
```

**setup.py example:**

```python
setup(
    name='fastapi-auth-client',
    version='1.0.0',
    description='FastAPI authentication client with OAuth2 and JWT support',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    author='John Doe',
    author_email='john@example.com',
    url='https://github.com/user/fastapi-auth-client',
    keywords=['fastapi', 'authentication', 'oauth2', 'jwt', 'api-client'],
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Topic :: Software Development :: Libraries',
    ],
)
```

### 5. Clear Examples with Context

Provide complete, runnable examples with explanations.

**Good example:**

```markdown
## Quick Start

### OAuth2 Authentication Example

This example shows how to authenticate a user with OAuth2 and obtain an access token:

\`\`\`python
from fastapi_auth import OAuth2Client

# Initialize the client with your credentials

client = OAuth2Client(
client_id="your_client_id",
client_secret="your_client_secret",
redirect_uri="http://localhost:8000/callback"
)

# Step 1: Get authorization URL and redirect user

auth_url = client.get_authorization_url(
scope=["read:user", "write:repo"]
)
print(f"Visit this URL to authorize: {auth_url}")

# Step 2: Exchange authorization code for access token

# (after user visits auth_url and you receive the callback)

token = client.exchange_code(authorization_code)

# Step 3: Use the access token to make API calls

user_data = client.get("/user", token=token.access_token)
print(f"Authenticated as: {user_data['name']}")
\`\`\`

**What this does:**

1. Creates an OAuth2 client with your application credentials
2. Generates an authorization URL for the user to grant permissions
3. Exchanges the authorization code for an access token
4. Uses the token to make authenticated API requests

**Common issues:**

- **Invalid redirect_uri**: Ensure it matches your registered callback URL
- **Expired code**: Authorization codes expire after 10 minutes
- **Missing scopes**: Request all necessary scopes during authorization
```

### 6. Consistent Terminology

Use consistent terms throughout all documentation.

**Choose and stick with:**

```
✅ GOOD (Consistent):
- Access token (always "access token", never "auth token" or "bearer token")
- OAuth2 (always "OAuth2", never "OAuth 2.0" or "oauth2")
- API endpoint (always "API endpoint", never "endpoint" or "API route")

❌ BAD (Inconsistent):
- Access token / auth token / bearer token (multiple terms for same thing)
- OAuth2 / OAuth 2.0 / oauth2 (mixed capitalization)
- Endpoint / API endpoint / route (unclear terminology)
```

**Create a terminology guide:**

```markdown
## Terminology

- **Access Token**: Short-lived credential for API authentication
- **Refresh Token**: Long-lived credential for obtaining new access tokens
- **OAuth2**: Industry-standard authorization framework (RFC 6749)
- **JWT**: JSON Web Token for stateless authentication (RFC 7519)
- **Client Credentials**: Application-level authentication without user
```

## AI-Specific Optimizations

### 1. Question-Answer Format

Structure documentation to directly answer common questions.

```markdown
## Frequently Asked Questions

### How do I refresh an expired access token?

Use the `refresh_token` to obtain a new `access_token`:

\`\`\`python
new_token = client.refresh_token(old_token.refresh_token)
\`\`\`

### What scopes should I request?

Request the minimum scopes necessary for your application:

- `read:user` - Read user profile information
- `write:repo` - Modify repository contents
- `admin:org` - Manage organization settings

### How do I handle token expiration?

Check the `expires_at` field and refresh proactively:

\`\`\`python
if token.is_expired():
token = client.refresh_token(token.refresh_token)
\`\`\`
```

### 2. Code Comments as Documentation

AI systems parse code comments for understanding:

```python
def authenticate(username: str, password: str) -> Token:
    """
    Authenticate a user with username and password credentials.

    This method performs password-based authentication and returns
    an access token for subsequent API calls. The token expires
    after 1 hour and must be refreshed using the refresh_token.

    Args:
        username: User's email or username
        password: User's password (transmitted securely over HTTPS)

    Returns:
        Token object containing access_token, refresh_token, and expires_at

    Raises:
        AuthenticationError: If credentials are invalid
        NetworkError: If unable to reach authentication server

    Example:
        >>> token = client.authenticate("user@example.com", "password123")
        >>> print(token.access_token)
        'eyJhbGciOiJIUzI1NiIs...'
    """
```

### 3. Schema Definitions

Provide structured schema definitions for APIs:

**OpenAPI/Swagger:**

```yaml
openapi: 3.0.0
info:
  title: FastAPI Authentication API
  description: OAuth2 and JWT authentication for FastAPI applications
  version: 1.0.0
paths:
  /auth/login:
    post:
      summary: Authenticate user with credentials
      description: Exchanges username/password for access and refresh tokens
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                  example: user@example.com
                password:
                  type: string
                  format: password
      responses:
        "200":
          description: Authentication successful
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Token"
```

**TypeScript interfaces:**

```typescript
/**
 * OAuth2 access token response
 */
export interface Token {
  /** JWT access token for API authentication */
  access_token: string;

  /** Refresh token for obtaining new access tokens */
  refresh_token: string;

  /** Token expiration timestamp (Unix epoch) */
  expires_at: number;

  /** Token type (always "Bearer") */
  token_type: "Bearer";

  /** Granted OAuth2 scopes */
  scope: string[];
}
```

### 4. Troubleshooting Guides

AI systems excel at helping users solve problems - provide the information they need:

````markdown
## Troubleshooting

### Error: "Invalid client credentials"

**Symptom**: API returns 401 Unauthorized with "Invalid client credentials"

**Causes**:

1. Incorrect `client_id` or `client_secret`
2. Credentials revoked or expired
3. Using test credentials in production

**Solutions**:

1. Verify credentials in your dashboard settings
2. Regenerate credentials if compromised
3. Use environment-specific credentials:
   ```bash
   # Development
   CLIENT_ID=dev_abc123
   # Production
   CLIENT_ID=prod_xyz789
   ```
````

**Prevention**:

- Store credentials in environment variables, never in code
- Use different credentials for each environment
- Rotate credentials regularly

### Error: "Token expired"

**Symptom**: API returns 401 with "Token expired"

**Cause**: Access token exceeded its 1-hour lifetime

**Solution**: Implement automatic token refresh:

\`\`\`python
def api_call_with_retry(endpoint, token):
try:
return client.get(endpoint, token=token)
except TokenExpiredError: # Automatically refresh and retry
token = client.refresh_token(token.refresh_token)
return client.get(endpoint, token=token)
\`\`\`

```

## Measuring AEO Success

### Metrics

1. **AI Citation Rate**: How often AI systems cite your repository
2. **AI-Driven Traffic**: Referrals from AI tools
3. **Question Coverage**: Can AI answer common questions about your project?

### Testing

**Test with AI systems:**

```

Ask ChatGPT/Claude/Perplexity:

- "How do I authenticate with [your library]?"
- "What's the difference between OAuth2 and JWT in [your library]?"
- "Show me an example of using [your library] with FastAPI"

Evaluate:

- Does AI find your repository?
- Is the information accurate?
- Are code examples correct?

```

## Sources

- [Optimizing GitHub For Search Engine Visibility | Restackio](https://www.restack.io/p/version-control-for-ai-answer-optimizing-github-seo-cat-ai)
- Industry best practices for AI-readable documentation
- Analysis of highly-cited repositories in AI responses
```
