# MSP Definition Matching

**How to search MSP definitions repository and propose matches for findings.**

---

## MSP Definitions Repository Structure

Typical structure:
```
msp-definitions/
├── cloud-security/
│   ├── findings/
│   │   ├── aws/
│   │   │   ├── aws_iam_role_allows_privilege_escalation.md
│   │   │   ├── aws_iam_wildcard_passrole_policies_allowed.md
│   │   │   ├── aws_iam_excessive_permissions_policy.md
│   │   │   ├── aws_lambda_secrets_in_functions.md
│   │   │   └── ...
│   │   ├── azure/
│   │   ├── gcp/
│   │   └── kubernetes/
```

---

## Matching Algorithm

### Step 1: Extract Keywords from Risk Context

From the risk ID, vulnerability description, or user input, extract key terms:

**Example Risk ID:** `aws-iam-developer-compute-identity-takeover-otm-production`

**Extracted Keywords:**
- `aws`
- `iam`
- `developer`
- `compute`
- `identity`
- `privilege` (implied by takeover/escalation)

### Step 2: Search MSP Definitions

```bash
# Search for definitions matching keywords
find $MSP_DEFINITIONS_REPO -name "*.md" -type f | \
  grep -E "aws.*iam|iam.*privilege|wildcard|compute|excessive"
```

### Step 3: Rank Matches by Relevance

**Scoring criteria:**

1. **Exact match** (100 points): Filename contains all primary keywords
   - `aws_iam_role_allows_privilege_escalation.md` matches `aws`, `iam`, `privilege`

2. **Partial match** (50-75 points): Filename contains most keywords
   - `aws_iam_wildcard_passrole_policies_allowed.md` matches `aws`, `iam`, `wildcard`
   - `aws_iam_excessive_permissions_policy.md` matches `aws`, `iam`, `excessive`

3. **Category match** (25-50 points): In correct cloud provider directory
   - All files in `aws/` directory for AWS findings

4. **Generic match** (10-25 points): Related category but not specific
   - `aws_iam_inline_policies_applied_to_users.md` is IAM-related but not privilege escalation

### Step 4: Present Top 3-5 Matches

Present via AskUserQuestion with relevance scores:

```
Question: "Select a definition file from MSP definitions repository"
Header: "Definition"
Options:
- "aws_iam_role_allows_privilege_escalation.md (Best match - 100%)"
- "aws_iam_wildcard_passrole_policies_allowed.md (Good match - 75%)"
- "aws_iam_excessive_permissions_policy.md (Partial match - 60%)"
- "Use custom definition from current directory"
- "No definition"
```

---

## Matching Examples

### Example 1: IAM Privilege Escalation

**Risk ID:** `aws-iam-developer-lambda-privilege-escalation`

**Keywords:** aws, iam, lambda, privilege, escalation

**Search:**
```bash
find $MSP_DEFINITIONS_REPO -path "*/aws/*" -name "*.md" | \
  grep -E "iam.*privilege|iam.*escalat|lambda"
```

**Top Matches:**
1. `aws_iam_role_allows_privilege_escalation.md` (Best - covers privilege escalation via roles)
2. `aws_emr_privilege_escalation.md` (Partial - compute service escalation)
3. `aws_lambda_secrets_in_functions.md` (Weak - Lambda but not escalation)

### Example 2: Wildcard Permissions

**Risk ID:** `aws-iam-wildcard-compute-permissions`

**Keywords:** aws, iam, wildcard, compute, permissions

**Search:**
```bash
find $MSP_DEFINITIONS_REPO -path "*/aws/*" -name "*.md" | \
  grep -E "wildcard|excessive.*permission|overprivilege"
```

**Top Matches:**
1. `aws_iam_wildcard_passrole_policies_allowed.md` (Good - wildcard permissions)
2. `aws_iam_excessive_permissions_policy.md` (Good - overpermissive policies)
3. `aws_iam_role_allows_privilege_escalation.md` (Partial - escalation context)

### Example 3: Cross-Account Access

**Risk ID:** `aws-iam-cross-account-trust-misconfiguration`

**Keywords:** aws, iam, cross-account, trust

**Search:**
```bash
find $MSP_DEFINITIONS_REPO -path "*/aws/*" -name "*.md" | \
  grep -E "cross.*account|assume.*role|external.*account"
```

**Top Matches:**
1. `aws_iam_cross_account_assume_role_external_id_issue.md` (Best match)
2. `aws_iam_entire_external_account_trusted.md` (Good match)
3. `aws_iam_vendor_cross_account_assume_role_external_id_issue.md` (Partial - vendor specific)

---

## Fallback: No Good Matches

If search returns no good matches (< 50% relevance):

**Option 1:** Use generic definition template
- `aws_iam_excessive_permissions_policy.md` (catch-all for permission issues)
- `aws_iam_role_allows_privilege_escalation.md` (catch-all for escalation)

**Option 2:** Use custom definition from current directory
- List .md files in current working directory
- User selects appropriate file

**Option 3:** Skip definition
- Create risk without definition
- Add definition later via Chariot UI

---

## Definition Name Convention

**From MSP repo:**
- Filename without extension: `aws_iam_role_allows_privilege_escalation.md` → `aws_iam_role_allows_privilege_escalation`

**From custom file:**
- Risk ID becomes definition name: `aws-iam-developer-compute-identity-takeover-otm-production`

**Why this matters:** Definition name is used in CSV and must match what was uploaded to Chariot.
