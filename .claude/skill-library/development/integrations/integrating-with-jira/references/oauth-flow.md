# OAuth 2.0 (3LO) Implementation Reference

**Complete OAuth 2.0 three-legged flow for Jira Cloud production integrations.**

## Overview

OAuth 2.0 (3LO - three-legged OAuth) is Atlassian's recommended authentication method for production applications accessing Jira Cloud.

**Benefits**:

- No credential exposure (user never gives password to your app)
- Granular scopes (request only permissions needed)
- User consent flows (audit trail)
- Rotating refresh tokens (reduced security risk)
- Higher rate limits (65,000+ points/hour)

**Use When**:

- Building production applications
- Third-party integrations
- Marketplace apps
- Apps requiring user delegation

**Don't Use When**:

- Personal scripts (use API tokens)
- Server/Data Center (use OAuth 1.0a or PAT)
- CI/CD automation (use service account + API token)

## Prerequisites

1. **Create an OAuth 2.0 App** in Atlassian Developer Console:
   - Go to https://developer.atlassian.com/console/myapps/
   - Click "Create" → "OAuth 2.0 integration"
   - Configure redirect URIs
   - Note Client ID and Client Secret

2. **Configure Scopes** based on your needs (see Scopes section)

3. **Set Redirect URIs** for authorization callback

## Authorization Flow

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌─────┐
│  User   │     │ Your App │     │  Atlassian  │     │Jira │
└────┬────┘     └────┬─────┘     └──────┬──────┘     └──┬──┘
     │               │                   │              │
     │ 1. Click Login│                   │              │
     │──────────────>│                   │              │
     │               │                   │              │
     │               │ 2. Redirect to    │              │
     │               │    auth endpoint  │              │
     │               │──────────────────>│              │
     │               │                   │              │
     │ 3. User authorizes (consent screen)│             │
     │<──────────────────────────────────│              │
     │               │                   │              │
     │ 4. Redirect with code             │              │
     │──────────────>│                   │              │
     │               │                   │              │
     │               │ 5. Exchange code  │              │
     │               │    for tokens     │              │
     │               │──────────────────>│              │
     │               │                   │              │
     │               │ 6. Access + Refresh tokens       │
     │               │<──────────────────│              │
     │               │                   │              │
     │               │ 7. API call with access token    │
     │               │─────────────────────────────────>│
     │               │                   │              │
     │               │ 8. API response   │              │
     │               │<─────────────────────────────────│
     │               │                   │              │
```

## Step-by-Step Implementation

### Step 1: Generate Authorization URL

```typescript
import crypto from "crypto";

interface AuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

function generateAuthUrl(config: AuthConfig): { url: string; state: string; codeVerifier: string } {
  // Generate CSRF protection state
  const state = crypto.randomBytes(32).toString("hex");

  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  // Build authorization URL
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: config.clientId,
    scope: config.scopes.join(" "),
    redirect_uri: config.redirectUri,
    state: state,
    response_type: "code",
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url = `https://auth.atlassian.com/authorize?${params.toString()}`;

  return { url, state, codeVerifier };
}

// Usage
const { url, state, codeVerifier } = generateAuthUrl({
  clientId: process.env.ATLASSIAN_CLIENT_ID!,
  redirectUri: "https://your-app.com/callback",
  scopes: ["read:jira-work", "write:jira-work", "offline_access"],
});

// Store state and codeVerifier in session for verification
session.set("oauth_state", state);
session.set("oauth_code_verifier", codeVerifier);

// Redirect user to authorization URL
res.redirect(url);
```

### Step 2: Handle Authorization Callback

```typescript
app.get("/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Check for errors
  if (error) {
    console.error("OAuth error:", error, error_description);
    return res.redirect("/login?error=auth_failed");
  }

  // Verify state to prevent CSRF
  const savedState = session.get("oauth_state");
  if (state !== savedState) {
    return res.redirect("/login?error=invalid_state");
  }

  // Get stored code verifier
  const codeVerifier = session.get("oauth_code_verifier");

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string, codeVerifier);

    // Get accessible resources (Jira sites)
    const resources = await getAccessibleResources(tokens.access_token);

    // Store tokens and cloud ID
    await storeTokens(req.user.id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      cloudId: resources[0].id, // First accessible Jira site
    });

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Token exchange failed:", err);
    res.redirect("/login?error=token_exchange_failed");
  }
});
```

### Step 3: Exchange Code for Tokens

```typescript
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
  scope: string;
}

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.ATLASSIAN_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}
```

### Step 4: Get Accessible Resources

```typescript
interface AccessibleResource {
  id: string; // Cloud ID
  url: string; // https://your-domain.atlassian.net
  name: string; // Site name
  scopes: string[]; // Granted scopes
  avatarUrl: string;
}

