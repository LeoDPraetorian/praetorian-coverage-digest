# Linear OAuth Architecture Analysis

> **For Claude:** This document analyzes the OAuth flow architecture differences between the "old" Linear MCP server approach and our current HTTP client implementation.

**Goal:** Make Linear OAuth "just work" without manual clientId configuration

**Date:** 2026-01-06

**Agent:** tool-lead (Architecture)

---

## Executive Summary

The user expects Linear OAuth to work automatically (open browser, authorize, continue) without manual setup. Our current implementation requires users to create their own OAuth app at Linear and configure the `clientId` in `credentials.json`. This analysis explains why this differs from the "old MCP server" experience and provides architecture recommendations.

**Key Finding:** Linear does NOT support OAuth Dynamic Client Registration (RFC 7591). The "seamless" experience users remember from the official Linear MCP server is because Linear hosts that server themselves with their own embedded OAuth app.

---

## Verified Current Implementation

### Source Files Analyzed

| File | Purpose | Lines Verified |
|------|---------|----------------|
| `.claude/tools/config/lib/oauth-manager.ts` | OAuth token management with PKCE | 1-311 |
| `.claude/tools/config/lib/oauth-browser-flow.ts` | Browser-based OAuth flow handler | 1-180 |
| `.claude/tools/linear/client.ts` | Linear GraphQL client with OAuth | 1-210 |
| `.claude/tools/config/credentials.json` | Credential storage (no Linear entry) | 1-14 |

### Current Architecture

```
                    ┌─────────────────────┐
                    │   credentials.json   │
                    │  (manual clientId)   │
                    └──────────┬──────────┘
                               │
                               ▼
┌──────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│  Linear API  │◄───│    OAuth Manager    │───►│ ~/.claude-oauth │
│  GraphQL     │    │  (PKCE flow)        │    │  /linear.json   │
└──────────────┘    └──────────┬──────────┘    └─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Browser Flow      │
                    │ (localhost:3847)    │
                    └─────────────────────┘
```

**Current Flow:**
1. User must manually create OAuth app at `https://linear.app/settings/api/applications`
2. User must configure `clientId` in `credentials.json` or `LINEAR_CLIENT_ID` env var
3. On first API call, browser opens for authorization
4. Tokens stored in `~/.claude-oauth/linear.json` with automatic refresh

**Code Evidence (oauth-manager.ts lines 303-310):**
```typescript
export const LinearOAuthConfig: OAuthConfig = {
  provider: 'linear',
  clientId: '', // Set via environment variable or credentials.json
  authorizationUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  scopes: ['read', 'write', 'issues:create'],
  redirectUri: 'http://localhost:3847/callback',
};
```

**Code Evidence (client.ts lines 102-119):**
```typescript
if (!oauthConfig.clientId) {
  throw new OAuthConfigurationError(
    'Linear OAuth not configured.\n\n' +
    'Setup Instructions:\n' +
    '1. Create OAuth app at https://linear.app/settings/api/applications\n' +
    // ... detailed setup instructions
  );
}
```

---

## How the "Old" Linear MCP Server Works

### Official Linear MCP Server

Linear's official MCP server (`https://mcp.linear.app/sse`) provides a "zero-config" experience because:

1. **Hosted by Linear** - They embed their own OAuth app with pre-configured clientId
2. **Uses mcp-remote** - Installation: `npx mcp-remote https://mcp.linear.app/sse`
3. **Handles OAuth internally** - Linear's server manages the entire OAuth flow

**This is NOT Dynamic Client Registration** - it's simply that Linear ships their own OAuth app embedded in their hosted MCP server.

### Community Linear MCP Servers

Third-party implementations (cline/linear-mcp, etc.) face the same challenge as our implementation:
- Either require users to configure `LINEAR_CLIENT_ID` environment variable
- Or use API keys instead (less secure, but simpler setup)

---

## Why Linear Cannot "Just Work" Without Configuration

### Linear Does NOT Support Dynamic Client Registration (RFC 7591)

**Evidence from research:**
- Linear requires OAuth apps to be created manually via web UI
- No `/register` endpoint exists for programmatic client registration
- All Linear OAuth documentation points to manual app creation

**What DCR Would Enable:**
```
Client → POST /oauth/register → Server
Server → Returns { client_id, client_secret } → Client
Client → Uses credentials for OAuth flow
```

Linear does not implement this pattern.

---

## Architecture Options

### Option A: Ship a Shared OAuth Client ID (Recommended for UX)

