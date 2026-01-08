# Frontend Security Review: URL Refactoring Implementation

**Review Date:** 2025-12-31
**Reviewer:** frontend-security-reviewer
**Target:** URL Refactoring Plan (5 Phases)
**Scope:** React 19 + TypeScript frontend security analysis

---

## Executive Summary

This security review analyzed the URL refactoring implementation plan for the Chariot security platform. The plan proposes migrating from React Router v7 to TanStack Router, removing PII from URLs, and simplifying drawer state management across 5 phases affecting ~150 files.

**Overall Risk Assessment:** MEDIUM-HIGH

The plan addresses several legitimate privacy concerns (PII in URLs, browser history exposure) but introduces new security risks that require mitigation before implementation. While some critical issues were identified and fixed during architectural review (OAuth race condition, hash collision probability), several significant vulnerabilities remain unaddressed.

**Key Findings:**
- 2 CRITICAL vulnerabilities requiring immediate design changes
- 4 HIGH severity issues requiring mitigation before implementation
- 6 MEDIUM severity issues requiring documentation and monitoring
- 8 LOW severity issues for consideration in testing strategy

**Recommendation:** **APPROVED WITH MANDATORY CHANGES**

The refactoring can proceed after addressing the CRITICAL and HIGH severity findings documented below. MEDIUM severity findings should be documented as known limitations with monitoring plans.

---

## Security Findings

### CRITICAL Issues

#### CRIT-1: Impersonation Authorization Bypass Risk

**Phase:** 1 (Impersonation State Migration)
**CVSS 3.1 Score:** 9.1 (CRITICAL)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:N

**Vulnerability:**
The implementation stores impersonation state in client-side sessionStorage without clear backend validation that the authenticated user is authorized to impersonate the target customer. The plan states "backend requires no changes - it already validates via JWT" but provides no evidence of authorization checking.

**Evidence:**
- `phase-1-impersonation.md:68-71` states sessionStorage is "NOT a security solution for XSS attacks"
- `phase-1-impersonation.md:496-498` shows reading userId from base64 URL path without authorization check
- No mention of backend RBAC validation in impersonation start/stop functions

**Attack Scenario:**
1. Customer user authenticates and receives valid JWT token
2. Customer modifies sessionStorage: `sessionStorage.setItem('chariot_impersonation_target', 'competitor@example.com')`
3. Customer makes API requests with their valid JWT + manipulated impersonation context
4. If backend only validates JWT presence (not impersonation authorization), customer accesses competitor data

**Impact:**
- Unauthorized access to customer data (confidentiality breach)
- Potential data modification in competitor account (integrity breach)
- Compliance violations (GDPR, SOC 2)
- Scope change (affects multiple tenants, hence `S:C`)

**Remediation:**

1. **Backend validation REQUIRED** (before Phase 1 implementation):
   ```go
   // backend/pkg/handler/api.go
   func validateImpersonation(jwtUser string, targetUser string) error {
       // Check if jwtUser has Praetorian domain
       if !strings.HasSuffix(jwtUser, "@praetorian.com") {
           return errors.New("unauthorized: only Praetorian users can impersonate")
       }

       // Check if target is a customer (not another Praetorian user)
       if strings.HasSuffix(targetUser, "@praetorian.com") {
           return errors.New("unauthorized: cannot impersonate Praetorian users")
       }

       // Log impersonation attempt for audit
       audit.Log(jwtUser, "impersonation_start", targetUser)

       return nil
   }
   ```

2. **Frontend validation** (defense in depth):
   ```typescript
   // src/state/impersonation.tsx
   const startImpersonation = useCallback(async (targetEmail: string) => {
       try {
           // Call backend endpoint to validate and create impersonation session
           const response = await api.post('/api/v1/impersonation/start', {
               targetEmail
           });

           if (response.status === 200) {
               // Backend validated - now set local state
               if (safeSessionStorage.setItem(STORAGE_KEY, targetEmail)) {
                   setTargetUser(targetEmail);
               }
           }
       } catch (error) {
           if (error.response?.status === 403) {
               toast.error('Unauthorized: You cannot impersonate this user');
           }
           throw error;
       }
   }, []);
   ```

3. **Add to Phase 1 exit criteria:**
   - [ ] Backend impersonation validation endpoint implemented
   - [ ] E2E test: Customer user cannot impersonate another customer
   - [ ] E2E test: Customer user cannot impersonate Praetorian user
   - [ ] Audit logging verified for all impersonation events

**Test Cases:**
```typescript
// src/state/__tests__/impersonation.test.tsx

it('rejects impersonation without backend authorization', async () => {
  // Mock backend 403 response
  server.use(
    http.post('/api/v1/impersonation/start', () => {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 403 });
    })
  );

  const wrapper = ({ children }) => (
    <ImpersonationProvider>{children}</ImpersonationProvider>
  );

  const { result } = renderHook(() => useImpersonation(), { wrapper });

  await expect(
    result.current.startImpersonation('customer@example.com')
  ).rejects.toThrow();

  // Verify sessionStorage was NOT set
  expect(sessionStorage.getItem('chariot_impersonation_target')).toBeNull();
});
```

---

#### CRIT-2: Open Redirect via Router Context Injection

**Phase:** 3 (TanStack Router Migration)
**CVSS 3.1 Score:** 8.1 (HIGH, bordering CRITICAL)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N

**Vulnerability:**
The TanStack Router implementation includes authentication redirect logic without URL validation, creating an open redirect vulnerability that could be exploited for phishing or credential theft.

**Evidence:**
- `phase-3-tanstack-router.md:280-288` shows redirect logic: `redirect: window.location.pathname`
- No validation that redirect URL is same-origin
- `appendices/reference-materials.md:134` mentions "Redirect URL validation" as required but shows no implementation

**Attack Scenario:**
1. Attacker crafts malicious link: `https://chariot.example.com/login?redirect=https://evil.com/fake-login`
2. User clicks link, sees legitimate Chariot login page
3. After successful authentication, TanStack Router redirects to `https://evil.com/fake-login`
4. Fake login page looks identical to Chariot, harvests credentials on "re-login"

**Impact:**
- Credential harvesting (users enter passwords on fake site)
- Session token theft (redirect could include token in URL)
- Phishing attacks with legitimate domain in initial URL
- Brand damage and user trust erosion

**Remediation:**

