# GitHub Marketplace Publishing Requirements

**Source**: GitHub Official Documentation (via Context7)
**Research Date**: 2026-01-03
**Context7 Library IDs**: `/websites/github_en`, `/websites/github_en_rest`

---

## Executive Summary

GitHub Marketplace allows developers to list and distribute GitHub Apps to a broader audience with optional monetization. This document covers the complete publishing workflow, requirements, and best practices based on official GitHub documentation.

---

## Marketplace Publishing Requirements

### Pre-Publishing Checklist

1. **Security review and best practices compliance**
2. **Webhook event handlers for billing** (marketplace_purchase events)
3. **Draft marketplace listing creation**
4. **Pricing plan configuration** (annual + monthly required)
5. **Acceptance of GitHub Marketplace Developer Agreement**
6. **Listing submission for review**

### Monetization Options

- **Free**: No payment required
- **Flat Rate**: Fixed monthly/annual pricing
- **Per-Unit**: Usage-based pricing (seats, API calls, etc.)

### Important Constraints

- Maximum 10 pricing plans per app
- Paid plans require verified publisher status
- All pricing in USD
- Billing handled by GitHub (no custom payment processing)

---

## Technical Requirements

1. **Working webhook endpoint with HTTPS**
2. **Proper error handling for marketplace events**
3. **OAuth flow implementation**
4. **Security best practices** (no credential leaks, proper input validation)

---

## Listing Requirements

1. **Clear app description**
2. **App logo** (minimum 200x200px)
3. **Screenshots** (optional but recommended)
4. **Support contact information**
5. **Terms of service and privacy policy URLs** (for paid apps)

---

## Pricing Requirements

1. **At least one pricing plan** (can be free)
2. **Both monthly and annual pricing** for each paid plan
3. **Maximum 10 plans total**
4. **Pricing must be in USD**

---

## Legal Requirements

1. **Acceptance of GitHub Marketplace Developer Agreement**
2. **Verified publisher status** (for paid apps)
3. **Tax and banking information** (for paid apps)

---

## Publishing Workflow

```
1. Create draft listing (Settings → Developer settings → GitHub Apps → List in Marketplace)
   ↓
2. Configure app details (description, logo, screenshots)
   ↓
3. Set up pricing plans (free or paid with monthly/annual options)
   ↓
4. Add support contact and legal URLs
   ↓
5. Accept Marketplace Developer Agreement
   ↓
6. Submit for review (GitHub reviews within 2-5 business days)
   ↓
7. Address review feedback if any
   ↓
8. Listing goes live on GitHub Marketplace
```

---

## Marketplace Integration Pattern

Apps integrate with marketplace through webhook events:

**Critical Events:**

- `marketplace_purchase` - When user purchases/upgrades/downgrades/cancels
- Installation events trigger independently of marketplace events

**Billing Workflow:**

1. User selects pricing plan and purchases via GitHub UI
2. GitHub sends `marketplace_purchase` webhook to app
3. App provisions/deprovisions features based on plan
4. GitHub handles payment processing and invoicing
5. App queries installation for billing status via API

---

## Webhook Event Examples

### Marketplace Purchase Event

```json
{
  "action": "purchased",
  "effective_date": "2023-01-01T00:00:00Z",
  "marketplace_purchase": {
    "account": {
      "type": "Organization",
      "login": "acme-corp"
    },
    "billing_cycle": "monthly",
    "unit_count": 10,
    "plan": {
      "id": 9,
      "name": "Pro Plan",
      "price_per_unit": 999
    }
  }
}
```

### Marketplace Purchase Actions

| Action                     | Description                 |
| -------------------------- | --------------------------- |
| `purchased`                | New subscription started    |
| `pending_change`           | Plan change scheduled       |
| `pending_change_cancelled` | Plan change cancelled       |
| `changed`                  | Plan upgraded or downgraded |
| `cancelled`                | Subscription cancelled      |

---

## Pricing Configuration

### Free Plan Example

```yaml
Free Plan:
  price: $0
  features:
    - Up to 5 repositories
    - Basic scanning
    - Community support
```

### Paid Plans Example

```yaml
Pro Plan:
  price: $10/month per user
  features:
    - Unlimited repositories
    - Advanced scanning
    - Priority support
    - Custom integrations

Enterprise Plan:
  price: Custom
  features:
    - Everything in Pro
    - SSO/SAML
    - Dedicated support
    - On-premise deployment
```

---

## Trade-off: Marketplace Pricing Flexibility vs Simplicity

**Conflict**: GitHub Marketplace supports multiple pricing models but requires all plans to have both monthly and annual pricing.

**Trade-off:**