async function getAccessibleResources(accessToken: string): Promise<AccessibleResource[]> {
  const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get accessible resources");
  }

  return response.json();
}
```

### Step 5: Make API Calls

```typescript
async function makeJiraRequest(
  cloudId: string,
  accessToken: string,
  endpoint: string
): Promise<any> {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("TOKEN_EXPIRED");
    }
    throw new Error(`API call failed: ${response.status}`);
  }

  return response.json();
}

// Usage
const myself = await makeJiraRequest(cloudId, accessToken, "/rest/api/3/myself");
```

### Step 6: Refresh Tokens

**Critical**: Atlassian uses **rotating refresh tokens**. Each refresh issues a NEW refresh token and invalidates the old one.

```typescript
interface RefreshResponse {
  access_token: string;
  refresh_token: string; // NEW refresh token!
  expires_in: number;
  token_type: "Bearer";
  scope: string;
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Usage with automatic token management
async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getStoredTokens(userId);

  // Check if access token is expired (with 5-minute buffer)
  if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    const newTokens = await refreshAccessToken(tokens.refreshToken);

    // IMPORTANT: Store the NEW refresh token
    await storeTokens(userId, {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token, // NEW token!
      expiresAt: Date.now() + newTokens.expires_in * 1000,
      cloudId: tokens.cloudId,
    });

    return newTokens.access_token;
  }

  return tokens.accessToken;
}
```

## Scopes

### Common Scopes

| Scope                       | Permission                            |
| --------------------------- | ------------------------------------- |
| `read:jira-work`            | Read issues, projects, comments, etc. |
| `write:jira-work`           | Create/update issues, comments, etc.  |
| `read:jira-user`            | Read user information                 |
| `manage:jira-project`       | Manage project settings               |
| `manage:jira-configuration` | Manage Jira configuration             |
| `offline_access`            | **Required** for refresh tokens       |

### Scope Selection Best Practice

Request minimum scopes needed:

```typescript
// Read-only integration
const scopes = ["read:jira-work", "offline_access"];

// Full issue management
const scopes = ["read:jira-work", "write:jira-work", "offline_access"];

// User lookup + issue management
const scopes = ["read:jira-work", "write:jira-work", "read:jira-user", "offline_access"];
```

## Token Lifecycle

### Access Token

- **Lifetime**: 1 hour (3600 seconds)
- **Use**: Include in `Authorization: Bearer` header
- **Refresh**: Before expiry using refresh token

### Refresh Token

- **Lifetime**: 90 days of inactivity
- **Rotation**: Each refresh issues NEW refresh token
- **Reuse Window**: 10 minutes (for concurrent requests)
- **Storage**: Secure, encrypted storage required

### Token Expiry Timeline

```
T+0:        Access token issued (valid 1 hour)
T+55 min:   Refresh token (get new access + refresh token)
T+60 min:   Original access token expires
...
T+90 days:  Refresh token expires if unused
```

## Error Handling

### Common OAuth Errors

| Error                 | Cause                             | Solution                |
| --------------------- | --------------------------------- | ----------------------- |
| `invalid_grant`       | Refresh token expired or revoked  | Re-authorize user       |
| `invalid_client`      | Wrong client ID/secret            | Check credentials       |
| `invalid_scope`       | Requested scope not configured    | Update app scopes       |
| `access_denied`       | User denied authorization         | Handle gracefully       |
| `unauthorized_client` | App not authorized for grant type | Check app configuration |

### Handling Token Expiry

```typescript
async function jiraApiCall(userId: string, endpoint: string): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(userId);
    return await makeJiraRequest(cloudId, accessToken, endpoint);
  } catch (error) {
    if (error.message === "TOKEN_EXPIRED" || error.message.includes("invalid_grant")) {
      // Refresh token also expired - need re-authorization
      throw new Error("RE_AUTH_REQUIRED");
    }
    throw error;
  }
}
```

## Security Best Practices

### 1. Always Use PKCE

```typescript
// Generate PKCE parameters
const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