1. **Add redirect URL validation** (Phase 3, Task 1.4):
   ```typescript
   // src/utils/redirectValidation.ts
   const ALLOWED_REDIRECT_PATHS = [
       '/assets',
       '/vulnerabilities',
       '/seeds',
       '/insights',
       '/settings',
       '/agents',
       '/jobs',
       // ... all authenticated routes
   ];

   export function validateRedirectUrl(redirectUrl: string | null): string {
       if (!redirectUrl) {
           return '/insights'; // Default safe redirect
       }

       try {
           const url = new URL(redirectUrl, window.location.origin);

           // CRITICAL: Must be same origin
           if (url.origin !== window.location.origin) {
               console.warn('Rejected redirect to different origin:', url.origin);
               return '/insights';
           }

           // Must match allowed path patterns
           const isAllowedPath = ALLOWED_REDIRECT_PATHS.some(pattern =>
               url.pathname.startsWith(pattern)
           );

           if (!isAllowedPath) {
               console.warn('Rejected redirect to unauthorized path:', url.pathname);
               return '/insights';
           }

           return url.pathname + url.search;
       } catch (error) {
           // Invalid URL format
           console.warn('Invalid redirect URL:', redirectUrl);
           return '/insights';
       }
   }
   ```

2. **Update authentication layout** (`src/routes/_authenticated.tsx:280-288`):
   ```typescript
   export const Route = createFileRoute('/_authenticated')({
     beforeLoad: async ({ context, location }) => {
       if (!context.auth.isSignedIn) {
         // FIXED: Validate redirect URL before using it
         const safeRedirect = validateRedirectUrl(location.pathname);

         throw redirect({
           to: '/login',
           search: {
             redirect: safeRedirect,
           },
         });
       }
     },
     component: AuthenticatedLayout,
   });
   ```

3. **Login component validation** (new requirement):
   ```typescript
   // src/sections/auth/Login.tsx
   const Login = () => {
     const navigate = useNavigate();
     const search = useSearch({ strict: false });
     const redirectUrl = validateRedirectUrl(search.redirect);

     const handleLogin = async (credentials) => {
       await auth.login(credentials);
       navigate({ to: redirectUrl }); // Now safe
     };

     return <LoginForm onSubmit={handleLogin} />;
   };
   ```

**Test Cases:**
```typescript
// src/utils/__tests__/redirectValidation.test.ts

describe('validateRedirectUrl', () => {
  it('rejects different origin', () => {
    const maliciousUrl = 'https://evil.com/fake-login';
    expect(validateRedirectUrl(maliciousUrl)).toBe('/insights');
  });

  it('rejects protocol-relative URLs', () => {
    const maliciousUrl = '//evil.com/fake-login';
    expect(validateRedirectUrl(maliciousUrl)).toBe('/insights');
  });

  it('rejects javascript: protocol', () => {
    const maliciousUrl = 'javascript:alert(document.cookie)';
    expect(validateRedirectUrl(maliciousUrl)).toBe('/insights');
  });

  it('allows valid same-origin path', () => {
    const validUrl = '/assets?status=active';
    expect(validateRedirectUrl(validUrl)).toBe('/assets?status=active');
  });

  it('rejects unauthorized paths', () => {
    const unauthorizedUrl = '/admin/delete-all-data';
    expect(validateRedirectUrl(unauthorizedUrl)).toBe('/insights');
  });
});
```

**E2E Test:**
```typescript
// modules/chariot/ui/e2e/src/tests/auth/open-redirect.spec.ts

test('prevents open redirect attack', async ({ page }) => {
  // Attempt malicious redirect
  await page.goto('https://localhost:3000/login?redirect=https://evil.com/phishing');

  // Login with valid credentials
  await page.fill('[name="email"]', TEST_USER_EMAIL);
  await page.fill('[name="password"]', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');

  // Should redirect to safe default, not evil.com
  await page.waitForURL('**/insights');
  expect(page.url()).toContain('localhost:3000/insights');
  expect(page.url()).not.toContain('evil.com');
});
```

---

### HIGH Severity Issues

#### HIGH-1: XSS via Zod-Validated Search Parameters

**Phase:** 3 (TanStack Router Migration)
**CVSS 3.1 Score:** 7.3 (HIGH)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:H/A:L

**Vulnerability:**
Zod validation ensures type safety but does not sanitize values before rendering. Validated strings could contain HTML/JavaScript that gets rendered without escaping.

**Evidence:**
- `phase-3-tanstack-router.md:322-329` shows Zod search validation: `z.object({ status: z.enum([...]), page: z.number(), detail: z.string().optional() })`
- No HTML sanitization shown after validation
- Plan focuses on type validation, not content sanitization

**Attack Scenario:**
1. Attacker crafts malicious URL: `/assets?detail=<img src=x onerror=alert(document.cookie)>`
2. Zod validates this as a valid `z.string()`
3. Application renders detail parameter without escaping: `<div>{detail}</div>`
4. XSS executes in user's browser

**Example Vulnerable Pattern:**
```typescript
// VULNERABLE: Zod validates but doesn't sanitize
const searchSchema = z.object({
  detail: z.string().optional(),
  search: z.string().optional(),
});

function SearchResults() {
  const { detail, search } = Route.useSearch();

  // VULNERABLE: Direct rendering of user input
  return (
    <div>
      <h1>Search Results for: {search}</h1>
      <p>Details: {detail}</p>
    </div>
  );
}
```

**Impact:**
- Session token theft via `document.cookie`
- Keylogging via XSS payload
- Credential harvesting on fake login forms injected via XSS
- Privilege escalation if admin user is targeted

**Remediation:**

1. **Add sanitization layer after Zod validation:**
   ```typescript
   // src/utils/searchParamSanitization.ts
   import DOMPurify from 'dompurify';

   export function sanitizeSearchParam(value: string | undefined): string | undefined {
       if (!value) return value;

       // Remove HTML tags and JavaScript
       return DOMPurify.sanitize(value, {
           ALLOWED_TAGS: [], // No HTML allowed in search params
           ALLOWED_ATTR: [],
       });
   }

   // For search params that need to preserve some formatting
   export function sanitizeSearchParamWithFormatting(value: string | undefined): string | undefined {
       if (!value) return value;

       return DOMPurify.sanitize(value, {
           ALLOWED_TAGS: ['b', 'i', 'em', 'strong'], // Minimal safe formatting
           ALLOWED_ATTR: [],
       });
   }
   ```

2. **Update route search validation:**
   ```typescript
   // src/routes/_authenticated/assets.tsx
   import { zodValidator } from '@tanstack/router-zod-adapter';
   import { z } from 'zod';
   import { sanitizeSearchParam } from '@/utils/searchParamSanitization';

   const searchSchema = z.object({
     status: z.enum(['active', 'inactive', 'all']).optional(),
     page: z.number().int().positive().default(1).catch(1),
     detail: z.string().optional().transform(sanitizeSearchParam),
     search: z.string().optional().transform(sanitizeSearchParam),
   });

   export const Route = createFileRoute('/_authenticated/assets')({
     validateSearch: zodValidator(searchSchema),
     component: AssetsPage,
   });
   ```

