---
name: firebase-cli-deployment
description: Use when deploying Firebase projects - CLI authentication, project creation, Realtime Database setup, security rules deployment, and anonymous auth configuration.
allowed-tools: Bash, Read
---

# Firebase CLI Deployment

**Comprehensive Firebase CLI patterns for project setup, authentication, and deployment.**

---

## When to Use

- Setting up new Firebase projects for applications
- Configuring Firebase Realtime Database instances
- Deploying Firebase security rules
- Troubleshooting Firebase authentication issues
- Automating Firebase project creation

---

## Firebase CLI Requirements

### Installation

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Verify installation
firebase --version
```

### Authentication Workflow

**⚠️ CRITICAL**: Firebase CLI uses gcloud credentials. Always verify the active gcloud account before Firebase operations.

#### Standard Authentication Check

```bash
# 1. Check active gcloud account
gcloud auth list

# 2. Verify this is the correct account for your deployment
# Look for the active account (marked with *)

# 3. Confirm Firebase CLI can authenticate using gcloud credentials
firebase projects:list
```

**Why this workflow:**

- Firebase CLI automatically uses gcloud application-default credentials
- `gcloud auth list` shows which account is active
- `firebase projects:list` confirms Firebase CLI can access projects with those credentials
- No separate `firebase login` needed if gcloud is authenticated

**If gcloud authentication is needed:**

```bash
# Authenticate gcloud for application-default credentials
gcloud auth application-default login
# Follow browser OAuth flow
```

**If `firebase projects:list` fails:**

- Check Google Cloud API enablement (Firebase Management API)
- Verify IAM permissions in Google Cloud Console
- Check for expired service account keys
- Verify gcloud account has access: `gcloud auth list`

---

## Common Firebase CLI Commands

### Project Management

```bash
# Create new Firebase project
firebase projects:create <project-id>

# Switch to existing project
firebase use <project-id>

# List all accessible projects
firebase projects:list

# Get current project info
firebase projects:describe <project-id>
```

### Realtime Database Operations

```bash
# Create Realtime Database instance
firebase database:instances:create <instance-id> --location=us-central1

# List database instances for current project
firebase database:instances:list

# Get database instance URL
# Format: https://<project-id>-default-rtdb.firebaseio.com
```

**Database instance naming:**

- Default: `<project-id>-default-rtdb`
- Custom: `<project-id>-<custom-name>-rtdb`
- Location: us-central1, europe-west1, asia-southeast1

### Security Rules Deployment

```bash
# Deploy security rules (requires firebase.json config)
firebase deploy --only database

# Deploy with specific rules file
firebase deploy --only database:rules

# Validate rules before deployment
firebase database:rules:get
```

**Security rules file location:** `database.rules.json` in project root

### Authentication Configuration

```bash
# Export authentication configuration
firebase auth:export --format=json auth-config.json

# Check exported config for enabled providers
cat auth-config.json | jq '.users'

