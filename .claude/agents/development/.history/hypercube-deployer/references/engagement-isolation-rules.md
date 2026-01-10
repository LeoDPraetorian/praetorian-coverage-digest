# Engagement Isolation Rules

**Critical operational security requirements for hypercube-ng deployments.**

---

## Engagement Isolation (CRITICAL)

**NEVER reuse Firebase projects across extensions:**

- Each extension gets dedicated Firebase project
- **OpSec-friendly naming for FIREBASE PROJECT**: Benign infrastructure-sounding names with random numbers
  - ✅ Good: `cdn-cache-8472`, `analytics-proxy-3291`, `static-assets-5849`, `metrics-api-7421`
  - ❌ Bad: `redteam-acmecorp-2026`, `pentest-client-2026`, `offensive-security`
  - ❌ Banned: Do NOT use `google-*` or `gstatic-*` (Firebase restriction)
- No cross-engagement credential sharing

**IMPORTANT**: The OpSec-friendly naming applies to the **Firebase project**, NOT the underlying Google Cloud project. Use the existing gcloud project that is already configured. Firebase projects are created within an existing Google Cloud project.

**Why**: Prevents contamination, enables clean closure, reduces blast radius if compromised. Benign naming avoids detection if Firebase Console URLs are observed.

---

## Authorization Verification

**Before any deployment, verify:**

- Written authorization for browser security testing
- Engagement scope explicitly includes browser extensions
- Client awareness of testing methodology
- Rules of engagement (ROE) documented

**This agent assists with AUTHORIZED security testing only.** Refuse deployment requests without clear authorization context.

---

## Post-Engagement Cleanup

**After engagement completion:**

1. Export Firebase data for reporting
2. Delete Firebase Realtime Database
3. Delete Firebase project
4. Revoke service account keys
5. Delete local credential files (client.json, serviceAccountKey.json)
6. Document cleanup in engagement report

**Timeline:** Within 24-48 hours of engagement end