3. **React rendering best practice (defense in depth):**
   ```typescript
   // Always render user input as text nodes, never as HTML
   function SearchResults() {
     const { detail, search } = Route.useSearch(); // Already sanitized via transform

     return (
       <div>
         {/* React automatically escapes text nodes */}
         <h1>Search Results for: {search}</h1>
         <p>Details: {detail}</p>

         {/* NEVER use dangerouslySetInnerHTML with user input */}
         {/* <div dangerouslySetInnerHTML={{ __html: search }} /> // FORBIDDEN */}
       </div>
     );
   }
   ```

4. **Add to Phase 3 exit criteria:**
   - [ ] All search parameter strings sanitized with DOMPurify
   - [ ] Zod schemas include `.transform()` for sanitization
   - [ ] ESLint rule: no `dangerouslySetInnerHTML` with search params
   - [ ] Security test: XSS payload in URL does not execute

**Test Cases:**
```typescript
// src/utils/__tests__/searchParamSanitization.test.ts

describe('sanitizeSearchParam', () => {
  it('removes script tags', () => {
    const malicious = '<script>alert("XSS")</script>';
    expect(sanitizeSearchParam(malicious)).toBe('');
  });

  it('removes event handlers', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    expect(sanitizeSearchParam(malicious)).toBe('');
  });

  it('removes javascript: protocol', () => {
    const malicious = '<a href="javascript:alert(1)">Click</a>';
    expect(sanitizeSearchParam(malicious)).toBe('Click');
  });

  it('preserves safe text', () => {
    const safe = 'Normal search query with symbols: & < > "';
    expect(sanitizeSearchParam(safe)).toContain('Normal search query');
  });
});
```

**E2E Test:**
```typescript
// modules/chariot/ui/e2e/src/tests/security/xss-search-params.spec.ts

test('prevents XSS via search parameters', async ({ page }) => {
  await page.goto('https://localhost:3000/assets?search=<img src=x onerror=alert("XSS")>');

  // Wait for page to render
  await page.waitForLoadState('networkidle');

  // Verify no alert dialog appeared (XSS did not execute)
  await page.waitForTimeout(1000);
  expect(page.url()).toContain('/assets');

  // Verify content is rendered as text, not HTML
  const searchDisplay = await page.textContent('h1');
  expect(searchDisplay).not.toContain('<img');
  expect(searchDisplay).not.toContain('onerror');
});
```

---

#### HIGH-2: Hash Brute-Force Enumeration Attack

**Phase:** 2 (PII-Free URLs)
**CVSS 3.1 Score:** 7.5 (HIGH)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N

**Vulnerability:**
The entity key registry exposes a hash resolution endpoint (via `entityKeyRegistry.retrieve()`) without rate limiting, allowing brute-force enumeration of entity keys.

**Evidence:**
- `phase-2-pii-free-urls.md:290-380` shows `EntityKeyRegistry` class with public `retrieve()` method
- `phase-2-pii-free-urls.md:169-180` uses 12-character hex hash (48 bits = 281 trillion combinations)
- No rate limiting mentioned in implementation
- Browser-side storage makes all hashes available to JavaScript

**Attack Scenario:**
1. Attacker generates random 12-character hex hashes
2. For each hash, calls `entityKeyRegistry.retrieve(hash)`
3. Successful retrieval reveals entity key (e.g., `#asset#email@example.com`)
4. At 1000 requests/second, attacker can try 86.4M hashes per day
5. Against 100k entities, expected time to first collision: ~3.5 years (feasible for targeted attack)

**Attack Optimization:**
- Rainbow tables for common patterns
- Targeted attacks against known customer domains
- Parallel attacks from multiple IPs (if no distributed rate limiting)

**Impact:**
- Disclosure of entity keys containing PII
- Enumeration of all assets/risks/seeds for a customer
- Privacy violation (GDPR breach potential)
- Competitive intelligence gathering

**Remediation:**

1. **Add rate limiting to hash resolution** (Phase 2, Task 2.2):
   ```typescript
   // src/utils/entityKeyRegistry.ts
   import { z } from 'zod';

   const RATE_LIMIT = {
       MAX_ATTEMPTS: 10,
       WINDOW_MS: 60000, // 1 minute
       LOCKOUT_MS: 300000, // 5 minutes after limit exceeded
   };

   class RateLimiter {
       private attempts: Map<string, { count: number; firstAttempt: number }> = new Map();

       check(identifier: string): boolean {
           const now = Date.now();
           const record = this.attempts.get(identifier);

           if (!record) {
               this.attempts.set(identifier, { count: 1, firstAttempt: now });
               return true;
           }

           // Reset if window expired
           if (now - record.firstAttempt > RATE_LIMIT.WINDOW_MS) {
               this.attempts.set(identifier, { count: 1, firstAttempt: now });
               return true;
           }

           // Check if locked out
           if (record.count >= RATE_LIMIT.MAX_ATTEMPTS) {
               if (now - record.firstAttempt < RATE_LIMIT.LOCKOUT_MS) {
                   console.warn('Rate limit exceeded for hash resolution');
                   return false;
               }
               // Lockout expired, reset
               this.attempts.set(identifier, { count: 1, firstAttempt: now });
               return true;
           }

           // Increment counter
           record.count++;
           return true;
       }
   }

   export class EntityKeyRegistry {
       private rateLimiter = new RateLimiter();

       async retrieve(hash: string): Promise<string | null> {
           // Rate limit by IP (in real implementation, get from request headers)
           const identifier = this.getClientIdentifier();

           if (!this.rateLimiter.check(identifier)) {
               toast.error('Too many hash resolution attempts. Please wait 5 minutes.');
               return null;
           }

           // Existing validation and retrieval logic...
           // ...
       }

       private getClientIdentifier(): string {
           // In production, use IP address from backend
           // For now, use browser fingerprint
           return navigator.userAgent + window.screen.width;
       }
   }
   ```

