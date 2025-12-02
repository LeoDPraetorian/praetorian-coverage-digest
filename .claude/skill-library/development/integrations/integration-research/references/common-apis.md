# Common API Integration Patterns

Quick reference guide for popular third-party API integrations. Use this to accelerate research when integrating well-known services.

## Table of Contents

- [Stripe (Payments)](#stripe-payments)
- [Twilio (SMS/Communications)](#twilio-smscommunications)
- [AWS SDK (Cloud Services)](#aws-sdk-cloud-services)
- [GitHub API (Source Control)](#github-api-source-control)

---

## Stripe (Payments)

**Official Docs:** https://stripe.com/docs/api
**Node SDK:** `npm install stripe`
**Go SDK:** `go get github.com/stripe/stripe-go/v83`

### Authentication
```javascript
// Node.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```

**Critical:** Never commit API keys. Use environment variables.

### Core Patterns

| Pattern | Implementation | Critical Gotcha |
|---------|---------------|-----------------|
| **Idempotency** | `IdempotencyKey` header on POST requests | **MUST USE** - prevents duplicate charges on network retry |
| **Webhook Security** | Verify `Stripe-Signature` header with webhook secret | **MUST VERIFY** - prevents fraud/tampering |
| **Error Handling** | Catch `StripeCardError`, `StripeInvalidRequestError`, etc. | Different retry strategies per error type |
| **Rate Limits** | 100 requests/second (standard) | Use exponential backoff on 429 |

### Payment Intent Flow (Recommended)

```typescript
// 1. Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
  customer: customerId,
  metadata: { order_id: 'order_123' }
}, {
  idempotencyKey: `order_order_123_${timestamp}` // Prevents duplicate charges
});

// 2. Return client secret to frontend
return { clientSecret: paymentIntent.client_secret };

// 3. Handle webhook events (MUST verify signature)
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  webhookSecret
);

switch (event.type) {
  case 'payment_intent.succeeded':
    // Fulfill order
    break;
  case 'payment_intent.payment_failed':
    // Notify customer
    break;
}
```

### Critical Security Patterns

1. **Webhook Signature Verification** (prevents $1M+ fraud)
   ```javascript
   const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
   ```

2. **Idempotency Keys** (prevents duplicate charges)
   ```javascript
   { idempotencyKey: `order_${orderId}_${timestamp}` }
   ```

3. **Amount Validation** (never trust client)
   ```javascript
   // Server-side calculation only
   const amount = calculateOrderTotal(items); // Don't accept from client
   ```

### Rate Limits
- **Standard:** 100 req/sec
- **Burst:** 150 req/sec
- **429 Response:** Exponential backoff with jitter
- **Retry-After:** Header indicates wait time

### Common Errors

| Error Code | Meaning | Action |
|------------|---------|--------|
| `card_declined` | Payment method declined | Don't retry - ask for different payment |
| `invalid_request_error` | Bad API call | Fix code - don't retry |
| `api_error` | Stripe server issue | Retry with backoff |
| `rate_limit_error` | Too many requests | Exponential backoff |

---

## Twilio (SMS/Communications)

**Official Docs:** https://www.twilio.com/docs/sms/api
**Node SDK:** `npm install twilio`
**Python SDK:** `pip install twilio`

### Authentication
```javascript
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

### Core Patterns

| Pattern | Implementation | Critical Gotcha |
|---------|---------------|-----------------|
| **Async by default** | SMS delivery is async - use webhooks | **NO SYNC CONFIRMATION** - must use status callbacks |
| **Webhook Security** | Validate request signatures | **MUST VERIFY** - prevents spoofed delivery reports |
| **Error Handling** | `RestException` with error codes | Different codes for invalid numbers vs carrier blocks |
| **Rate Limits** | Varies by account type | Trial accounts have strict limits |

### Send SMS with Status Tracking

```typescript
const message = await client.messages.create({
  body: 'Your verification code is 123456',
  to: '+15555551234',
  from: process.env.TWILIO_PHONE_NUMBER,
  statusCallback: `${apiBaseUrl}/webhooks/twilio/status`, // Delivery tracking
  maxPrice: '0.10' // Cost protection
});

// Webhook handler (verify signature!)
app.post('/webhooks/twilio/status',
  twilio.webhook(process.env.TWILIO_AUTH_TOKEN), // Signature validation
  (req, res) => {
    const { MessageSid, MessageStatus, ErrorCode } = req.body;

    if (MessageStatus === 'delivered') {
      // SMS delivered successfully
    } else if (MessageStatus === 'failed') {
      // Handle failure (log, alert, retry)
    }

    res.status(200).send('OK');
  }
);
```

### Critical Gotchas

1. **Trial Account Limitations**
   - Can only send to verified numbers
   - Error 21608: "Unverified phone number" - not a bug, account limitation

2. **Carrier Spam Filters**
   - Error 21610: Message blocked by carrier
   - Use opt-in/opt-out language, avoid spam triggers

3. **No Synchronous Delivery Confirmation**
   - `messages.create()` returns immediately
   - Use `statusCallback` webhook for actual delivery status

4. **International Numbers**
   - Must include country code (+1 for US)
   - Different pricing per country

### Rate Limits
- **Default:** 1 message/second (trial)
- **Upgraded:** 10,000 messages/second
- **429 Response:** Exponential backoff

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 21211 | Invalid phone number | Validate format before sending |
| 21608 | Unverified number (trial) | Verify number in console or upgrade |
| 21610 | Carrier blocked (spam) | Review message content |
| 30007 | Delivery failed | Retry with different message |

---

## AWS SDK (Cloud Services)

**Official Docs:** https://docs.aws.amazon.com/sdk-for-javascript/
**Node SDK:** `npm install @aws-sdk/client-s3 @aws-sdk/client-dynamodb`
**Go SDK:** `go get github.com/aws/aws-sdk-go-v2`

### Authentication (Multiple Methods)

```typescript
// 1. Environment variables (development)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

// 2. IAM Role (production - RECOMMENDED)
// EC2/Lambda automatically uses instance role

// 3. AWS SSO (development)
aws sso login --profile my-profile

// 4. Credentials file
// ~/.aws/credentials
```

### Core Patterns

| Pattern | Implementation | Critical Gotcha |
|---------|---------------|-----------------|
| **Credential Chain** | SDK tries env vars → IAM role → credentials file | **Different in dev vs prod** |
| **Region Required** | Must specify region for all clients | **No default** - fails without region |
| **Pagination** | Use paginators for list operations | **Truncated results** without pagination |
| **Retries** | SDK has built-in exponential backoff | Default 3 retries, configurable |

### S3 Example (Upload with Presigned URL)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  maxAttempts: 3, // Retry on transient errors
});

// Server-side upload
async function uploadFile(bucket: string, key: string, body: Buffer) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/pdf',
    ServerSideEncryption: 'AES256', // Encrypt at rest
  });

  await s3Client.send(command);
}

// Generate presigned URL for client-side upload
async function getUploadUrl(bucket: string, key: string) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  // URL valid for 15 minutes
  return getSignedUrl(s3Client, command, { expiresIn: 900 });
}
```

### DynamoDB Example (with Pagination)

```typescript
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

async function queryAllItems(tableName: string, userId: string) {
  let items = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId }
      },
      ExclusiveStartKey: lastEvaluatedKey, // Pagination
      Limit: 100
    });

    const response = await client.send(command);
    items.push(...response.Items);
    lastEvaluatedKey = response.LastEvaluatedKey;

  } while (lastEvaluatedKey); // Continue until no more pages

  return items;
}
```

### Critical Security Patterns

1. **IAM Roles > API Keys** (production)
   ```typescript
   // ✅ GOOD: Uses instance role automatically
   const s3 = new S3Client({ region: 'us-east-1' });

   // ❌ BAD: Hardcoded credentials
   const s3 = new S3Client({
     credentials: {
       accessKeyId: 'AKIA...',
       secretAccessKey: '...'
     }
   });
   ```

2. **Least Privilege IAM Policies**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject"],
       "Resource": "arn:aws:s3:::my-bucket/uploads/*"
     }]
   }
   ```

3. **Enable Encryption**
   - S3: `ServerSideEncryption: 'AES256'`
   - DynamoDB: Enable encryption at rest in console

### Rate Limits (Service-Specific)

| Service | Limit | Throttling Response |
|---------|-------|---------------------|
| S3 | 3,500 PUT/sec, 5,500 GET/sec | 503 SlowDown |
| DynamoDB | Provisioned throughput | 400 ProvisionedThroughputExceededException |
| Lambda | 1,000 concurrent executions | 429 TooManyRequestsException |

### Common Errors

| Error | Meaning | Action |
|-------|---------|--------|
| `NoCredentialsError` | No AWS credentials found | Check env vars / IAM role |
| `AccessDenied` | IAM permissions insufficient | Update IAM policy |
| `ResourceNotFound` | Bucket/table doesn't exist | Check resource name / region |
| `ThrottlingException` | Rate limit exceeded | Exponential backoff |

---

## GitHub API (Source Control)

**Official Docs:** https://docs.github.com/en/rest
**Node SDK:** `npm install @octokit/rest`
**Python SDK:** `pip install PyGithub`

### Authentication (Personal Access Token)

```typescript
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Personal access token
  userAgent: 'my-app v1.0.0'
});
```

**Scopes needed:**
- `repo` - Full repo access (public & private)
- `read:org` - Read org membership
- `admin:repo_hook` - Create webhooks

### Core Patterns

| Pattern | Implementation | Critical Gotcha |
|---------|---------------|-----------------|
| **Rate Limiting** | 5,000 req/hour (authenticated), 60/hour (unauthenticated) | **MUST authenticate** - 60/hour is unusable |
| **Pagination** | `page` and `per_page` parameters | **Default 30 items** - must paginate for complete data |
| **Webhook Security** | Verify `X-Hub-Signature-256` header | **MUST VERIFY** - prevents spoofed events |
| **API Version** | `Accept: application/vnd.github+json` | Use latest API version |

### List Repository Commits (with Pagination)

```typescript
async function getAllCommits(owner: string, repo: string) {
  const commits = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 100, // Max 100 per page
      page
    });

    commits.push(...response.data);
    hasNextPage = response.data.length === 100;
    page++;
  }

  return commits;
}
```

### Create Webhook with Signature Verification

```typescript
// Create webhook
await octokit.repos.createWebhook({
  owner: 'my-org',
  repo: 'my-repo',
  config: {
    url: 'https://my-api.com/webhooks/github',
    content_type: 'json',
    secret: process.env.GITHUB_WEBHOOK_SECRET, // For signature verification
  },
  events: ['push', 'pull_request']
});

