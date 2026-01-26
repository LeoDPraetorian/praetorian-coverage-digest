---
name: adding-chariot-findings
description: Use when creating security findings/risks in Chariot - collects finding details via interactive questions, generates CSV for bulk mode, executes via praetorian chariot script add-finding --bulk. Optimized for AWS/IAM assets, supports definition files and evidence attachments.
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, Write, AskUserQuestion
---

# Adding Chariot Findings (Bulk Mode)

**Interactive workflow that generates CSV and uses bulk mode of `praetorian chariot script add-finding` to create risks with AWS/IAM assets, definitions, and evidence.**

## When to Use

**Trigger phrases:**

- "Create a Chariot risk for this finding"
- "Add this IAM privilege escalation to Chariot"
- "Document this AWS security issue in Chariot"
- "Create finding in Chariot with evidence"

**Use when:**

- Security triage identified vulnerability to document
- Need to create risk with AWS/IAM asset (role, user, Lambda, account)
- Have evidence files to attach (diagrams, scripts, reports)
- Want to set risk to "discovered" state (TC status)

**DO NOT use for:**

- Querying existing risks (use Chariot MCP)
- Non-AWS findings (this workflow optimized for AWS ARNs)
- Automated bulk import of many findings (use CSV directly)

---

## What This Skill Does

For complete workflow overview and bulk mode advantages, see [references/skill-overview.md](references/skill-overview.md).

**Quick summary:**
- Collects risk details via interactive questions
- Generates CSV for bulk mode
- Executes non-interactive bulk import
- Creates risk with AWS/IAM assets, definitions, and evidence

---

## Prerequisites

### Required

- Praetorian CLI authenticated with profile
- Finding details (risk ID, asset ARN, severity)
- Optional: Definition file (markdown writeup)
- Optional: Evidence files (diagrams, scripts, reports)

### Verify

```bash
praetorian --version
praetorian --profile $PROFILE chariot script add-finding --help
```

---

## Workflow

> **IMPORTANT**: Use TodoWrite to track phases. Create todos for all 10 phases (Phase 0-9) before starting.

### Phase 0: Setup

**Ask user via AskUserQuestion:**

**Question 1: Praetorian CLI Profile**

```
Question: "Which Praetorian CLI profile should be used?"
Header: "Profile"
Options:
- "Detect from context" → Look for profile in current session/commands
- "Specify manually" → User provides profile name

Example: "ClientA", "Production", "Development"
```

**Question 2: MSP Definitions Repository**

```
Question: "Where is the MSP definitions repository located?"
Header: "MSP Definitions"
Options:
- "Default: ~/Desktop/msp-definitions" → Standard location
- "Custom location" → User provides path

Note: Repository contains standardized vulnerability definitions for reuse.
Example: ~/Desktop/msp-definitions
```

**Question 3: Scripts Directory Location**

```
Question: "Where is the praetorian-cli scripts directory located?"
Header: "Scripts Path"
Options:
- "Default location" → ~/Desktop/praetorian-cli/praetorian_cli/scripts/commands/
- "Custom location" → User provides path

Note: This is required for the add-finding script to work.
```

**Set environment variables:**

```bash
export PRAETORIAN_PROFILE="profile-name"  # e.g., "ClientA", "Production"
export MSP_DEFINITIONS_REPO="/path/to/msp-definitions"  # e.g., ~/Desktop/msp-definitions
export PRAETORIAN_SCRIPTS_PATH="/path/to/praetorian_cli/scripts/commands/"
```

**Verify script exists:**

```bash
# Check if add-finding.py or add_finding.py exists
if [ -f "${PRAETORIAN_SCRIPTS_PATH}/add-finding.py" ]; then
  echo "✓ Found: ${PRAETORIAN_SCRIPTS_PATH}/add-finding.py"
elif [ -f "${PRAETORIAN_SCRIPTS_PATH}/../add_finding.py" ]; then
  echo "✓ Found: ${PRAETORIAN_SCRIPTS_PATH}/../add_finding.py"
  export PRAETORIAN_SCRIPTS_PATH="${PRAETORIAN_SCRIPTS_PATH}/.."
else
  echo "❌ add-finding script not found"
  echo "Please provide correct path"
  exit 1
fi

# Verify the script command works
praetorian chariot script add-finding --help 2>&1 | head -5
```

**Navigate to directory with evidence files:**

Ask user for the working directory containing evidence files, or detect from current context.

```bash
cd /path/to/hunting-output-directory
```

Example: `~/Desktop/client-vault/Hunt-2026/Cloud-Attack-Surface/AWS-Report/hunting-output-20260112`

---

### Phase 1: Identify Definition File

**IMPORTANT: Select definition FIRST, then derive risk ID from it.**

**For client-specific findings, definitions live in the msp-definitions GitHub repository.**

**Ask user via AskUserQuestion:**