2. **Backend hash resolution endpoint with distributed rate limiting:**
   ```go
   // backend/pkg/handler/hash-resolver/main.go
   func handle(ctx context.Context, event events.APIGatewayProxyRequest)
       (events.APIGatewayProxyResponse, error) {

       aws, user := authenticate(event)
       hash := event.PathParameters["hash"]

       // Check rate limit (using Redis)
       rateLimitKey := fmt.Sprintf("hash_resolve:%s", user)
       count, err := redis.Incr(ctx, rateLimitKey)
       if err != nil {
           return aws.Api.Error(500, "Rate limit check failed"), nil
       }

       if count == 1 {
           // Set 1-minute expiry on first request
           redis.Expire(ctx, rateLimitKey, 60*time.Second)
       }

       if count > 10 {
           return aws.Api.Error(429, "Rate limit exceeded"), nil
       }

       // Retrieve entity key from backend storage
       entityKey, err := hashRegistry.Get(ctx, hash, user)
       if err != nil {
           return aws.Api.Error(404, "Hash not found"), nil
       }

       return aws.Api.Success(map[string]string{"entityKey": entityKey}), nil
   }
   ```

3. **Move hash storage to backend with user scoping:**
   ```typescript
   // Instead of client-side storage, call backend API
   export class EntityKeyRegistry {
       async store(entityKey: string): Promise<string> {
           const hash = await hashEntityKey(entityKey);

           // Store hash mapping on backend (user-scoped)
           await api.post('/api/v1/hash-registry', {
               hash,
               entityKey,
           });

           return hash;
       }

       async retrieve(hash: string): Promise<string | null> {
           try {
               const response = await api.get(`/api/v1/hash-registry/${hash}`);
               return response.data.entityKey;
           } catch (error) {
               if (error.response?.status === 429) {
                   toast.error('Rate limit exceeded. Please wait before trying again.');
               }
               return null;
           }
       }
   }
   ```

4. **Add monitoring and alerting:**
   ```typescript
   // Log suspicious patterns for security monitoring
   if (failedAttempts > 100 in 1 hour) {
       await api.post('/api/v1/security/alert', {
           type: 'hash_enumeration_attempt',
           userId: user,
           attempts: failedAttempts,
       });
   }
   ```

**Test Cases:**
```typescript
// src/utils/__tests__/entityKeyRegistry.test.ts

describe('EntityKeyRegistry rate limiting', () => {
  it('allows 10 requests within 1 minute', async () => {
    const registry = new EntityKeyRegistry();
    const hash = await registry.store('#asset#test@example.com');

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      const result = await registry.retrieve(hash);
      expect(result).toBe('#asset#test@example.com');
    }
  });

  it('blocks 11th request within 1 minute', async () => {
    const registry = new EntityKeyRegistry();
    const hash = await registry.store('#asset#test@example.com');

    // Make 10 successful requests
    for (let i = 0; i < 10; i++) {
      await registry.retrieve(hash);
    }

    // 11th request should be blocked
    const result = await registry.retrieve(hash);
    expect(result).toBeNull();
  });

  it('resets rate limit after 1 minute', async () => {
    jest.useFakeTimers();
    const registry = new EntityKeyRegistry();
    const hash = await registry.store('#asset#test@example.com');

    // Exhaust rate limit
    for (let i = 0; i < 10; i++) {
      await registry.retrieve(hash);
    }

    // Fast-forward 61 seconds
    jest.advanceTimersByTime(61000);

    // Should work again
    const result = await registry.retrieve(hash);
    expect(result).toBe('#asset#test@example.com');

    jest.useRealTimers();
  });
});
```

---

#### HIGH-3: Impersonation Session Persistence Without Timeout

**Phase:** 1 (Impersonation State Migration)
**CVSS 3.1 Score:** 7.1 (HIGH)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N

**Vulnerability:**
Impersonation state persists indefinitely in sessionStorage with no timeout mechanism, even after the underlying JWT token expires. A forgotten impersonation session could lead to unauthorized actions.

**Evidence:**
- `phase-1-impersonation.md:154-278` shows no expiration logic in `ImpersonationProvider`
- `appendices/reference-materials.md:146` mentions "Impersonation timeout enforcement: DEFERRED - Requires backend JWT validation"
- sessionStorage persists until tab is closed (could be weeks if tab kept open)

**Attack Scenario:**
1. Praetorian user impersonates customer at 9am
2. User leaves for lunch, doesn't stop impersonation
3. JWT token expires at 10am (1-hour typical lifetime)
4. sessionStorage still shows impersonation active
5. At 2pm, user returns and makes changes, thinking they're in their own account
6. Changes apply to customer account due to stale impersonation state

**Impact:**
- Unintended actions on wrong customer account
- Data modification without current authorization
- Audit log confusion (actions timestamped after JWT expiry)
- Compliance issues (actions taken without valid authentication)

**Remediation:**

1. **Add expiration timestamp to impersonation state:**
   ```typescript
   // src/state/impersonation.tsx
   interface ImpersonationSession {
       targetUser: string;
       startedAt: number; // Unix timestamp
       expiresAt: number; // Unix timestamp
   }

   const IMPERSONATION_TIMEOUT_MS = 3600000; // 1 hour

   export function ImpersonationProvider({ children }: { children: ReactNode }) {
       const [targetUser, setTargetUser] = useState<string | null>(null);
       const [sessionExpired, setSessionExpired] = useState(false);

       useEffect(() => {
           const stored = safeSessionStorage.getItem(STORAGE_KEY);
           if (!stored) return;

           try {
               const session: ImpersonationSession = JSON.parse(stored);

               // Check if session expired
               if (Date.now() > session.expiresAt) {
                   console.warn('Impersonation session expired, clearing state');
                   safeSessionStorage.removeItem(STORAGE_KEY);
                   setSessionExpired(true);
                   toast.warning('Impersonation session expired. Please re-authenticate.');
                   return;
               }

               setTargetUser(session.targetUser);
           } catch (error) {
               console.error('Failed to parse impersonation session:', error);
               safeSessionStorage.removeItem(STORAGE_KEY);
           }
       }, []);

       // Periodic expiration check (every 30 seconds)
       useEffect(() => {
           if (!targetUser) return;

           const interval = setInterval(() => {
               const stored = safeSessionStorage.getItem(STORAGE_KEY);
               if (!stored) return;

               try {
                   const session: ImpersonationSession = JSON.parse(stored);

                   if (Date.now() > session.expiresAt) {
                       console.warn('Impersonation session expired during active use');
                       safeSessionStorage.removeItem(STORAGE_KEY);
                       setTargetUser(null);
                       setSessionExpired(true);
                       toast.warning('Impersonation session expired. Returning to your account.');
                   }
               } catch (error) {
                   console.error('Failed to check session expiration:', error);
               }
           }, 30000); // Check every 30 seconds

           return () => clearInterval(interval);
       }, [targetUser]);

       const startImpersonation = useCallback((targetEmail: string) => {
           const session: ImpersonationSession = {
               targetUser: targetEmail,
               startedAt: Date.now(),
               expiresAt: Date.now() + IMPERSONATION_TIMEOUT_MS,
           };

           const serialized = JSON.stringify(session);
           if (safeSessionStorage.setItem(STORAGE_KEY, serialized)) {
               setTargetUser(targetEmail);
               setSessionExpired(false);
           }
       }, []);

       // Rest of implementation...
   }
   ```