// Include in authorization URL
const params = new URLSearchParams({
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
  // ... other params
});
```

### 2. Validate State Parameter

```typescript
// Store state before redirect
session.set("oauth_state", state);

// Verify on callback
if (req.query.state !== session.get("oauth_state")) {
  throw new Error("CSRF detected");
}
```

### 3. Store Tokens Securely

```typescript
// Encrypt tokens at rest
import { encrypt, decrypt } from "./crypto";

async function storeTokens(userId: string, tokens: Tokens): Promise<void> {
  await db.query("UPDATE users SET oauth_tokens = $1 WHERE id = $2", [
    encrypt(JSON.stringify(tokens)),
    userId,
  ]);
}

async function getStoredTokens(userId: string): Promise<Tokens> {
  const result = await db.query("SELECT oauth_tokens FROM users WHERE id = $1", [userId]);
  return JSON.parse(decrypt(result.rows[0].oauth_tokens));
}
```

### 4. Handle Concurrent Refreshes

```typescript
const refreshLocks = new Map<string, Promise<RefreshResponse>>();

async function safeRefresh(userId: string, refreshToken: string): Promise<RefreshResponse> {
  // Check for in-flight refresh
  const existing = refreshLocks.get(userId);
  if (existing) {
    return existing;
  }

  // Create new refresh promise
  const refreshPromise = refreshAccessToken(refreshToken);
  refreshLocks.set(userId, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    refreshLocks.delete(userId);
  }
}
```

### 5. Never Expose Client Secret

```typescript
// Client secret should only be used server-side
// NEVER include in client-side JavaScript
// NEVER commit to version control

// Use environment variables
const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
```

## Complete Example

```typescript
import express from "express";
import crypto from "crypto";
import session from "express-session";

const app = express();

// OAuth configuration
const OAUTH_CONFIG = {
  clientId: process.env.ATLASSIAN_CLIENT_ID!,
  clientSecret: process.env.ATLASSIAN_CLIENT_SECRET!,
  redirectUri: process.env.ATLASSIAN_REDIRECT_URI!,
  scopes: ["read:jira-work", "write:jira-work", "offline_access"],
};

// Step 1: Start authorization
app.get("/auth/jira", (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;

  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: OAUTH_CONFIG.clientId,
    scope: OAUTH_CONFIG.scopes.join(" "),
    redirect_uri: OAUTH_CONFIG.redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  res.redirect(`https://auth.atlassian.com/authorize?${params}`);
});

// Step 2: Handle callback
app.get("/auth/jira/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error || state !== req.session.oauthState) {
    return res.redirect("/login?error=auth_failed");
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret,
        code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        code_verifier: req.session.codeVerifier,
      }),
    });

    const tokens = await tokenResponse.json();

    // Get accessible Jira sites
    const resourcesResponse = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const resources = await resourcesResponse.json();

    // Store tokens
    req.session.jiraTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      cloudId: resources[0].id,
    };

    res.redirect("/dashboard");
  } catch (err) {
    res.redirect("/login?error=token_exchange_failed");
  }
});

// Step 3: Make API calls
app.get("/api/issues", async (req, res) => {
  const tokens = req.session.jiraTokens;
  if (!tokens) return res.status(401).json({ error: "Not authenticated" });

  // Refresh if needed
  if (tokens.expiresAt < Date.now() + 60000) {
    const refreshResponse = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: OAUTH_CONFIG.clientId,
        client_secret: OAUTH_CONFIG.clientSecret,
        refresh_token: tokens.refreshToken,
      }),
    });

    const newTokens = await refreshResponse.json();
    req.session.jiraTokens = {
      ...tokens,
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: Date.now() + newTokens.expires_in * 1000,
    };
  }

  // Make API call
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${tokens.cloudId}/rest/api/3/search?jql=assignee=currentUser()`,
    { headers: { Authorization: `Bearer ${req.session.jiraTokens.accessToken}` } }
  );

  const issues = await response.json();
  res.json(issues);
});

app.listen(3000);
```