**Architecture:**
```
┌─────────────────────────────────────┐
│     Praetorian-owned OAuth App      │
│  (created at Linear, clientId       │
│   hardcoded in codebase)            │
└──────────────────┬──────────────────┘
                   │
                   ▼
        ┌──────────────────┐
        │  All Claude Code │
        │     Users        │
        └──────────────────┘
```

**Implementation:**
1. Create OAuth app at Linear named "Claude Code (Praetorian)"
   - Redirect URI: `http://localhost:3847/callback`
   - Scopes: `read`, `write`, `issues:create`
2. Hardcode `clientId` in `LinearOAuthConfig` (oauth-manager.ts line 305)
3. Each user still gets their own tokens via browser flow
4. Tokens stored per-user in `~/.claude-oauth/linear.json`

**Pros:**
- "Just works" - no user configuration needed
- Browser authorization still happens (user consent)
- Each user has their own access/refresh tokens
- Mirrors how official Linear MCP server works

**Cons:**
- Shared rate limit bucket (500 req/hour shared across all users using this clientId)
- Security: If clientId is leaked, attackers could create phishing apps
- Attribution: All API calls attributed to single OAuth app
- Dependency: If Praetorian OAuth app is revoked, all users affected

### Option B: Use Official Linear MCP Server via mcp-remote

**Architecture:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude Code    │────►│   mcp-remote    │────►│  Linear MCP     │
│  (stdio)        │     │   (proxy)       │     │  (SSE server)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Implementation:**
- Replace direct GraphQL client with mcp-remote connection
- Installation: `npx mcp-remote https://mcp.linear.app/sse`

**Pros:**
- Zero configuration
- Linear handles all OAuth
- Uses Linear's official OAuth app

**Cons:**
- Different API surface (MCP tools vs direct GraphQL)
- Cannot customize queries or response filtering
- External dependency on mcp-remote tool
- Less control over token optimization (our wrappers filter responses)

### Option C: Keep Current Implementation (Manual Setup)

**Architecture:** (Current - no change)

**Pros:**
- Each user owns their OAuth app
- Clear audit trail per user
- No shared resources
- Users control their own revocation

**Cons:**
- Setup friction (5-10 minutes of manual steps)
- Users may abandon setup
- Requires documentation

### Option D: Hybrid - Default Shared + Optional Custom

**Architecture:**
```
credentials.json has clientId? ──► Use custom OAuth app
        │
        └──► Use hardcoded Praetorian OAuth app
```

**Implementation:**
```typescript
const getLinearOAuthConfig = () => {
  const creds = hasToolConfig('linear') ? getToolConfig<{
    clientId?: string;
  }>('linear') : {};

  return {
    ...LinearOAuthConfig,
    // Fall back to shared clientId if not configured
    clientId: creds.clientId || process.env.LINEAR_CLIENT_ID || PRAETORIAN_LINEAR_CLIENT_ID,
  };
};
```

**Pros:**
- "Just works" by default
- Power users can use their own OAuth app
- Best of both worlds

**Cons:**
- Still has shared OAuth app security concerns
- Complexity of supporting both paths

---

## Security Trade-offs Analysis

### Shared OAuth App Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Rate limit exhaustion** | Medium | 500 req/hour may be insufficient for heavy users |
| **Client ID leakage** | Low | ClientId alone cannot access data (requires user auth) |
| **Phishing attacks** | Medium | Attacker could create fake auth page with our clientId |
| **Audit trail** | Low | All requests attributed to single app (Linear logs) |
| **Mass revocation** | High | If app revoked, ALL users lose access instantly |

### Per-User OAuth App Benefits

| Benefit | Value |
|---------|-------|
| **Isolated rate limits** | Each user has own 500 req/hour |
| **Clear ownership** | User controls revocation |
| **Audit trail** | User's requests attributed to their app |
| **No shared dependencies** | One user's issues don't affect others |

### Industry Comparison

| Service | Approach | Notes |
|---------|----------|-------|
| **Linear Official MCP** | Shared (Linear-owned) | They trust themselves |
| **Slack MCP** | Per-user app creation | More secure, more friction |
| **GitHub CLI (gh)** | Shared OAuth app | `gh` ships with hardcoded clientId |
| **VS Code Extensions** | Shared OAuth apps | Common pattern for first-party tools |

---

## Recommendation

### Primary Recommendation: Option D (Hybrid)

**Why:**
1. Minimizes user friction (default shared app)
2. Provides escape hatch for power users (custom clientId)
3. Matches patterns used by official tools (gh, VS Code)
4. Our OAuth flow already handles browser auth and token storage correctly

**Implementation Steps:**