2. **Add backend JWT expiry check:**
   ```go
   // backend/pkg/middleware/impersonation.go
   func ValidateImpersonationSession(jwtExpiry time.Time, sessionStart time.Time) error {
       // Impersonation sessions must not outlive JWT tokens
       if time.Now().After(jwtExpiry) {
           return errors.New("impersonation session expired with JWT token")
       }

       // Impersonation sessions also have independent 1-hour limit
       sessionExpiry := sessionStart.Add(1 * time.Hour)
       if time.Now().After(sessionExpiry) {
           return errors.New("impersonation session exceeded 1-hour limit")
       }

       return nil
   }
   ```

3. **Update Phase 1 exit criteria:**
   - [ ] Impersonation sessions expire after 1 hour
   - [ ] Expired sessions show warning toast and return to user's account
   - [ ] Backend validates session expiry on every request
   - [ ] E2E test: Impersonation expires after timeout

**Test Cases:**
```typescript
// src/state/__tests__/impersonation.test.tsx

it('expires impersonation session after timeout', async () => {
  jest.useFakeTimers();

  const wrapper = ({ children }) => (
    <ImpersonationProvider>{children}</ImpersonationProvider>
  );

  const { result } = renderHook(() => useImpersonation(), { wrapper });

  // Start impersonation
  await act(async () => {
    await result.current.startImpersonation('customer@example.com');
  });

  expect(result.current.isImpersonating).toBe(true);

  // Fast-forward past expiration (1 hour + 1 minute)
  jest.advanceTimersByTime(3660000);

  // Trigger periodic check
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });

  // Should be expired
  await waitFor(() => {
    expect(result.current.isImpersonating).toBe(false);
  });

  jest.useRealTimers();
});
```

---

#### HIGH-4: Type Coercion Vulnerabilities in Zod Validation

**Phase:** 3 (TanStack Router Migration)
**CVSS 3.1 Score:** 6.5 (MEDIUM, elevated to HIGH due to potential for DoS)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:H

**Vulnerability:**
The plan uses `z.coerce.number()` and `z.coerce.date()` for type coercion, which can have unexpected behavior with malicious input leading to Denial of Service or logic errors.

**Evidence:**
- `phase-3-tanstack-router.md:589-596` shows Zod coercion: `z.string().pipe(z.coerce.date())`
- `phase-3-tanstack-router.md:326` shows: `z.number().int().positive().default(1).catch(1)`
- No explicit validation for edge cases like `Infinity`, `NaN`, or invalid date strings

**Attack Scenarios:**

**Scenario 1: Infinite pagination**
```
URL: /assets?page=Infinity
Zod: z.coerce.number() converts "Infinity" to Infinity
Backend: SELECT * FROM assets LIMIT Infinity OFFSET ...
Result: Returns entire database, causing memory exhaustion
```

**Scenario 2: Invalid date parsing**
```
URL: /assets?from=999999999999999999
Zod: z.coerce.date() creates invalid Date object
App: new Date(999999999999999999) // Year 31688...
Backend: Queries with impossible date range, returns no results or errors
```

**Scenario 3: Negative numbers**
```
URL: /assets?limit=-1
Zod: z.coerce.number() converts "-1" to -1
Backend: LIMIT -1 behavior is undefined (SQLite returns all rows)
```

**Impact:**
- Denial of Service through resource exhaustion
- Unexpected application behavior
- Database query errors and 500 responses
- Cache poisoning with invalid query parameters

**Remediation:**

1. **Replace `.coerce` with explicit validation:**
   ```typescript
   // src/schemas/searchSchemas.ts
   import { z } from 'zod';

   // Safe number parsing with range validation
   export const paginationPageSchema = z
       .string()
       .optional()
       .transform((val) => {
           if (!val) return 1;
           const parsed = parseInt(val, 10);

           // Reject non-finite numbers
           if (!Number.isFinite(parsed)) {
               return 1; // Default to safe value
           }

           // Enforce reasonable range
           if (parsed < 1) return 1;
           if (parsed > 10000) return 10000; // Max pagination limit

           return parsed;
       });

   // Safe date parsing with validation
   export const dateRangeSchema = z
       .string()
       .optional()
       .transform((val) => {
           if (!val) return undefined;

           const parsed = new Date(val);

           // Reject invalid dates
           if (isNaN(parsed.getTime())) {
               return undefined;
           }

           // Enforce reasonable date range (prevent Year 31688...)
           const MIN_DATE = new Date('1970-01-01');
           const MAX_DATE = new Date('2100-01-01');

           if (parsed < MIN_DATE || parsed > MAX_DATE) {
               return undefined;
           }

           return parsed;
       });

   // Example usage in route
   const assetsSearchSchema = z.object({
       page: paginationPageSchema,
       from: dateRangeSchema,
       to: dateRangeSchema,
       limit: z.string()
           .optional()
           .transform((val) => {
               if (!val) return 50;
               const parsed = parseInt(val, 10);
               if (!Number.isFinite(parsed) || parsed < 1) return 50;
               if (parsed > 1000) return 1000; // Max limit
               return parsed;
           }),
   });
   ```

2. **Add validation helpers:**
   ```typescript
   // src/utils/validation.ts
   export function safeParseInt(
       value: string | undefined,
       defaultValue: number,
       min: number,
       max: number
   ): number {
       if (!value) return defaultValue;

       const parsed = parseInt(value, 10);

       if (!Number.isFinite(parsed)) return defaultValue;
       if (parsed < min) return min;
       if (parsed > max) return max;

       return parsed;
   }

   export function safeParseDate(
       value: string | undefined,
       minDate: Date = new Date('1970-01-01'),
       maxDate: Date = new Date('2100-01-01')
   ): Date | undefined {
       if (!value) return undefined;

       const parsed = new Date(value);

       if (isNaN(parsed.getTime())) return undefined;
       if (parsed < minDate || parsed > maxDate) return undefined;

       return parsed;
   }
   ```

3. **Update Phase 3 exit criteria:**
   - [ ] All `.coerce` usage replaced with explicit validation
   - [ ] Range limits enforced on all numeric search parameters
   - [ ] Date validation prevents invalid date objects
   - [ ] Security test: `?page=Infinity` does not cause DoS

