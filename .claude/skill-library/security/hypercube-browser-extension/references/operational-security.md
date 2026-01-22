# Operational Security Best Practices

**Engagement best practices, cleanup procedures, and opsec considerations for browser extension operations.**

---

## Pre-Engagement Planning

### Authorization Documentation

**MANDATORY before proceeding:**

- Written statement of work (SOW) or engagement letter
- Browser extension testing explicitly mentioned in scope
- Client awareness of methodology
- Rules of engagement (ROE) defined
- Disclosure timeline agreed upon

### Engagement Isolation

**Principle**: Each engagement should be completely isolated

**Implementation:**

- Unique Firebase project per engagement
- Separate Chrome Store developer account (if budget allows)
- Engagement-specific naming conventions
- No reuse of previous extension code without review

### Payment Anonymization

**Use virtual cards** (privacy.com):

- First-name-only cardholder names
- Disposable card numbers per engagement
- No link to personal accounts
- Separate from other operational infrastructure

---

## During Engagement

### Firebase Project Security

**Naming**: Use non-obvious names

- ❌ Bad: `acme-pentest-2026`
- ✅ Good: `productivity-tools-demo`

**Access control**:

- Service account keys stored securely (encrypted)
- No keys in git repositories
- Keys only on operator systems
- Delete keys after engagement

### Extension Distribution

**Chrome Store** (recommended):

- Highest success rate for social engineering
- Most trusted by users
- Professional appearance

**Direct distribution**:

- CRX file via email/USB
- Requires user to enable Developer Mode
- Lower success rate
- Use only if Chrome Store not viable

### Monitoring Connected Clients

**Firebase Console**:

- Check `clients/` path for connected extensions
- Note: Extensions identified by UID (anonymous)
- No PII visible in Firebase

**Operational awareness**:

- Know how many extensions deployed
- Track which are active/connected
- Monitor for unexpected connections (could indicate detection)

### Operator Proxy Security

**Network isolation**:

- Run proxy on dedicated system/VM
- Separate from personal systems
- VPN/anonymization if needed
- Firewall rules limiting access

**Credential management**:

- Firebase service account key secured
- No keys in process memory dumps
- Rotate keys if compromise suspected

---

## Post-Engagement Cleanup

### Immediate Actions (Within 24-48 hours of engagement end)

1. **Export Firebase data** (if needed for reporting)

   ```bash
   # Firebase Console → Realtime Database → Export JSON
   # Save for engagement documentation
   ```

2. **Notify users** (per ROE/disclosure timeline)
   - Inform client of extension deployment
   - Provide removal instructions
   - Explain what was accessed

3. **Delete Firebase Database**

   ```
   Firebase Console → Realtime Database → Delete database
   ```

4. **Disable Firebase Authentication**
   ```
   Firebase Console → Authentication → Sign-in method → Disable anonymous
   ```

### Complete Cleanup (Within 1 week)

5. **Delete Firebase Project**

   ```
   Firebase Console → Project Settings → General → Delete project
   ```

6. **Revoke Service Account Keys**

   ```
   Google Cloud Console → IAM & Admin → Service Accounts → Delete keys
   ```

7. **Remove Local Credentials**

   ```bash
   rm modules/hypercube-ng/client.json
   rm modules/hypercube-ng/serviceAccountKey.json
   rm modules/hypercube-ng/output/<timestamp>/*.json
   ```

8. **Chrome Store Cleanup**
   - Unpublish extension
   - Or: Let it remain (if agreed with client for demonstration)
   - Document decision in engagement report

9. **Delete Build Artifacts**
   ```bash
   rm -rf modules/hypercube-ng/output/<timestamp>/
   rm modules/hypercube-ng/extension/*.wasm
   ```

### Documentation for Engagement Report

**Include:**

- Number of extensions deployed
- Connection duration/activity logs
- Capabilities accessed
- Data accessed (if any)
- User notification timeline
- Cleanup completion confirmation

---

## Detection Avoidance (During Authorized Engagement)

### Extension Behavior

**Low and slow**:

- Don't make excessive Firebase requests
- Rate-limit C2 commands
- Avoid patterns that trigger anomaly detection

**Legitimate appearance**:

- Extension UI should work (even if basic)
- Don't display suspicious console logs
- Avoid obvious naming ("pentesting-tool")

### Firebase Usage

**Blend in**:

- Firebase is common for legitimate extensions
- Anonymous auth is normal
- Realtime Database common for extensions
- Traffic encrypted (standard TLS)

**Avoid red flags**:

- Don't store obvious attack commands in Firebase
- Encrypt sensitive data at application layer
- Use generic path names (`clients`, not `victims`)

### Chrome Web Store

**Maintain legitimacy**:

- Keep privacy policy live throughout engagement
- Don't suddenly change extension name/functionality
- Respond to user reviews (if any) professionally
- Don't violate store policies during engagement

---

## Incident Response

### If Extension Detected

**Immediate actions:**

1. Notify client immediately
2. Stop C2 operations
3. Document detection method (if known)
4. Preserve Firebase logs before cleanup
5. Accelerate cleanup timeline (with client approval)

**Investigation:**

- How was extension detected?
- EDR/security tool flagging?
- User reported?
- IT department investigation?

**Lessons learned:**

- Update pretext/approach for future engagements
- Document detection signatures
- Improve operational security

### If Firebase Compromised

**Indicators:**

- Unexpected connections to Firebase
- Service account key unauthorized use
- Firebase console access from unknown IPs

**Response:**

1. Immediately revoke service account keys
2. Delete Firebase Realtime Database
3. Notify client of potential compromise
4. Investigate scope (were credentials exfiltrated?)
5. Complete engagement closure
6. Update security practices

---

## Compliance and Ethics

### Staying Within Scope

**Always**:

- Follow engagement ROE strictly
- Document all actions
- Only access in-scope systems
- Respect client boundaries

**Never**:

- Exceed authorized scope
- Access personal data without authorization
- Deploy extensions outside target organization
- Retain data beyond engagement timeline

### Disclosure Obligations

**Timing**: Per engagement agreement (typically immediate to 30 days)

**Content**:

- What extensions were deployed
- What capabilities they had
- What data was accessed
- How to verify removal

**Method**: Documented in engagement agreement (usually written report)

---

## Operational Security Checklist

### Pre-Engagement

- [ ] Written authorization obtained
- [ ] Engagement-specific Firebase project created
- [ ] Virtual payment method configured
- [ ] Pretext designed and approved
- [ ] Disclosure timeline agreed with client

### During Engagement

- [ ] Extensions distributed per approved methodology
- [ ] Activity monitored via Firebase console
- [ ] Operator proxy secured
- [ ] No scope creep beyond authorization
- [ ] Client contacts aware of testing in progress

### Post-Engagement

- [ ] Firebase data exported (if needed)
- [ ] Users notified per disclosure timeline
- [ ] Firebase database deleted
- [ ] Firebase project deleted
- [ ] Service account keys revoked
- [ ] Local credentials deleted
- [ ] Chrome Store extension handled per agreement
- [ ] Engagement report documenting cleanup

---

## References

- **Firebase security**: https://firebase.google.com/docs/rules
- **Chrome Store policies**: https://developer.chrome.com/docs/webstore/program-policies/
- **Engagement planning**: Internal security consulting best practices
