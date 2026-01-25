# AWS CLI Verification Commands Reference

**Master index for verifying Prowler findings to eliminate false positives.**

## Overview

This reference is split into four focused documents to maintain readability and comply with progressive disclosure limits:

| File | Content | Line Count |
|------|---------|------------|
| [verification-core.md](verification-core.md) | Prerequisites, S3, EC2, Route53 verification commands | ~300 lines |
| [verification-iam-lambda.md](verification-iam-lambda.md) | IAM, Lambda, CloudFormation, RDS verification commands | ~265 lines |
| [verification-automation.md](verification-automation.md) | Batch scripts, error handling, best practices | ~118 lines |
| [verification-workflow.md](verification-workflow.md) | Complete resource list requirements, verification workflow, templates | ~106 lines |

## Quick Navigation

### By AWS Service

- **S3 Buckets** → [verification-core.md](verification-core.md#s3-verification-commands)
- **EC2 Security Groups** → [verification-core.md](verification-core.md#ec2-verification-commands)
- **Route53 DNS** → [verification-core.md](verification-core.md#route53-verification-commands)
- **IAM Policies** → [verification-iam-lambda.md](verification-iam-lambda.md#iam-verification-commands)
- **Lambda Functions** → [verification-iam-lambda.md](verification-iam-lambda.md#lambda-verification-commands)
- **CloudFormation** → [verification-iam-lambda.md](verification-iam-lambda.md#cloudformation-verification-commands)
- **RDS Databases** → [verification-iam-lambda.md](verification-iam-lambda.md#rds-verification-commands)

### By Task

- **Setup & Prerequisites** → [verification-core.md](verification-core.md#prerequisites)
- **Batch Verification** → [verification-automation.md](verification-automation.md#batch-verification-scripts)
- **Error Handling** → [verification-automation.md](verification-automation.md#error-handling)
- **Resource List Requirements** → [verification-workflow.md](verification-workflow.md#complete-resource-list-requirement)
- **Verification Workflow** → [verification-workflow.md](verification-workflow.md#verification-workflow-summary)
- **Documentation Templates** → [verification-workflow.md](verification-workflow.md#verification-tracking-template)

## Usage Pattern

1. **Start with prerequisites**: [verification-core.md](verification-core.md#prerequisites) for AWS profile setup
2. **Run service-specific verifications**: Use command references for each service
3. **Automate at scale**: [verification-automation.md](verification-automation.md) for batch processing
4. **Document findings**: [verification-workflow.md](verification-workflow.md) for report templates

## Common Workflow Example

```bash
# 1. Setup (once per engagement)
# See verification-core.md#prerequisites

# 2. Verify S3 findings
# See verification-core.md#s3-verification-commands

# 3. Verify Lambda secrets
# See verification-iam-lambda.md#lambda-verification-commands

# 4. Document results
# See verification-workflow.md#verification-tracking-template
```

## Integration

This reference suite is called from:
- **SKILL.md Phase 4**: Verify Critical Findings
- **secret-classification.md Step 4**: Verification Commands
- **business-risk-framework.md**: Verification evidence requirements