**Test Cases:**
```typescript
// src/schemas/__tests__/searchSchemas.test.ts

describe('paginationPageSchema', () => {
  it('rejects Infinity', () => {
    const result = paginationPageSchema.parse('Infinity');
    expect(result).toBe(1); // Defaults to safe value
    expect(Number.isFinite(result)).toBe(true);
  });

  it('rejects negative numbers', () => {
    const result = paginationPageSchema.parse('-5');
    expect(result).toBe(1);
  });

  it('enforces maximum page limit', () => {
    const result = paginationPageSchema.parse('99999');
    expect(result).toBe(10000); // Clamped to max
  });

  it('parses valid page numbers', () => {
    expect(paginationPageSchema.parse('1')).toBe(1);
    expect(paginationPageSchema.parse('42')).toBe(42);
  });
});

describe('dateRangeSchema', () => {
  it('rejects invalid date strings', () => {
    const result = dateRangeSchema.parse('not-a-date');
    expect(result).toBeUndefined();
  });

  it('rejects dates outside reasonable range', () => {
    const result = dateRangeSchema.parse('999999999999999999');
    expect(result).toBeUndefined();
  });

  it('parses valid dates', () => {
    const result = dateRangeSchema.parse('2025-01-01');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2025);
  });
});
```

---

### MEDIUM Severity Issues

#### MED-1: No Audit Logging for Impersonation Events

**Phase:** 1
**CVSS 3.1 Score:** 5.9 (MEDIUM)
**Vector:** CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:H/A:N

**Vulnerability:** Impersonation start/stop events are not logged for audit trails, making it difficult to investigate unauthorized access or detect abuse patterns.

**Remediation:**
- Add backend audit logging endpoint
- Log: timestamp, praetorian user, target customer, action (start/stop/expired), IP address
- Integrate with SIEM for monitoring
- Add to compliance reports (SOC 2, GDPR)

---

#### MED-2: Cache Poisoning via Client-Side Impersonation

**Phase:** 1
**CVSS 3.1 Score:** 5.4 (MEDIUM)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:L/A:L

**Vulnerability:** TanStack Query cache keys include `friend` field from impersonation context. If an attacker manipulates sessionStorage between query execution and cache storage, they could poison the cache with data from wrong tenant.

**Attack Scenario:**
1. User starts impersonation for customer A
2. TanStack Query fetches data with cache key `['assets', 'customerA@example.com']`
3. During fetch (before cache storage), attacker modifies sessionStorage to customer B
4. Response from customer A stored under customer B's cache key
5. User now sees customer A's data when viewing customer B

**Remediation:**
- Validate cache key matches current impersonation state before storing
- Use atomic cache operations with context snapshot
- Add cache invalidation on impersonation change

---

#### MED-3: localStorage 24-Hour TTL Creates Temporary Capability URLs

**Phase:** 2
**CVSS 3.1 Score:** 5.3 (MEDIUM)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N

**Vulnerability:** Hash-to-entity-key mappings persist in localStorage for 24 hours, effectively creating temporary capability URLs. An attacker who obtains a hash can access the entity for up to 24 hours from any browser on the same machine.

**Remediation:**
- Reduce TTL to 1 hour (balance between usability and security)
- Add user authentication check to localStorage entries
- Clear localStorage on logout
- Consider httpOnly cookies for hash storage (requires backend support)

---

#### MED-4: Column Accessor Path Injection

**Phase:** 4
**CVSS 3.1 Score:** 5.0 (MEDIUM)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N

**Vulnerability:** The `columnAdapter` uses `accessorFn` with nested paths like `user.email` split on `.` character. If column definitions come from user input (e.g., customizable table views), this could lead to unintended data access.

**Example:**
```typescript
// Malicious column definition
{ key: '__proto__.constructor', header: 'Exploit' }
```

**Remediation:**
- Whitelist allowed column paths
- Validate column definitions against schema
- Never allow user-provided column definitions without validation
- Use `Object.hasOwn()` instead of property access for safety

---

#### MED-5: Nested Drawer DoS via Unbounded Recursion

**Phase:** 5
**CVSS 3.1 Score:** 4.9 (MEDIUM)
**Vector:** CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H

**Vulnerability:** While the plan enforces max 2 nested drawers, the validation only logs a warning and continues processing. A malicious user could craft a URL with 1000 nested drawers, causing browser DoS.

**Evidence:**
- `phase-5-drawer-simplification.md:196-198`: `console.warn('Max drawer nesting exceeded (max 2). Ignoring extra drawers.')`
- Warning doesn't prevent processing, just logs

**Remediation:**
```typescript
// src/hooks/useDrawerState.ts
useEffect(() => {
  if (!search.stack || search.stack.length === 0) {
    setNestedDrawer(null);
    return;
  }

  // CRITICAL: Reject if exceeds max nesting (don't just warn)
  if (search.stack.length > 2) {
    console.error('Max drawer nesting exceeded. Rejecting stack.');
    navigate({
      search: (prev) => ({
        ...prev,
        stack: undefined, // Clear invalid stack
      }),
      replace: true,
    });
    toast.error('Invalid drawer configuration');
    return;
  }

  // Process only the first drawer in stack
  const [type, hash] = search.stack[0].split(':');
  // ... rest of implementation
}, [search.stack, navigate]);
```

---

#### MED-6: React Context Exposure via DevTools

**Phase:** All
**CVSS 3.1 Score:** 4.3 (MEDIUM)
**Vector:** CVSS:3.1/AV:L/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N

**Vulnerability:** React DevTools can inspect context values, including sensitive impersonation state and auth tokens. An attacker with physical access to an unlocked machine could view this data.

**Remediation:**
- Disable React DevTools in production builds
- Add Content Security Policy to prevent DevTools injection
- Implement screen lock timeout for sensitive users
- Document physical security requirements

---

### LOW Severity Issues

#### LOW-1: Hash Format Leaks Entity Type
**Phase:** 2
**Detail:** Hash format `asset:a7f3b2c1` reveals entity type in URL. While not critical, this leaks information about data structure.

#### LOW-2: No CSRF Protection on Mutation Endpoints
**Phase:** 3
**Detail:** Plan doesn't mention CSRF token validation. While JWT authentication provides some protection, explicit CSRF tokens recommended for state-changing operations.

#### LOW-3: Browser Extension Access to sessionStorage
**Phase:** 1
**Detail:** Browser extensions with `activeTab` permission can read sessionStorage. Users should be warned about extension security.

#### LOW-4: No Content Security Policy Configuration
**Phase:** 3
**Detail:** Plan doesn't mention CSP headers to prevent XSS. Backend should serve strict CSP headers.