1. **Create Praetorian OAuth App at Linear**
   - Name: `Claude Code (Praetorian)`
   - Redirect URI: `http://localhost:3847/callback`
   - Scopes: `read`, `write`, `issues:create`
   - Record the clientId

2. **Update oauth-manager.ts**
   ```typescript
   // Line 305 - Add fallback clientId
   const PRAETORIAN_LINEAR_CLIENT_ID = 'xxx-actual-client-id-xxx';

   export const LinearOAuthConfig: OAuthConfig = {
     provider: 'linear',
     clientId: PRAETORIAN_LINEAR_CLIENT_ID, // Default to shared app
     // ... rest unchanged
   };
   ```

3. **Update client.ts getLinearOAuthConfig()**
   ```typescript
   const getLinearOAuthConfig = () => {
     const creds = hasToolConfig('linear') ? getToolConfig<{
       clientId?: string;
     }>('linear') : {};

     return {
       ...LinearOAuthConfig,
       // Override with custom clientId if provided
       clientId: creds.clientId || process.env.LINEAR_CLIENT_ID || LinearOAuthConfig.clientId,
     };
   };
   ```

4. **Update error message** (optional - for documentation)
   ```typescript
   // Remove setup instructions from error, since it "just works" now
   // Keep error only for when browser flow fails
   ```

### Alternative: Option A if Hybrid is Too Complex

If maintaining two paths adds complexity, simply hardcode the shared clientId. This is what GitHub CLI does, and it works well for first-party tooling.

---

## Questions to Answer

### 1. How did the MCP server configure the OAuth clientId? Was it hardcoded?

**Answer:** The official Linear MCP server (`https://mcp.linear.app/sse`) uses a Linear-owned OAuth app with the clientId embedded in their server code. This is effectively hardcoded, but by Linear themselves (not exposed to users).

### 2. Should we provide a default/shared Linear OAuth app for Claude Code users?

**Answer:** Yes, this is the recommended approach. It matches the pattern used by official tools like GitHub CLI (`gh`) and VS Code extensions. The shared app enables "zero-config" experience while still requiring per-user authorization via browser.

### 3. How can we make the flow "just work" without manual clientId configuration?

**Answer:** Hardcode a Praetorian-owned OAuth clientId as the default in `LinearOAuthConfig`. The browser authorization flow will still happen on first use, but users won't need to create their own OAuth app or configure credentials.json.

### 4. What's the security trade-off of a shared OAuth app vs. user-created apps?

**Answer:**

| Aspect | Shared App | User-Created App |
|--------|------------|------------------|
| **Rate Limits** | Shared (500 req/hour for ALL users) | Isolated (500 req/hour per user) |
| **Token Security** | Same (tokens still per-user) | Same |
| **Revocation Risk** | High (one revocation affects all) | Low (only affects that user) |
| **Phishing Risk** | Medium (attacker could use our clientId) | Low (unique per user) |
| **Setup Friction** | None | 5-10 minutes |

The shared app is acceptable for internal/first-party tooling where trust is established. For public distribution, consider documenting how users can use their own OAuth app for enhanced security.

---

## Sources

- [Linear MCP Server Documentation](https://linear.app/docs/mcp)
- [Linear MCP Server Changelog](https://linear.app/changelog/2025-05-01-mcp)
- [Let's fix OAuth in MCP - Aaron Parecki](https://aaronparecki.com/2025/04/03/15/oauth-for-model-context-protocol)
- [MCP OAuth Dynamic Client Registration - Stytch](https://stytch.com/blog/mcp-oauth-dynamic-client-registration/)
- [mcp-remote GitHub Repository](https://github.com/geelen/mcp-remote)
- [cline/linear-mcp GitHub Repository](https://github.com/cline/linear-mcp)

---

## Metadata

```json
{
  "agent": "tool-lead",
  "output_type": "architecture-plan",
  "timestamp": "2026-01-06T00:00:00Z",
  "feature_directory": ".claude/tools/linear",
  "skills_invoked": [
    "enforcing-evidence-based-analysis",
    "gateway-mcp-tools",
    "gateway-typescript",
    "persisting-agent-outputs",
    "brainstorming",
    "writing-plans"
  ],
  "library_skills_read": [],
  "source_files_verified": [
    ".claude/tools/config/lib/oauth-manager.ts:1-311",
    ".claude/tools/config/lib/oauth-browser-flow.ts:1-180",
    ".claude/tools/linear/client.ts:1-210",
    ".claude/tools/config/credentials.json:1-14"
  ],
  "status": "complete",
  "handoff": {
    "next_agent": "tool-developer",
    "context": "Implement Option D (Hybrid) - add hardcoded Praetorian clientId with user override capability"
  }
}
```
