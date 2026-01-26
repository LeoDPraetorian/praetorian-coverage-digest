# CSV Format Specification

**Complete CSV format for Chariot bulk mode risk creation.**

---

## Required Columns

| Column          | Type   | Description                        | Example                               |
| --------------- | ------ | ---------------------------------- | ------------------------------------- |
| `risk_id`       | string | Unique risk identifier             | `aws-iam-developer-lambda-privesc`    |
| `asset_value`   | string | Asset identifier (ARN for AWS)     | `arn:aws:iam::111111111111:role/Role` |
| `asset_type`    | string | Asset type (aws, dns-ip, dns-dns)  | `aws`                                 |
| `asset_surface` | string | Surface classification             | `cloud`                               |
| `risk_status`   | string | Risk severity (TI, TL, TM, TH, TC) | `TC`                                  |

## Optional Columns

| Column            | Type   | Description                             | Example                            |
| ----------------- | ------ | --------------------------------------- | ---------------------------------- |
| `definition_name` | string | Risk definition (empty after first row) | `aws-iam-privesc` (first row only) |
| `evidence_file`   | string | Path to evidence file                   | `./attack-chain.svg`               |

---

## Asset Type Parsing

### AWS Assets

**asset_type:** `aws`
**asset_value:** Full ARN

**Parsing by script:**

```python
# ARN: arn:aws:iam::111111111111:role/aws_example_prd_developers
# Splits by ':'
# asset_name = last colon field = "role/aws_example_prd_developers"
# identifier = full ARN
# Creates: sdk.assets.add(name="role/aws_example_prd_developers", identifier=ARN, surface="cloud")
# Result: #asset#role/aws_example_prd_developers#arn:aws:iam::111111111111:role/aws_example_prd_developers
```

**Supported AWS ARN formats:**

- IAM Role: `arn:aws:iam::ACCOUNT:role/ROLE_NAME`
- IAM User: `arn:aws:iam::ACCOUNT:user/USER_NAME`
- Lambda: `arn:aws:lambda:REGION:ACCOUNT:function:NAME`
- Account: `arn:aws:iam::ACCOUNT:root`
- Any AWS resource with standard ARN format

### DNS + IP Assets

**asset_type:** `dns-ip`
**asset_value:** `dns_record|ip_address`

**Example:**

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
sql-injection-login,example.com|1.2.3.4,dns-ip,external,TH,sql-injection-def,./evidence.png
```

### DNS + DNS Assets

**asset_type:** `dns-dns`
**asset_value:** `dns_record|dns_identifier`

**Example:**

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
subdomain-takeover,app.example.com|app.example.com,dns-dns,external,TM,subdomain-takeover-def,
```

---

## Multiple Evidence Files Pattern

**To attach multiple evidence files to one risk:**

**Generate multiple CSV rows with:**

- ✅ Same risk_id
- ✅ Same asset_value
- ✅ definition_name populated ONLY in first row
- ✅ Different evidence_file per row

**Example:**

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
finding-123,arn:aws:iam::123:role/Role,aws,cloud,TC,finding-123-def,./diagram.svg
finding-123,arn:aws:iam::123:role/Role,aws,cloud,TC,,./commands.sh
finding-123,arn:aws:iam::123:role/Role,aws,cloud,TC,,./analysis.md
```

**Script behavior:**

- Creates asset once (first row)
- Creates risk once (first row)
- Uploads definition once (first row)
- Uploads evidence file per row (3 files total)
- All evidence goes to: `evidence/{risk_key}/`

---

## Evidence File Path Handling

**Paths in CSV can be:**

- Absolute: `/full/path/to/file.svg`
- Relative to current directory: `./attack-chain.svg`
- Relative to home: `~/Documents/evidence.md`

**Script automatically:**

- Expands `~` to home directory
- Resolves relative paths from current working directory
- Validates files exist before processing
- Fails with clear error if file not found

**Best practice:** Use relative paths from analysis output directory

```csv
evidence_file
./attack-chain-complete.svg
./RAW-COMMANDS.sh
./CROSS-ACCOUNT-LATERAL-MOVEMENT.md
```

---

## Multi-Account Findings Pattern

**For findings affecting multiple accounts:**

**Option A: One risk per account**

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
aws-iam-privesc-example-prod,arn:aws:iam::111111111111:role/Role1,aws,cloud,TC,aws-iam-privesc,./evidence.svg
aws-iam-privesc-legacy-example,arn:aws:iam::222222222222:role/Role2,aws,cloud,TC,aws-iam-privesc,./evidence.svg
```

**Option B: Multiple assets for one risk (recommended)**

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
aws-iam-cross-account-lateral,arn:aws:iam::111111111111:role/Role1,aws,cloud,TC,cross-account-def,./diagram.svg
aws-iam-cross-account-lateral,arn:aws:iam::222222222222:role/Role2,aws,cloud,TC,,./diagram.svg
aws-iam-cross-account-lateral,arn:aws:iam::333333333333:role/Role3,aws,cloud,TM,,./diagram.svg
```

**Result:** One risk linked to 3 assets in 3 different accounts

---

## Validation Rules

**Script validates:**

- ✅ All required columns present
- ✅ risk_status in [TI, TL, TM, TH, TC]
- ✅ asset_type in [aws, dns-ip, dns-dns]
- ✅ asset_surface in [external, internal, web, api, cloud]
- ✅ asset_value format matches asset_type
- ✅ evidence_file exists (if provided)

**Common errors:**

```
❌ Row 2: Missing required field 'risk_id'
❌ Row 3: Invalid asset_type 'iam'. Must be one of: ['aws', 'dns-ip', 'dns-dns']
❌ Row 4: Evidence file not found: ./missing-file.svg
❌ Row 5: Invalid ARN format. Expected: arn:aws:service:region:account:resource
```

---

## CSV Templates

### Template 1: Single IAM Privilege Escalation

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
aws-iam-developer-lambda-privesc,arn:aws:iam::111111111111:role/Role,aws,cloud,TC,aws-iam-developer-lambda-privesc,./attack-chain.svg
aws-iam-developer-lambda-privesc,arn:aws:iam::111111111111:role/Role,aws,cloud,TC,,./verification-commands.sh
aws-iam-developer-lambda-privesc,arn:aws:iam::111111111111:role/Role,aws,cloud,TC,,./cross-account-analysis.md
```

### Template 2: Multi-Account Impact

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
aws-iam-cross-account-privesc,arn:aws:iam::111111111111:role/Role1,aws,cloud,TC,cross-account-def,./diagram.svg
aws-iam-cross-account-privesc,arn:aws:iam::222222222222:role/Role2,aws,cloud,TC,,./diagram.svg
aws-iam-cross-account-privesc,arn:aws:iam::333333333333:role/Role3,aws,cloud,TM,,./diagram.svg
```

### Template 3: Federated Roles Pattern

```csv
risk_id,asset_value,asset_type,asset_surface,risk_status,definition_name,evidence_file
federated-sandbox-self-escalation,arn:aws:iam::555555555555:role/Role1,aws,cloud,TC,federated-sandbox-def,./evidence.svg
federated-sandbox-self-escalation,arn:aws:iam::444444444444:role/Role2,aws,cloud,TC,,./evidence.svg
federated-sandbox-self-escalation,arn:aws:iam::666666666666:role/Role3,aws,cloud,TC,,./evidence.svg
```
