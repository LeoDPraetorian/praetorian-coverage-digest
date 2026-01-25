## IAM Verification Commands

### Check 6: IAM Privilege Escalation Policies

**Prowler Check**: `iam_policy_allows_privilege_escalation`

```bash
POLICY_NAME="AuthOrchCI"
ACCOUNT_ID="698932310562"
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
PROFILE="prowler-verification"

# 1. Get policy default version
DEFAULT_VERSION=$(aws iam get-policy \
    --policy-arn $POLICY_ARN \
    --profile $PROFILE \
    --query 'Policy.DefaultVersionId' \
    --output text)

# 2. Get policy document
aws iam get-policy-version \
    --policy-arn $POLICY_ARN \
    --version-id $DEFAULT_VERSION \
    --profile $PROFILE \
    --query 'PolicyVersion.Document' | jq .

# 3. Check which entities have this policy
aws iam list-entities-for-policy \
    --policy-arn $POLICY_ARN \
    --profile $PROFILE

# 4. For each attached role, check trust policy
ROLE_NAME="ci-deploy-role"
aws iam get-role \
    --role-name $ROLE_NAME \
    --profile $PROFILE \
    --query 'Role.AssumeRolePolicyDocument' | jq .

# 5. Check if SCPs restrict dangerous actions
aws organizations list-policies-for-target \
    --target-id $ACCOUNT_ID \
    --filter SERVICE_CONTROL_POLICY \
    --profile $PROFILE 2>/dev/null || echo "Not in AWS Organization or no SCP access"

# 6. Check permission boundaries
aws iam list-entities-for-policy \
    --policy-arn $POLICY_ARN \
    --profile $PROFILE \
    --query 'PolicyRoles[].[RoleName]' \
    --output text | while read role; do
        echo "Role: $role"
        aws iam get-role \
            --role-name $role \
            --profile $PROFILE \
            --query 'Role.PermissionsBoundary'
    done
```

**Common Escalation Paths to Check**:

```bash
# Path 1: iam:CreateAccessKey for other users
jq '.Statement[] | select(.Action | contains("iam:CreateAccessKey")) | select(.Resource != "arn:aws:iam::*:user/${aws:username}")'

# Path 2: iam:AttachUserPolicy or iam:AttachRolePolicy
jq '.Statement[] | select(.Action | contains("iam:AttachUserPolicy") or contains("iam:AttachRolePolicy"))'

# Path 3: lambda:CreateFunction + iam:PassRole
jq '.Statement[] | select(.Action | contains("lambda:CreateFunction"))'
jq '.Statement[] | select(.Action | contains("iam:PassRole"))'

# Path 4: iam:UpdateAssumeRolePolicy (hijack roles)
jq '.Statement[] | select(.Action | contains("iam:UpdateAssumeRolePolicy"))'

# Path 5: iam:PutUserPolicy or iam:PutRolePolicy (inline)
jq '.Statement[] | select(.Action | contains("iam:PutUserPolicy") or contains("iam:PutRolePolicy"))'
```

**Validation Criteria**:

- TRUE POSITIVE if dangerous action has `Resource: "*"` AND no permission boundary
- FALSE POSITIVE if action restricted to specific resources (e.g., `${aws:username}`)
- MITIGATED if SCP denies the escalation action

---

## Lambda Verification Commands

### Check 7: Lambda Secrets in Environment Variables

**Prowler Check**: `awslambda_function_no_secrets_in_variables`

```bash
FUNCTION_NAME="datadog-forwarder"
PROFILE="prowler-verification"

# 1. Get Lambda environment variables
aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --profile $PROFILE \
    --query 'Environment.Variables' | jq .

# 2. Get function details (runtime, role, VPC)
aws lambda get-function \
    --function-name $FUNCTION_NAME \
    --profile $PROFILE \
    --query 'Configuration.[FunctionName,Runtime,Role,VpcConfig]'

# 3. Check if function execution role has Secrets Manager access
ROLE_ARN=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --profile $PROFILE \
    --query 'Role' \
    --output text)

ROLE_NAME=$(echo $ROLE_ARN | awk -F'/' '{print $NF}')

aws iam list-attached-role-policies \
    --role-name $ROLE_NAME \
    --profile $PROFILE

# 4. Check Lambda environment variable encryption
aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --profile $PROFILE \
    --query 'KMSKeyArn'
```

**Manual Review Required**:

For each environment variable, categorize:

```bash
# Extract and review
aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --profile $PROFILE \
    --query 'Environment.Variables' | \
    jq -r 'to_entries[] | "\(.key)=\(.value | .[0:20])..."'
```

**Classification**:

| Variable Name               | True Secret | False Positive |
| --------------------------- | ----------- | -------------- |
| `DD_API_KEY`                | ✅ Yes      |                |
| `STRIPE_SECRET_KEY`         | ✅ Yes      |                |
| `DB_PASSWORD`               | ✅ Yes      |                |
| `API_ENDPOINT`              |             | ❌ URL         |
| `LOG_LEVEL`                 |             | ❌ Config      |
| `FEATURE_FLAG_ENABLED`      |             | ❌ Boolean     |
| `TIMEOUT_SECONDS`           |             | ❌ Number      |

---

## CloudFormation Verification Commands

### Check 8: CloudFormation Secrets in Outputs

**Prowler Check**: `cloudformation_stack_outputs_find_secrets`

```bash
STACK_NAME="sls-auth-orch-prod-immediate"
PROFILE="prowler-verification"

# 1. Get stack outputs
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs' | jq .

# 2. Get full stack details
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --profile $PROFILE

# 3. Check stack parameters (may also contain secrets)
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --profile $PROFILE \
    --query 'Stacks[0].Parameters'

# 4. Get stack template to see original output definitions
aws cloudformation get-template \
    --stack-name $STACK_NAME \
    --profile $PROFILE \
    --query 'TemplateBody' | jq '.Outputs'
```

**Manual Review**:

For each output, determine if it's a secret:

```json
{
    "OutputKey": "DatabaseEndpoint",
    "OutputValue": "mydb.abc.us-east-1.rds.amazonaws.com"
}
```

- **FALSE POSITIVE**: Endpoint/ARN (public metadata, not secret)

```json
{
    "OutputKey": "ApiKey",
    "OutputValue": "sk_live_51HqL2J..."
}
```

- **TRUE POSITIVE**: API key/secret (sensitive credential)

---

## RDS Verification Commands

### Check 9: RDS Public Access

**Prowler Check**: `rds_instance_no_public_access`

```bash
DB_INSTANCE_ID="production-db-1"
PROFILE="prowler-verification"

# 1. Check if RDS is publicly accessible
aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --profile $PROFILE \
    --query 'DBInstances[0].[PubliclyAccessible,Endpoint.Address,VpcSecurityGroups]'

# 2. Get security group rules
SG_ID=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --profile $PROFILE \
    --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
    --output text)

aws ec2 describe-security-groups \
    --group-ids $SG_ID \
    --profile $PROFILE \
    --query 'SecurityGroups[0].IpPermissions'

# 3. Test external connectivity (if public)
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --profile $PROFILE \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

DB_PORT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --profile $PROFILE \
    --query 'DBInstances[0].Endpoint.Port' \
    --output text)

nc -zv $DB_ENDPOINT $DB_PORT
```

**Validation**:

- TRUE POSITIVE if `PubliclyAccessible=true` AND security group allows 0.0.0.0/0
- FALSE POSITIVE if `PubliclyAccessible=true` BUT security group restricts to specific IPs

---

## Batch Verification Scripts