// Verify webhook signature (CRITICAL for security)
import crypto from 'crypto';

function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

app.post('/webhooks/github', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);

  if (!verifyGitHubSignature(payload, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook event
  const event = req.body;
  console.log(`Received ${event.action} on ${event.repository.full_name}`);

  res.status(200).send('OK');
});
```

### Critical Gotchas

1. **Rate Limit Headers**
   ```typescript
   // Check remaining requests
   const { headers } = await octokit.repos.get({ owner, repo });
   console.log(`Remaining: ${headers['x-ratelimit-remaining']}`);
   console.log(`Resets at: ${new Date(headers['x-ratelimit-reset'] * 1000)}`);
   ```

2. **Secondary Rate Limits**
   - Creating too many resources quickly triggers abuse detection
   - Response: 403 with `retry-after` header
   - Solution: Add delays between bulk operations

3. **Webhook Payload Size**
   - Max 25 MB per payload
   - Large commits may be truncated
   - Use `commits_url` to fetch full data

4. **Token Expiration**
   - Personal Access Tokens can expire
   - GitHub Apps tokens expire after 1 hour
   - Implement token refresh logic

### Rate Limits

| Type | Limit | Resets |
|------|-------|--------|
| **Authenticated** | 5,000 req/hour | Every hour |
| **Unauthenticated** | 60 req/hour | Every hour |
| **Search API** | 30 req/minute | Every minute |
| **GraphQL API** | 5,000 points/hour | Every hour |

**Rate Limit Response:**
```json
{
  "message": "API rate limit exceeded",
  "documentation_url": "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"
}
```

### Common Errors

| Status | Error | Action |
|--------|-------|--------|
| 401 | Bad credentials | Check token is valid |
| 403 | Rate limit exceeded | Wait for reset or use exponential backoff |
| 404 | Not found | Check repo exists / user has access |
| 422 | Validation failed | Fix request parameters |

---

## Integration Checklist Template

Use this checklist when integrating ANY API (not just the ones above):

### Research Phase
- [ ] Authentication method documented
- [ ] Rate limits identified (requests/min, burst)
- [ ] Idempotency strategy defined (if mutations)
- [ ] Webhook security pattern (if webhooks)
- [ ] Error types categorized (retriable vs non-retriable)
- [ ] Pagination approach understood (cursor/offset)
- [ ] Bulk operation support discovered

### Security Phase
- [ ] Credentials in environment variables (not committed)
- [ ] Webhook signatures verified
- [ ] Request signing implemented (if required)
- [ ] PII handling compliant
- [ ] Error messages don't leak sensitive data

### Implementation Phase
- [ ] Retry logic with exponential backoff
- [ ] Rate limit tracking and backoff
- [ ] Comprehensive error handling per type
- [ ] Logging for observability
- [ ] Test mode / sandbox environment used

### Production Phase
- [ ] Production credentials rotated regularly
- [ ] Monitoring and alerting configured
- [ ] Circuit breaker for cascading failures
- [ ] Cost protection (maxPrice, budget alerts)
- [ ] Documentation updated with gotchas

---

## When to Use This Reference

**Use this guide when:**
- Starting integration with listed services
- Need quick lookup of critical patterns
- Validating spec completeness
- Teaching team about integration best practices

**Don't use this as:**
- Replacement for official documentation
- Only source of truth (APIs change)
- Complete implementation guide (see SKILL.md for methodology)

**Keep updated:**
- Add new services as you integrate them
- Document gotchas as you discover them
- Update rate limits when they change
- Add security patterns as standards evolve