- **Pricing flexibility**: Free, flat-rate, per-unit models supported
- **Constraint**: Must define both monthly AND annual pricing for each plan (10 plan max)

**Recommendation**: Design pricing to leverage annual discounts (e.g., 20% off annual vs monthly) to encourage annual commitments.

---

## Best Practices

### Marketplace Integration

1. **Test with free plan first** before publishing paid plans
2. **Implement proper billing event handlers** before going live
3. **Use draft plans** to test pricing changes
4. **Monitor marketplace purchase events** for fraud detection

### Billing Event Handling

```typescript
app.webhooks.on("marketplace_purchase", async ({ payload }) => {
  const { action, marketplace_purchase } = payload;
  const { account, plan, billing_cycle, unit_count } = marketplace_purchase;

  switch (action) {
    case "purchased":
      await enablePlanFeatures(account.login, plan.name, unit_count);
      break;
    case "changed":
      await updatePlanFeatures(account.login, plan.name, unit_count);
      break;
    case "cancelled":
      await disablePremiumFeatures(account.login);
      break;
  }
});
```

### Feature Provisioning

```typescript
async function enablePlanFeatures(
  accountLogin: string,
  planName: string,
  unitCount: number
): Promise<void> {
  const features = getFeaturesByPlan(planName);

  await db.subscriptions.create({
    accountLogin,
    plan: planName,
    unitCount,
    features,
    status: "active",
    startDate: new Date(),
  });

  // Send welcome email with feature access details
  await sendWelcomeEmail(accountLogin, features);
}

async function disablePremiumFeatures(accountLogin: string): Promise<void> {
  await db.subscriptions.update({
    where: { accountLogin },
    data: {
      status: "cancelled",
      endDate: new Date(),
      features: getFeaturesByPlan("free"), // Downgrade to free features
    },
  });

  // Send cancellation confirmation
  await sendCancellationEmail(accountLogin);
}
```

---

## API Endpoints for Marketplace

### Marketplace Listing Management

| Endpoint                                            | Method | Purpose                    |
| --------------------------------------------------- | ------ | -------------------------- |
| `GET /marketplace_listing/plans`                    | GET    | List pricing plans         |
| `GET /marketplace_listing/plans/{plan_id}/accounts` | GET    | List accounts on plan      |
| `GET /marketplace_listing/stubbed/plans`            | GET    | List draft plans (testing) |
| `GET /user/marketplace_purchases`                   | GET    | List user's purchases      |

### Checking Subscription Status

```typescript
async function checkSubscription(accountLogin: string): Promise<Subscription | null> {
  const response = await octokit.request("GET /marketplace_listing/accounts/{account_id}", {
    account_id: accountLogin,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return null; // Not subscribed
  }

  return response.data.marketplace_purchase;
}
```

---

## Verified Publisher Requirements

For paid plans, publishers must be verified:

1. **Email verification**
2. **Domain verification** (DNS TXT record)
3. **Two-factor authentication** enabled
4. **Payment information** (Stripe Connect)
5. **Tax information** (W-9 for US, W-8BEN for international)

---

## Review Process

### What GitHub Reviews

1. **Security**: No hardcoded secrets, proper input validation
2. **Functionality**: App works as described
3. **User Experience**: Clear installation and usage flow
4. **Legal Compliance**: Accurate description, proper ToS/Privacy Policy
5. **Pricing**: Clear, accurate pricing information

### Common Review Rejection Reasons

1. **Security vulnerabilities** in code
2. **Misleading description** or screenshots
3. **Broken installation flow**
4. **Missing required information** (support contact, legal URLs)
5. **Inappropriate pricing** (hidden fees, unclear terms)

### Review Timeline

- **Initial review**: 2-5 business days
- **Re-review after fixes**: 1-2 business days
- **Expedited review**: Not available (no premium queue)

---

## Sources

All documentation sourced from official GitHub documentation via Context7:

- [GitHub Marketplace](https://docs.github.com/en/apps/github-marketplace)
- [About GitHub Marketplace for apps](https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps)
- [Requirements for listing an app](https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app)
- [Creating a draft GitHub Marketplace listing](https://docs.github.com/en/apps/github-marketplace/listing-an-app-on-github-marketplace/creating-a-draft-github-marketplace-listing)
- [Setting pricing plans for your listing](https://docs.github.com/en/apps/github-marketplace/listing-an-app-on-github-marketplace/setting-pricing-plans-for-your-listing)
- [Submitting your listing for publication](https://docs.github.com/en/apps/github-marketplace/listing-an-app-on-github-marketplace/submitting-your-listing-for-publication)
- [Using the GitHub Marketplace API in your app](https://docs.github.com/en/apps/github-marketplace/using-the-github-marketplace-api-in-your-app)