```
Question: "Does a definition already exist for this finding type?"
Header: "Definition"
Options:
- "Yes, use existing MSP definition" → Search msp-definitions repo
- "No, need to create new definition" → Create PR to msp-definitions repo first
- "Skip definition" → Create risk without definition
```

**If Using Existing Definition:**

Search the MSP definitions repo for definitions matching the vulnerability type:

```bash
# Search for relevant definitions based on keywords or user description
# Example: For IAM privilege escalation, search for:
find $MSP_DEFINITIONS_REPO -name "*.md" | grep -E "iam|privilege|escalation|compute|wildcard"
```

Present matching definitions to user via AskUserQuestion, sorted by relevance:

```
Question: "Select a definition file from MSP definitions repository"
Header: "Definition"
Options:
- "aws_iam_role_allows_privilege_escalation (Best match)"
- "aws_iam_wildcard_passrole_policies_allowed"
- "aws_iam_excessive_permissions_policy"
```

**If Creating New Definition:**

**CRITICAL: Client-specific findings require creating a PR to the msp-definitions repository.**

1. Create definition markdown file following MSP template
2. Create PR to: https://github.com/praetorian-inc/msp-definitions/tree/main/definitions/cloud
3. After PR is merged, the definition becomes available for use
4. **Wait for PR to be merged before proceeding with bulk import**

**Store:** `DEFINITION_NAME="definition-filename"` (e.g., `aws_iam_role_allows_privilege_escalation`)

---

### Phase 2: Derive Risk ID from Definition

**Risk ID is automatically derived from the definition filename.**

**Conversion rule:** Replace underscores with hyphens

**Example:**
- Definition file: `aws_iam_developer_compute_identity_takeover`
- Risk ID: `aws-iam-developer-compute-identity-takeover`

**Store:** `RISK_ID="${DEFINITION_NAME//_/-}"` (convert underscores to hyphens)

---

### Phase 3: Collect Risk Status

**Ask user via AskUserQuestion:**

```
Question: "Select risk severity status"
Header: "Risk Status"
Options:
- "TC - Triage Critical (Recommended for critical discovered findings)"
- "TH - Triage High"
- "TM - Triage Medium"
- "TL - Triage Low"
- "TI - Triage Informational"

Note: For "discovered" (not yet demonstrated) state, use TC or TH.
```

**Store:** `RISK_STATUS="TC"`

---

### Phase 4: Collect Asset Information

**AWS/IAM assets require full ARN.**

**Ask user via AskUserQuestion:**

**Question 1: Asset Type**

```
Question: "What type of asset is this finding associated with?"
Header: "Asset Type"
Options:
- "IAM Role" → arn:aws:iam::ACCOUNT:role/ROLE_NAME
- "IAM User" → arn:aws:iam::ACCOUNT:user/USER_NAME
- "Lambda Function" → arn:aws:lambda:REGION:ACCOUNT:function:NAME
- "AWS Account" → arn:aws:iam::ACCOUNT:root
- "Custom ARN" → User provides full ARN
```

**Question 2: AWS ARN**

```
Question: "Enter the AWS ARN for this asset"
Header: "ARN"
Options:
- "Use detected ARN" → [If we can parse from analysis]
- "Enter manually" → User provides
```

**Question 3: Surface Classification**

```
Question: "Select attack surface classification"
Header: "Surface"
Options:
- "cloud (Recommended for AWS)"
- "internal"
- "external"
- "api"
- "web"
```

**Store:**

- `ASSET_ARN="arn:aws:iam::ACCOUNT:role/ROLE_NAME"`
- `ASSET_TYPE="aws"`
- `ASSET_SURFACE="cloud"`

---

### Phase 5: Identify Evidence Files

**IMPORTANT: Evidence files are customized finding data demonstrating verification and impact.**

Evidence files should NOT be arbitrary attachments. They should follow a structured format with:
- **Auxiliary Information**: Context about the specific finding instance
- **Verification and Proof**: Demonstrated validation (commands, outputs, screenshots)
- **Impact Assessment**: Business and technical consequences
- **Steps to Reproduce**: Environment-agnostic commands for client validation

**For complete evidence file format specification, see [references/evidence-file-format.md](references/evidence-file-format.md).**

Ask user via AskUserQuestion if they want to add evidence files. If yes, list available files or ask for paths.

**For multiple evidence files:**

- Bulk mode CSV supports ONE evidence_file per row
- For multiple files: Create multiple CSV rows with same risk_id, different evidence files
- **Best practice**: Primary evidence as markdown (EVIDENCE.md), supplemented by diagrams/scripts

**Store:** `EVIDENCE_FILES=("./EVIDENCE.md" "./attack-chain.svg" "./commands.sh")`

---

### Phase 6: Generate CSV File