# Verify anonymous auth is enabled (returns non-empty if enabled)
cat auth-config.json | grep -i anonymous
```

---

## Anonymous Authentication Setup

**⚠️ LIMITATION**: Firebase CLI does NOT support enabling auth providers programmatically. Must use Firebase Console.

### Manual Process (REQUIRED)

1. **Provide Console link to user:**

   ```
   https://console.firebase.google.com/project/<project-id>/authentication/providers
   ```

2. **User actions required:**
   - Open link in browser
   - Navigate to "Sign-in method" tab
   - Find "Anonymous" provider
   - Click "Enable" toggle
   - Save changes

3. **Wait for user confirmation** before proceeding

4. **Verify enablement:**

   ```bash
   firebase auth:export --format=json auth-config.json
   cat auth-config.json | grep -i anonymous
   ```

5. **Only proceed** after verification confirms anonymous auth is enabled

**Why manual setup required:**

- Firebase CLI lacks `firebase auth:enable` command
- Google security policy requires console confirmation
- Prevents accidental auth method enablement
- Ensures human review of security-critical settings

---

## Realtime Database Manual Creation

**⚠️ LIMITATION**: For NEW Firebase projects, the first Realtime Database instance must be created via Firebase Console (CLI creation may fail).

### Manual Process (REQUIRED for new projects)

1. **Provide Console link to user:**

   ```
   https://console.firebase.google.com/project/<project-id>/database
   ```

2. **User actions required:**
   - Open link in browser
   - Click "Create Database" button
   - Select location (recommended: us-central1)
   - Choose starting mode: "Start in locked mode" (security rules will be deployed after)
   - Click "Enable"

3. **Wait for user confirmation** before proceeding

4. **Verify database created:**

   ```bash
   firebase database:instances:list
   # Should show: <project-id>-default-rtdb
   ```

5. **Only proceed** after verification confirms database exists

**Why manual creation required:**

- First database instance creation requires Firebase Console interaction
- Console ensures proper region selection and security mode configuration
- After first database created, CLI commands work for subsequent operations
- Security rules deployment (via CLI) can proceed after database exists

**Alternative (for existing projects):**

```bash
# If project already has billing/APIs enabled:
firebase database:instances:create <project-id>-default-rtdb --location=us-central1
```

---

## Common Issues & Solutions

### Issue: "Permission denied" on project creation

**Cause:** Firebase Management API not enabled in Google Cloud

**Solution:**

```bash
# Enable Firebase Management API
gcloud services enable firebase.googleapis.com --project=<gcloud-project-id>

# Or provide user with console link:
# https://console.cloud.google.com/apis/library/firebase.googleapis.com
```

### Issue: "Project already exists"

**Cause:** Firebase project ID must be globally unique

**Solution:**

- Generate unique project ID with random suffix
- Check availability: `firebase projects:list | grep <project-id>`
- Use timestamp or random numbers in project ID

### Issue: Firebase CLI authentication fails

**Cause:** Stale gcloud credentials or wrong account active

**Solution:**

```bash
# Check active account
gcloud auth list

# Re-authenticate if needed
gcloud auth application-default login

# Verify Firebase CLI access
firebase projects:list
```

### Issue: Database instance creation fails

**Cause:** Wrong location or instance already exists

**Solution:**

```bash
# Check existing instances first
firebase database:instances:list

# Use correct location format
firebase database:instances:create <name> --location=us-central1
```

---

## Best Practices

### 1. Always Verify Authentication First

```bash
# Check active gcloud account
gcloud auth list

# Confirm Firebase CLI authentication works
firebase projects:list
```

### 2. Use Descriptive Project IDs

- Include environment: `myapp-prod`, `myapp-staging`
- Include purpose: `cdn-cache-8472`, `analytics-proxy-3291`
- Avoid: personal names, client names in public projects

### 3. Document Database Rules

```json
// database.rules.json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Deploy with: `firebase deploy --only database`

### 4. Test After Each Step

```bash
# After project creation
firebase use <project-id> && firebase projects:describe <project-id>

# After database creation
firebase database:instances:list

# After rules deployment
firebase database:rules:get
```

---

## Related Resources

- **Firebase CLI Docs**: https://firebase.google.com/docs/cli
- **Security Rules**: https://firebase.google.com/docs/database/security
- **Authentication**: https://firebase.google.com/docs/auth

---

## Integration Pattern

**When using in agent workflows:**

1. Load this skill for Firebase CLI knowledge
2. Run authentication workflow BEFORE any operations
3. Follow command patterns for each operation type
4. Handle errors with solutions from "Common Issues"
5. Verify each step completed successfully before proceeding

**Example agent integration:**

```markdown
### Step 1: Always Invoke First

| Skill                   | Why                                          |
| ----------------------- | -------------------------------------------- |
| firebase-cli-deployment | CLI commands, auth workflow, troubleshooting |
```
