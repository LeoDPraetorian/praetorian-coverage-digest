# Execution Workflow

**Detailed execution steps for bulk import.**

---

## Execution Process

**IMPORTANT: Definitions must already exist in Chariot (via merged PR to msp-definitions repo).**

### Pre-execution Checklist

Before running bulk import:

1. ✅ Definition PR merged to https://github.com/praetorian-inc/msp-definitions (if using definition)
2. ✅ Risk ID matches definition filename from msp-definitions repo
3. ✅ PRAETORIAN_SCRIPTS_PATH environment variable set
4. ✅ All evidence files exist in current directory
5. ✅ CSV generated and reviewed

### Execute Bulk Import

```bash
# Requires PRAETORIAN_SCRIPTS_PATH to be exported
export PRAETORIAN_SCRIPTS_PATH="/path/to/praetorian_cli/scripts/commands/"

# Run bulk import with confirmation
echo "y" | praetorian --profile $PRAETORIAN_PROFILE chariot script add-finding \
  --bulk findings-bulk.csv
```

**What happens (non-interactive with 'y' piped):**

1. Script parses CSV (validates columns and data)
2. Displays processing summary
3. Asks for confirmation (receives 'y' from pipe)
4. For each row:
   - Creates asset if needed (via SDK - supports AWS ARNs)
   - Creates risk association
   - Associates definition (if definition_name populated)
   - Uploads evidence file (if evidence_file specified)
5. Shows progress per row
6. Displays final summary

---

## Expected Output

```
🔍 Bulk Add Finding - CSV Processing Mode
==================================================
✓ Parsed 2 finding(s) from CSV

📋 Processing summary:
  • 2 total asset-risk associations
  • 1 unique risk IDs
  • 2 new assets to create
  • 2 evidence files to upload

Proceed with bulk processing? [y/N]:

🔄 Processing risk: aws-iam-developer-compute-identity-takeover-otm-production
  ✓ Created asset: #asset#role/aws_example_prd_developers#arn:aws:iam::111111111111:role/aws_example_prd_developers
  ✓ Created asset: #asset#role/aws_example_prd_developers#arn:aws:iam::111111111111:role/aws_example_prd_developers
  ✓ Associated risk 'aws-iam-developer-compute-identity-takeover-otm-production' with asset
    ✓ Associated definition: aws-iam-developer-compute-identity-takeover-otm-production
  ✓ Evidence uploaded: attack-chain-complete.svg -> evidence/#risk#...
    ✓ Uploaded evidence: attack-chain-complete.svg
  ✓ Associated risk 'aws-iam-developer-compute-identity-takeover-otm-production' with asset
  ✓ Evidence uploaded: RAW-COMMANDS.sh -> evidence/#risk#...
    ✓ Uploaded evidence: RAW-COMMANDS.sh

✅ Bulk processing completed!
Successfully processed 2 out of 2 asset-risk associations
```

---

## Verification Commands

After bulk import completes, verify the risk was created:

```bash
# List risks to find the new one
praetorian --profile $PRAETORIAN_PROFILE chariot list risks 2>&1 | \
  grep "aws-iam-developer-compute-identity-takeover"

# Expected output:
# #risk#role/aws_example_prd_developers#aws-iam-developer-compute-identity-takeover-otm-production
```

---

## Before Execution Checklist

Verify all prerequisites before running bulk import:

- [ ] Current directory contains all evidence files
- [ ] Definition file exists in MSP definitions repo or current directory
- [ ] All evidence file paths in CSV are correct (relative to current dir)
- [ ] CSV has no empty required fields
- [ ] asset_type is "aws" for AWS resources
- [ ] asset_value is full valid ARN
- [ ] risk_status is one of: TI, TL, TM, TH, TC
- [ ] Praetorian CLI authenticated with profile
- [ ] PRAETORIAN_SCRIPTS_PATH environment variable set
- [ ] MSP_DEFINITIONS_REPO environment variable set

**Verify files exist:**

```bash
# Check definition from MSP repo
ls -lh $MSP_DEFINITIONS_REPO/cloud-security/findings/aws/selected-definition.md

# Check evidence files
ls -lh ./diagram.svg ./commands.sh ./analysis.md
```

---

## Common Execution Issues

### Issue 1: "No such command 'add-finding'"

**Cause:** `PRAETORIAN_SCRIPTS_PATH` not exported

**Fix:**
```bash
export PRAETORIAN_SCRIPTS_PATH="/path/to/praetorian_cli/scripts/commands/"
```

### Issue 2: "Definition not found"

**Cause:** Definition doesn't exist in Chariot yet

**Fix:** Ensure PR to msp-definitions repo is merged, or wait for the definition to sync to Chariot

### Issue 3: "Evidence file not found"

**Cause:** Evidence file path in CSV is incorrect or file doesn't exist

**Fix:** Verify file paths are relative to current working directory:
```bash
ls -lh ./attack-chain-complete.svg ./RAW-COMMANDS.sh
```

### Issue 4: Confirmation prompt hangs

**Cause:** Bulk script asks for confirmation even though it's supposed to be non-interactive

**Fix:** Pipe 'y' to the command:
```bash
echo "y" | praetorian --profile $PROFILE chariot script add-finding --bulk findings.csv
```