#### LOW-5: Drawer State in URL Query Parameters
**Phase:** 5
**Detail:** Drawer state in URL makes it easy to share deep links, but also easier to craft malicious links. Consider using `#` hash for client-side state instead of `?` query params.

#### LOW-6: No Validation of OAuth State Parameter
**Phase:** 1
**Detail:** OAuth flow restoration relies on `oauth_impersonation_restore` key without validating state parameter. CSRF protection for OAuth recommended.

#### LOW-7: Missing Subresource Integrity (SRI)
**Phase:** 3
**Detail:** No mention of SRI for external scripts. Recommended for CDN-hosted dependencies.

#### LOW-8: TanStack Query DevTools in Production
**Phase:** 3
**Detail:** Plan shows `@tanstack/router-devtools` as dev dependency, but verify it's tree-shaken in production builds.

---

## Security Test Plan

### Priority 1 Tests (CRITICAL/HIGH Findings)

**Test Suite: Impersonation Authorization**
```typescript
describe('Impersonation Authorization', () => {
  it('prevents customer from impersonating another customer', async () => {
    // Authenticate as customer A
    await login('customerA@example.com', 'password');

    // Attempt to impersonate customer B
    const result = await api.post('/api/v1/impersonation/start', {
      targetEmail: 'customerB@example.com'
    });

    expect(result.status).toBe(403);
    expect(sessionStorage.getItem('chariot_impersonation_target')).toBeNull();
  });

  it('allows Praetorian user to impersonate customer', async () => {
    await login('praetorian@praetorian.com', 'password');

    const result = await api.post('/api/v1/impersonation/start', {
      targetEmail: 'customer@example.com'
    });

    expect(result.status).toBe(200);
  });

  it('logs impersonation events to audit log', async () => {
    await login('praetorian@praetorian.com', 'password');
    await api.post('/api/v1/impersonation/start', { targetEmail: 'customer@example.com' });

    const auditLog = await api.get('/api/v1/audit-log');
    expect(auditLog.data).toContainEqual(
      expect.objectContaining({
        event: 'impersonation_start',
        actor: 'praetorian@praetorian.com',
        target: 'customer@example.com',
      })
    );
  });
});
```

