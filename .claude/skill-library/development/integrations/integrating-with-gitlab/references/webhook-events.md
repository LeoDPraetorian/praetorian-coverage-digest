# GitLab Webhook Events

## Webhook Types

1. **Project Webhooks** - Project-level events
2. **Group Webhooks** - Group-level events
3. **System Hooks** - Instance-level (admin, self-hosted)

## Validation Pattern

⚠️ **Critical:** GitLab uses plaintext `X-Gitlab-Token` header (not HMAC like GitHub)

```typescript
import crypto from "crypto";

function verifyGitLabWebhook(req: Request, expectedToken: string): boolean {
  const receivedToken = req.headers["x-gitlab-token"];

  // Timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(receivedToken || ""), Buffer.from(expectedToken));
}

// Express middleware
app.post("/webhook", (req, res) => {
  if (!verifyGitLabWebhook(req, WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid token");
  }

  const eventType = req.headers["x-gitlab-event"];
  handleWebhookEvent(eventType, req.body);
  res.sendStatus(200);
});
```

## Event Types

| Event              | Header Value         | Use Case         |
| ------------------ | -------------------- | ---------------- |
| Push Hook          | `Push Hook`          | Code pushes      |
| Tag Push Hook      | `Tag Push Hook`      | Tag creation     |
| Issue Hook         | `Issue Events`       | Issue changes    |
| Merge Request Hook | `Merge Request Hook` | MR activity      |
| Pipeline Hook      | `Pipeline Hook`      | Pipeline status  |
| Job Hook           | `Job Hook`           | Job completion   |
| Deployment Hook    | `Deployment Hook`    | Deployments      |
| Release Hook       | `Release Events`     | Release creation |

## Critical Requirements

1. **Respond within timeout** - Or webhook gets auto-disabled
2. **Always use HTTPS** - For webhook endpoints
3. **Store secret securely** - In secrets manager
4. **Monitor patterns** - Detect anomalies

## Security Mitigation

**Known Issue:** Plaintext token less secure than HMAC (open feature request since 2019)

**Mitigations:**

- Use HTTPS (mandatory)
- IP allowlisting (GitLab instance IPs)
- Token rotation every 90 days
- Monitor for unusual patterns

For comprehensive webhook patterns, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md` (Section 1.4)