**CSV format:**

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
```

**Generate CSV content:**

```bash
# Create CSV file
cat > findings-bulk.csv <<'EOF'
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
aws-iam-privesc,arn:aws:iam::123:role/Role,aws,cloud,TC,aws-iam-privesc,./diagram.svg
EOF
```

**For multiple evidence files, generate multiple rows:**

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
aws-iam-privesc,arn:aws:iam::123:role/Role,aws,cloud,TC,aws-iam-privesc,./diagram.svg
aws-iam-privesc,arn:aws:iam::123:role/Role,aws,cloud,TC,,./commands.sh
aws-iam-privesc,arn:aws:iam::123:role/Role,aws,cloud,TC,,./analysis.md
```

**Note:**

- First row has definition_name populated
- Subsequent rows have empty definition_name (already associated)
- All rows have same risk_id and asset (creates one risk with multiple evidence files)

---

### Phase 7: Review and Confirm

**Show CSV preview:**

```bash
cat findings-bulk.csv
```

**Display summary of what will be created** (asset, risk, definition, evidence count).

**Ask for confirmation via AskUserQuestion:**

```
Question: "Proceed with creating this finding in Chariot?"
Header: "Confirm"
Options:
- "Yes, execute bulk import"
- "No, cancel"
```

---

### Phase 8: Execute Bulk Import

**IMPORTANT: Definitions must already exist in Chariot (via merged PR to msp-definitions repo).**

**Pre-execution checklist:**

1. ✅ Definition PR merged to msp-definitions repo (if using definition)
2. ✅ PRAETORIAN_SCRIPTS_PATH environment variable set
3. ✅ All evidence files exist in current directory
4. ✅ CSV generated and reviewed

**Execute Bulk Import:**

```bash
echo "y" | praetorian --profile $PRAETORIAN_PROFILE chariot script add-finding \
  --bulk findings-bulk.csv
```

**What happens:**

1. Script parses CSV and validates data
2. Creates AWS assets via SDK (supports ARNs)
3. Creates risk and associates with asset
4. Associates definition by name (definition must already exist in Chariot from msp-definitions repo)
5. Uploads evidence files

**For complete execution details, expected output, and troubleshooting, see [references/execution-workflow.md](references/execution-workflow.md).**

---

### Phase 9: Verify Creation

**Check risk was created:**

```bash
praetorian --profile $PRAETORIAN_PROFILE chariot list risks 2>&1 | \
  grep "risk-id-pattern"
```

**Output risk key for reference:**

```
Risk created:
  Risk Key: #risk#...
  Status: TC (Triage Critical - Discovered)
  Asset: #asset#...
  Definition: [definition_name]
  Evidence: N files in evidence/{risk_key}/
```

---

## CSV Format Specification

For complete CSV format specification including asset types, validation rules, multi-evidence patterns, and templates, see [references/csv-format.md](references/csv-format.md).

---

## Risk Status Guide

For complete risk status codes, severity guidelines, and state transition workflows, see [references/risk-status-guide.md](references/risk-status-guide.md).

**Quick reference:** TI (Info) < TL (Low) < TM (Medium) < TH (High) < TC (Critical)

---

## Error Prevention

**Before executing bulk import, verify all prerequisites.** See [references/execution-workflow.md](references/execution-workflow.md) for complete checklist and file validation commands.

---

## Integration

### Called By

- User request: "Create Chariot risk"
- After security triage completion
- Post-vulnerability analysis

### Requires (invoke before starting)

| Skill                   | When | Purpose                 |
| ----------------------- | ---- | ----------------------- |
| None - standalone skill | N/A  | Self-contained workflow |

### Calls (during execution)

| Tool            | Phase     | Purpose                         |
| --------------- | --------- | ------------------------------- |
| AskUserQuestion | Phase 1-3 | Collect risk metadata           |
| Bash            | Phase 4-7 | CSV generation, file validation |
| Praetorian CLI  | Phase 6   | Bulk import execution           |

### Pairs With (conditional)

| Skill | Trigger | Purpose |
| ----- | ------- | ------- |
| None  | N/A     | N/A     |

**Note:** This skill is designed to be invoked after security triage workflows (IAM analysis, privilege escalation detection, cross-account enumeration). Future triage skills will be added to this section as they're developed.

---

## Key Principles

✅ **Bulk mode over interactive** - Non-interactive, Claude-friendly
✅ **CSV generation** - Claude generates proper format from user inputs
✅ **Multi-evidence via multi-row** - Same risk_id, different evidence_file
✅ **AWS asset support** - Bulk mode uses SDK (supports ARNs)
✅ **Validation before execution** - Check files exist, show preview
✅ **Single command execution** - No complex terminal interaction

---

## Related Skills

- `hunting-apollo-privilege-escalation-risks` - Triage workflow that generates findings
- Gateway access: Via `gateway-security` for security workflow routing
