# Firebase C2 Configuration

**Firebase Realtime Database setup, operational security, and configuration propagation.**

**Source**: `modules/hypercube-ng/docs/setup.md`, codebase analysis

---

## Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name: Use engagement-specific name (e.g., `engagement-clientname-2026`)
4. Disable Google Analytics (not needed, reduces tracking)
5. Create project

### Step 2: Enable Realtime Database

1. In Firebase Console → Build → Realtime Database
2. Click "Create Database"
3. Location: Choose geographically appropriate region
4. Security rules: Start in **locked mode** (we'll configure next)
5. Click "Enable"

### Step 3: Configure Database Rules

**Replace default rules with:**

```json
{
  "rules": {
    ".read": "auth != null && (auth.token.firebase.sign_in_provider === 'custom' || auth.uid === 'service-account')",
    ".write": "auth != null && (auth.token.firebase.sign_in_provider === 'custom' || auth.uid === 'service-account')",
    "clients": {
      "$uid": {
        ".read": "(auth.provider === 'anonymous' && $uid === auth.uid) || (auth.uid === 'service-account')",
        ".write": "(auth.provider === 'anonymous' && $uid === auth.uid) || (auth.uid === 'service-account')"
      }
    },
    "requests": {
      "$uid": {
        ".read": "(auth.provider === 'anonymous' && $uid === auth.uid) || (auth.uid === 'service-account')",
        ".write": "auth.uid === 'service-account'"
      }
    },
    "responses": {
      "$uid": {
        ".read": "auth.uid === 'service-account'",
        ".write": "(auth.provider === 'anonymous' && $uid === auth.uid) || (auth.uid === 'service-account')"
      }
    },
    "ws": {
      "$uid": {
        ".read": "(auth.provider === 'anonymous' && $uid === auth.uid) || (auth.uid === 'service-account')",
        ".write": "(auth.provider === 'anonymous' && $uid === auth.uid) || (auth.uid === 'service-account')"
      }
    }
  }
}
```

**Rule explanation:**

- `clients/` - Extensions can write their own UID, operator can read all
- `requests/` - Operator writes, extensions read their own UID
- `responses/` - Extensions write, operator reads
- `ws/` - Bidirectional for WebSocket proxying

### Step 4: Enable Anonymous Authentication

1. Firebase Console → Build → Authentication
2. Click "Get started"
3. Sign-in method tab
4. Enable "Anonymous"
5. Save

### Step 5: Get Web App Credentials

1. Firebase Console → Project Settings (gear icon)
2. Your apps section → Add app → Web (</> icon)
3. Register app (name doesn't matter)
4. Copy Firebase SDK config:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "project.firebaseapp.com",
  databaseURL: "https://project-default-rtdb.firebaseio.com",
  projectId: "project-id",
  storageBucket: "project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc",
};
```

5. Save as `modules/hypercube-ng/client.json`

### Step 6: Get Service Account Key

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Confirm and download JSON file
4. Save as `modules/hypercube-ng/serviceAccountKey.json`

**⚠️ SECURITY**: Keep this file secure. It has admin access to Firebase.

---

## Configuration Propagation

**Build process embeds configs:**

```
client.json → common/client-config.json → extension/main.wasm
serviceAccountKey.json → cmd/proxy/config.json → proxy binary
```

**No runtime configuration needed** - everything embedded at build time.

---

## C2 Communication Flow

### Extension → Firebase

1. Extension authenticates anonymously
2. Receives unique UID from Firebase
3. Writes to `clients/<UID>` with metadata (browser, OS, timestamp)
4. Listens on `requests/<UID>` for operator commands

### Operator → Extension

1. Proxy authenticates with service account (custom token)
2. Reads from `clients/` to see all connected extensions
3. Writes commands to `requests/<UID>`
4. Reads responses from `responses/<UID>`

### Encryption Layer

**All Firebase data encrypted:**

- Curve25519 keypair generated at build time
- Shared secret derived between extension and proxy
- AES-GCM encryption for all payloads
- Firebase only sees encrypted blobs

---

## Operational Security

### Engagement-Specific Projects

**CRITICAL**: Use separate Firebase project per engagement

**Why:**

- Prevents cross-engagement contamination
- Enables clean closure (delete project after engagement)
- Reduces blast radius if compromised

**Don't:**

- Reuse Firebase projects across engagements
- Use personal Firebase account
- Leave projects running after engagement closure

### Payment Isolation

**Use virtual cards** (privacy.com) for Firebase billing:

- First-name-only cardholder names allowed
- Disposable card numbers
- No link to personal identity

### Project Naming

**Naming convention:**

- Format: `<engagement>-<client>-<year>`
- Example: `redteam-acmecorp-2026`
- Avoid: Real company names, obvious security terms

### Cleanup Procedure

**After engagement:**

1. Export data if needed for reporting
2. Delete Firebase Realtime Database
3. Delete Firebase project entirely
4. Revoke service account keys
5. Delete local `client.json` and `serviceAccountKey.json`
6. Document deletion in engagement closure report

---

## Troubleshooting

### Extension Can't Connect to Firebase

**Check:**

1. `client.json` credentials correct
2. Anonymous auth enabled in Firebase Console
3. Database rules allow anonymous read/write to `clients/`
4. Network connectivity (firewall/proxy issues)

**Console errors to look for:**

- "Firebase: Error (auth/operation-not-allowed)" → Anonymous auth not enabled
- "PERMISSION_DENIED" → Database rules incorrect

### Operator Proxy Can't Authenticate

**Check:**

1. `serviceAccountKey.json` from correct Firebase project
2. Service account has Firebase Admin role
3. API key in `serviceAccountKey.json` matches project
4. No firewall blocking Firebase API calls

### Database Rules Rejecting Access

**Debug:**

1. Firebase Console → Realtime Database → Rules tab
2. Check "Simulator" to test rules
3. Test anonymous auth: `auth.provider === 'anonymous'`
4. Test custom token: `auth.uid === 'service-account'`

---

## Alternative C2 Channels (Advanced)

**If Firebase blocked/detected:**

1. **Firebase Firestore** instead of Realtime Database
2. **Google Cloud Storage** for dead-drop style C2
3. **Custom WebSocket server** (requires infrastructure)
4. **Cloud Functions** for HTTP-based C2

**Trade-offs:**

- Firebase is free, managed, reliable
- Alternatives require more infrastructure
- Hypercube-ng designed for Firebase (code changes needed)

---

## References

- **Setup guide**: `modules/hypercube-ng/docs/setup.md`
- **Firebase Console**: https://console.firebase.google.com
- **Firebase docs**: https://firebase.google.com/docs/database
- **Security rules**: https://firebase.google.com/docs/database/security