**Test Suite: Open Redirect Prevention**
```typescript
describe('Redirect URL Validation', () => {
  const openRedirectVectors = [
    'https://evil.com/phishing',
    '//evil.com/phishing',
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    '/admin/delete-all-users',
    'http://localhost:3000@evil.com', // Host spoofing
  ];

  openRedirectVectors.forEach((maliciousUrl) => {
    it(`blocks redirect to: ${maliciousUrl}`, async ({ page }) => {
      await page.goto(`http://localhost:3000/login?redirect=${encodeURIComponent(maliciousUrl)}`);

      await login(page);

      // Should redirect to safe default
      await expect(page).toHaveURL(/\/insights/);
      expect(page.url()).not.toContain('evil.com');
    });
  });
});
```

**Test Suite: XSS Prevention**
```typescript
describe('XSS Prevention in Search Parameters', () => {
  const xssVectors = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<svg/onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
  ];

  xssVectors.forEach((payload) => {
    it(`sanitizes payload: ${payload}`, async ({ page }) => {
      await page.goto(`http://localhost:3000/assets?search=${encodeURIComponent(payload)}`);

      await page.waitForTimeout(1000);

      // Verify no alert dialog (XSS did not execute)
      const hasAlert = await page.evaluate(() => {
        return window.document.querySelectorAll('[role="alert"]').length > 0;
      });
      expect(hasAlert).toBe(false);

      // Verify content is text, not HTML
      const content = await page.textContent('h1');
      expect(content).not.toContain('<script');
      expect(content).not.toContain('onerror');
    });
  });
});
```

**Test Suite: Hash Brute-Force Protection**
```typescript
describe('Hash Resolution Rate Limiting', () => {
  it('blocks after 10 failed hash resolutions in 1 minute', async () => {
    // Attempt 11 hash resolutions
    const promises = [];
    for (let i = 0; i < 11; i++) {
      promises.push(api.get(`/api/v1/hash-registry/invalid${i}`));
    }

    const results = await Promise.allSettled(promises);

    // First 10 should return 404 (not found)
    expect(results.slice(0, 10).every(r => r.status === 'rejected' && r.reason.response?.status === 404)).toBe(true);

    // 11th should return 429 (rate limit)
    expect(results[10].status).toBe('rejected');
    expect(results[10].reason.response?.status).toBe(429);
  });

  it('allows requests after rate limit window expires', async () => {
    // Exhaust rate limit
    for (let i = 0; i < 10; i++) {
      await api.get(`/api/v1/hash-registry/invalid${i}`).catch(() => {});
    }

    // Wait 61 seconds (rate limit window + buffer)
    await new Promise(resolve => setTimeout(resolve, 61000));

    // Should work again
    const result = await api.get('/api/v1/hash-registry/invalidNew');
    expect(result.status).not.toBe(429);
  });
});
```

**Test Suite: Impersonation Session Expiry**
```typescript
describe('Impersonation Session Expiry', () => {
  it('expires session after 1 hour', async () => {
    jest.useFakeTimers();

    // Start impersonation
    await api.post('/api/v1/impersonation/start', { targetEmail: 'customer@example.com' });

    // Verify active
    let status = await api.get('/api/v1/impersonation/status');
    expect(status.data.isImpersonating).toBe(true);

    // Fast-forward 61 minutes
    jest.advanceTimersByTime(3660000);

    // Should be expired
    status = await api.get('/api/v1/impersonation/status');
    expect(status.data.isImpersonating).toBe(false);

    jest.useRealTimers();
  });

  it('shows warning toast when session expires during use', async ({ page }) => {
    // Start impersonation
    await page.goto('/settings?action=startImpersonation&target=customer@example.com');

    // Mock time passing
    await page.evaluate(() => {
      const now = Date.now();
      // Advance Date.now() by 61 minutes
      Date.now = () => now + 3660000;
    });

    // Trigger periodic check
    await page.waitForTimeout(31000);

    // Should see expiration toast
    await expect(page.locator('.toast')).toContainText('Impersonation session expired');
  });
});
```

**Test Suite: Type Coercion Safety**
```typescript
describe('Type Coercion Safety', () => {
  const maliciousValues = [
    { param: 'page', value: 'Infinity', expected: 1 },
    { param: 'page', value: '-1', expected: 1 },
    { param: 'page', value: '999999', expected: 10000 },
    { param: 'limit', value: 'NaN', expected: 50 },
    { param: 'from', value: '999999999999999999', expected: undefined },
  ];

  maliciousValues.forEach(({ param, value, expected }) => {
    it(`safely handles ${param}=${value}`, async () => {
      const searchSchema = paginationPageSchema; // Or appropriate schema
      const result = searchSchema.parse(value);

      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBe(expected);
    });
  });
});
```

### Priority 2 Tests (MEDIUM Findings)

**Test Suite: Audit Logging**
- Verify all impersonation events logged
- Verify log format includes required fields
- Verify logs exported to SIEM

**Test Suite: Cache Poisoning**
- Verify cache invalidation on impersonation change
- Verify cache keys match current context
- Verify no stale data shown after context switch

**Test Suite: Hash TTL Enforcement**
- Verify hashes expire after 1 hour (reduced from 24)
- Verify expired hashes return 404
- Verify localStorage cleaned up

**Test Suite: Column Injection**
- Verify column paths validated against whitelist
- Verify prototype pollution prevented
- Verify only schema-defined columns accessible

**Test Suite: Nested Drawer Limits**
- Verify max 2 nested drawers enforced
- Verify excessive nesting rejected (not just warned)
- Verify malicious stack cleared from URL

---

## Recommendations

### Immediate Actions (Before Phase 1)

1. **Implement CRIT-1 remediation** (Impersonation authorization backend validation)
2. **Implement CRIT-2 remediation** (Open redirect prevention)
3. **Implement HIGH-1 remediation** (XSS sanitization layer)
4. **Design HIGH-2 remediation** (Hash brute-force protection architecture)

### Phase-Specific Actions

**Phase 1:**
- Add impersonation authorization backend endpoint
- Implement session expiry mechanism (HIGH-3)
- Add audit logging (MED-1)
- Add cache poisoning prevention (MED-2)

**Phase 2:**
- Implement hash brute-force protection (HIGH-2)
- Reduce localStorage TTL to 1 hour (MED-3)
- Add hash validation security tests

**Phase 3:**
- Add XSS sanitization to all Zod schemas (HIGH-1)
- Implement redirect URL validation (CRIT-2)
- Replace `.coerce` with explicit validation (HIGH-4)
- Add CSRF protection for mutations (LOW-2)
- Configure CSP headers (LOW-4)

**Phase 4:**
- Whitelist column accessor paths (MED-4)
- Add column definition validation

**Phase 5:**
- Enforce max nesting limit (don't just warn) (MED-5)
- Implement drawer registry pattern per review

### Testing Strategy

1. **Security test suite**: Create dedicated security test files for each phase
2. **Penetration testing**: Engage external security firm after Phase 3
3. **Code review**: All PRs require security-focused review
4. **Static analysis**: Integrate Semgrep/Snyk with security rules
5. **Dynamic testing**: Use OWASP ZAP for automated scanning

### Monitoring & Alerting

1. **Rate limiting alerts**: Alert on 100+ failed hash resolutions from single user
2. **Impersonation monitoring**: Dashboard showing active impersonation sessions
3. **Audit log review**: Weekly review of impersonation events
4. **XSS attempt detection**: Log and alert on sanitized malicious payloads
5. **Security metrics**: Track security test coverage and findings over time

---

## Approval Status

**STATUS:** ⚠️ **APPROVED WITH MANDATORY CHANGES**

**Conditions:**
1. CRIT-1 and CRIT-2 vulnerabilities MUST be fixed before any implementation begins
2. HIGH severity findings MUST be addressed within their respective phases
3. MEDIUM severity findings MUST be documented as known limitations with monitoring plans
4. LOW severity findings should be tracked in backlog for future improvements
5. Security test suite MUST be implemented alongside each phase (not after)

**Sign-off required from:**
- [ ] Security Lead - for architectural changes (CRIT-1, CRIT-2)
- [ ] Backend Lead - for backend validation endpoints (CRIT-1, HIGH-2)
- [ ] Frontend Lead - for implementation approach
- [ ] Product Owner - for timeline impact of mandatory changes

**Estimated Timeline Impact:**
- CRIT-1 remediation: +1 week (Phase 0, blocking Phase 1)
- CRIT-2 remediation: +2 days (Phase 3)
- HIGH findings: +1 week (distributed across phases)
- Total additional time: ~2.5 weeks to project timeline

**Post-Implementation Requirements:**
1. Penetration test before production deployment
2. Security review of final implementation
3. Monitoring dashboard for impersonation and rate limiting
4. Quarterly security audit of access logs

---

## Conclusion

The URL refactoring plan addresses legitimate privacy concerns but introduces new security risks that require careful mitigation. The most critical issues are:

1. **Authorization bypass in impersonation** - Could allow customers to access competitor data
2. **Open redirect vulnerability** - Could enable phishing attacks with legitimate domain
3. **XSS via search parameters** - Could allow session hijacking and credential theft
4. **Hash brute-force attacks** - Could expose entity keys containing PII

With the mandatory changes implemented, this refactoring will improve overall security posture by removing PII from URLs while maintaining strong access controls. The team has demonstrated security awareness in the architectural review process (fixing OAuth race condition, increasing hash length), which increases confidence in successful implementation.

**The refactoring should proceed with MANDATORY changes implemented and security testing integrated into each phase.**

---

## Metadata

```json
{
  "reviewer": "frontend-security-reviewer",
  "review_date": "2025-12-31",
  "plan_version": "v1.0-post-architectural-review",
  "findings_summary": {
    "critical": 2,
    "high": 4,
    "medium": 6,
    "low": 8,
    "total": 20
  },
  "phases_reviewed": 5,
  "files_analyzed": [
    "PLAN.md",
    "FRONTEND-REVIEWER-FEEDBACK.md",
    "TEST-PLAN.md",
    "phase-0-preparatory-work.md",
    "phase-1-impersonation.md",
    "phase-2-pii-free-urls.md",
    "phase-3-tanstack-router.md",
    "phase-4-tanstack-tables.md",
    "phase-5-drawer-simplification.md",
    "appendices/architecture-decisions.md",
    "appendices/reference-materials.md",
    "appendices/testing-strategy.md"
  ],
  "codebase_files_reviewed": [
    "modules/chariot/ui/src/state/auth.tsx:490-609",
    "modules/chariot/ui/src/state/global.state.tsx:1-100"
  ],
  "compliance_frameworks": [
    "OWASP ASVS 4.0",
    "GDPR",
    "SOC 2 Type 2",
    "NIST Cybersecurity Framework"
  ],
  "references": [
    "OWASP Top 10 2021",
    "OWASP ASVS 8.3.1 (Information Exposure Through Query Strings)",
    "CWE-601 (Open Redirect)",
    "CWE-79 (XSS)",
    "CWE-862 (Missing Authorization)",
    "CWE-841 (Improper Type Coercion)"
  ]
}
```
