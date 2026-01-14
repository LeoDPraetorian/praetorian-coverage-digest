# AWS StackSets Organization-Wide Deployment

**Comprehensive guide for deploying CloudFormation templates across AWS Organizations using StackSets with delegated administrator support.**

---

## Overview

AWS CloudFormation StackSets extends CloudFormation to enable multi-account, multi-region deployments. When integrated with AWS Organizations, StackSets automatically manages IAM roles and deploys to organizational units (OUs).

**Key Concepts:**

- **StackSet**: Container for a CloudFormation template targeting multiple accounts/regions
- **Stack Instance**: Represents each account-region pair (actual CloudFormation stack)
- **Delegated Administrator**: Member account authorized to manage StackSets organization-wide
- **CallAs Parameter**: Specifies whether operations run from management account (`SELF`) or delegated admin (`DELEGATED_ADMIN`)

---

## Permission Models

| Model | IAM Management | Use Case | AutoDeployment |
|-------|---------------|----------|----------------|
| `SERVICE_MANAGED` | Automatic (AWS creates roles) | AWS Organizations deployments | **Required** |
| `SELF_MANAGED` | Manual (you create roles) | Non-Organizations or fine-grained control | Not supported |

**Decision Guide:**

- Use `SERVICE_MANAGED` when deploying to AWS Organizations managed accounts
- Use `SELF_MANAGED` only for traditional multi-account setups without Organizations

---

## CallAs Parameter

### When to Use Each Value

| Scenario | CallAs Value | Required? | Notes |
|----------|--------------|-----------|-------|
| Management account creating SERVICE_MANAGED StackSet | `SELF` | Optional (default) | Works without specifying |
| Delegated admin account creating SERVICE_MANAGED StackSet | `DELEGATED_ADMIN` | **REQUIRED** | Fails without it |
| Any account creating SELF_MANAGED StackSet | `SELF` | N/A | CallAs doesn't apply to SELF_MANAGED |

**Critical Rule**: When deploying from a **delegated admin account** with `SERVICE_MANAGED` permission model, you **MUST** specify `CallAs: DELEGATED_ADMIN` or the deployment fails with:

```
Error: "You must be the management account or delegated admin account of an
organization before operating a SERVICE_MANAGED stack set."
```

---

## Prerequisites

### 1. Enable Trusted Access (Management Account)

```bash
aws organizations enable-aws-service-access \
  --service-principal stacksets.cloudformation.amazonaws.com
```

### 2. Register Delegated Administrator (Management Account)

```bash
aws organizations register-delegated-administrator \
  --service-principal=member.org.stacksets.cloudformation.amazonaws.com \
  --account-id="DELEGATED_ACCOUNT_ID"
```

**Limits:**
- Maximum of 5 delegated administrators per organization
- Delegated admins have full StackSet permissions (cannot scope to specific OUs)

### 3. Verify Registration

```bash
aws organizations list-delegated-administrators \
  --service-principal=member.org.stacksets.cloudformation.amazonaws.com
```

---

## Required IAM Permissions

### Delegated Administrator Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "organizations:ListDelegatedAdministrators",
        "cloudformation:CreateStackSet",
        "cloudformation:CreateStackInstances",
        "cloudformation:UpdateStackSet",
        "cloudformation:DeleteStackSet",
        "cloudformation:DeleteStackInstances",
        "cloudformation:DescribeStackSet",
        "cloudformation:DescribeStackSetOperation",
        "cloudformation:ListStackInstances",
        "cloudformation:TagResource"
      ],
      "Resource": "*"
    }
  ]
}
```

**Critical**: Must include `organizations:ListDelegatedAdministrators` or you'll get error: *"ValidationError: Account used is not a delegated administrator"*

---

## CloudFormation Template Pattern

### Complete Example with Delegated Admin Support

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: StackSet with delegated admin support

Parameters:
  Targets:
    Type: CommaDelimitedList
    Description: OUs to deploy to (leave empty for single account)
    Default: ""

  CallAsMode:
    Type: String
    Description: Deployment mode - SELF for management account, DELEGATED_ADMIN for delegated admin
    Default: "SELF"
    AllowedValues:
      - "SELF"
      - "DELEGATED_ADMIN"

Conditions:
  HasTargets: !Not [!Equals [!Select [0, !Ref Targets], ""]]

Resources:
  MyStackSet:
    Type: AWS::CloudFormation::StackSet
    Condition: HasTargets
    Properties:
      StackSetName: !Sub ${AWS::StackName}
      PermissionModel: SERVICE_MANAGED
      CallAs: !Ref CallAsMode  # Critical for delegated admin
      AutoDeployment:
        Enabled: true
        RetainStacksOnAccountRemoval: false
        # NEW (Nov 2025): Deployment ordering
        DependsOn:
          - arn:aws:cloudformation:us-east-1:123456789012:stackset/foundation-stackset:abc123
      ManagedExecution:
        Active: true
      OperationPreferences:
        FailureTolerancePercentage: 100
      StackInstancesGroup:
        - DeploymentTargets:
            OrganizationalUnitIds: !Ref Targets
          Regions:
            - !Ref AWS::Region
      TemplateBody: |
        AWSTemplateFormatVersion: '2010-09-09'
        Resources:
          ExampleRole:
            Type: AWS::IAM::Role
            Properties:
              AssumeRolePolicyDocument:
                Version: '2012-10-17'
                Statement:
                  - Effect: Allow
                    Principal:
                      Service: lambda.amazonaws.com
                    Action: sts:AssumeRole
```

---

## Terraform Pattern

### Complete Example with Delegated Admin Support

```hcl
variable "call_as" {
  description = "Deployment mode: SELF (management account) or DELEGATED_ADMIN (delegated admin account)"
  type        = string
  default     = "SELF"

  validation {
    condition     = contains(["SELF", "DELEGATED_ADMIN"], var.call_as)
    error_message = "call_as must be SELF or DELEGATED_ADMIN"
  }
}

variable "targets" {
  description = "List of OU IDs for organization deployment"
  type        = list(string)
  default     = []
}

resource "aws_cloudformation_stack_set" "example" {
  count            = length(var.targets) > 0 ? 1 : 0
  name             = "example-stackset"
  permission_model = "SERVICE_MANAGED"
  call_as          = var.call_as  # Critical for delegated admin

  auto_deployment {
    enabled                          = true
    retain_stacks_on_account_removal = false
  }

  managed_execution {
    active = true
  }

  operation_preferences {
    failure_tolerance_percentage = 100
  }

  template_body = jsonencode({
    AWSTemplateFormatVersion = "2010-09-09"
    Resources = {
      ExampleRole = {
        Type = "AWS::IAM::Role"
        Properties = {
          AssumeRolePolicyDocument = {
            Version = "2012-10-17"
            Statement = [{
              Effect = "Allow"
              Principal = {
                Service = "lambda.amazonaws.com"
              }
              Action = "sts:AssumeRole"
            }]
          }
        }
      }
    }
  })
}

# CRITICAL: Instance also needs call_as for delegated admin
resource "aws_cloudformation_stack_set_instance" "example" {
  count          = length(var.targets) > 0 ? 1 : 0
  stack_set_name = aws_cloudformation_stack_set.example[0].name
  call_as        = var.call_as  # Must match stack_set - common mistake to omit

  deployment_targets {
    organizational_unit_ids = var.targets
  }

  region = "us-east-1"
}
```

**Common Mistake**: Only adding `call_as` to `aws_cloudformation_stack_set` and forgetting to add it to `aws_cloudformation_stack_set_instance`. Both resources require the parameter.

### Terraform Import Syntax

```bash
# Import StackSet with delegated admin
terraform import aws_cloudformation_stack_set.example "example-stackset,DELEGATED_ADMIN"

# Import Instance with delegated admin
terraform import aws_cloudformation_stack_set_instance.example \
  "example-stackset,ou-xxxx-xxxxxxxx,us-east-1,DELEGATED_ADMIN"
```

---

## Common Failure Scenarios

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "You must be the management account or delegated admin account of an organization before operating a SERVICE_MANAGED stack set" | Missing `CallAs: DELEGATED_ADMIN` parameter | Add CallAs parameter to template/resource |
| "couldn't find resource" (Terraform) | Terraform lookup missing call_as | Upgrade to provider v5.47.0+ |
| "Account used is not a delegated administrator" | Missing `organizations:ListDelegatedAdministrators` permission | Add IAM permission to delegated admin role |
| "ValidationError" on terraform apply | `call_as` not on stack_set_instance | Add call_as to both stack_set AND stack_set_instance |
| Stack instances don't deploy to new accounts | AutoDeployment not enabled or missing DependsOn | Enable AutoDeployment and check dependencies |

---

## Best Practices

### 1. Use Delegated Admin Over Management Account

**Why**: Follows AWS least privilege principle. Management account should only be used for organization-level tasks, not infrastructure deployment.

**How**: Register a dedicated member account as delegated administrator for StackSets operations.

### 2. Default to SELF for Backward Compatibility

Set `CallAsMode` parameter default to `"SELF"` in templates. This ensures existing deployments from management accounts continue working without modification.

### 3. Validate Delegated Admin Registration

Before deploying from a delegated admin account, verify registration:

```bash
aws organizations list-delegated-administrators \
  --service-principal=member.org.stacksets.cloudformation.amazonaws.com \
  --query 'DelegatedAdministrators[?Id==`ACCOUNT_ID`]'
```

### 4. Use AutoDeployment for New Accounts

Enable `AutoDeployment` to automatically deploy stacks to new accounts added to targeted OUs:

```yaml
AutoDeployment:
  Enabled: true
  RetainStacksOnAccountRemoval: false
```

### 5. Implement Deployment Ordering (Nov 2025 Feature)

For foundational infrastructure, use `DependsOn` to enforce deployment sequence:

```yaml
AutoDeployment:
  Enabled: true
  RetainStacksOnAccountRemoval: false
  DependsOn:
    - arn:aws:cloudformation:us-east-1:123456789012:stackset/networking-stack:abc123
    - arn:aws:cloudformation:us-east-1:123456789012:stackset/iam-baseline:def456
```

**Limits:**
- Up to 10 dependencies per StackSet
- Up to 100 dependencies per account total
- Prevents circular dependencies with validation

---

## Limitations

### Delegated Admin Permissions

- **Cannot scope to specific OUs**: Delegated admins have full permissions to deploy to any account/OU in the organization
- **Management account cannot restrict**: No way to limit delegated admin to specific organizational units
- **Maximum 5 delegated admins**: Organization limit

### Parameter Overrides

- **OU-level only**: Service-managed StackSets only support parameter overrides at OU level, not individual accounts
- **Auto-deployment ignores overrides**: Parameter overrides don't apply to auto-deployed stacks when accounts are added to OUs
- **Account-level targeting**: Only respected during updates, not during automatic deployments

### Stack Instance Location

- **Created in management account**: StackSets with service-managed permissions are always created in the management account, even when created by delegated administrators
- **Audit trail**: Delegated admin operations are logged in management account CloudTrail

---

## New Features

### AutoDeployment.DependsOn (November 2025)

Define dependencies between StackSets to ensure deployment order:

```yaml
AutoDeployment:
  Enabled: true
  RetainStacksOnAccountRemoval: false
  DependsOn:
    - arn:aws:cloudformation:us-east-1:123456789012:stackset/foundation-stackset:abc123
```

**Use Cases:**
- Deploy networking StackSet before security StackSet
- Ensure IAM roles exist before Lambda functions
- Sequence infrastructure layers (foundation → compute → application)

**How It Works**: When accounts move between OUs or are added to your organization, StackSets automatically orchestrates deployments according to defined sequence.

### ListStackSetAutoDeploymentTargets API (March 2024)

New API to view which region/OU combinations are being auto-deployed:

```bash
aws cloudformation list-stack-set-auto-deployment-targets \
  --stack-set-name example-stackset
```

**Use Cases:**
- Audit auto-deployment configuration
- Verify which OUs have automatic provisioning enabled
- Troubleshoot deployment coverage gaps

---

## Terraform Provider Requirements

**Minimum Version**: v5.47.0 (April 2024)

**Why**: Earlier versions had bugs with delegated admin support:
- [Issue #32536](https://github.com/hashicorp/terraform-provider-aws/issues/32536): Service managed stacksets with delegated admin not working
- [Issue #23378](https://github.com/hashicorp/terraform-provider-aws/issues/23378): call_as parameter not used in lookup functions

**Upgrade Command:**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.47.0"
    }
  }
}
```

---

## Related Resources

### Official AWS Documentation

- [AWS::CloudFormation::StackSet Template Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudformation-stackset.html)
- [Register a Delegated Administrator](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-delegated-admin.html)
- [CloudFormation StackSets and AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-cloudformation.html)

### Terraform Documentation

- [aws_cloudformation_stack_set Resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack_set)
- [aws_cloudformation_stack_set_instance Resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack_set_instance)

### AWS Blogs

- [CloudFormation StackSets Delegated Administration](https://aws.amazon.com/blogs/mt/cloudformation-stacksets-delegated-administration/)
- [StackSet Dependencies (Nov 2025)](https://aws.amazon.com/blogs/devops/take-fine-grained-control-of-your-aws-cloudformation-stacksets-deployment-with-stackset-dependencies/)

### Community Resources

- [What's the deal with AWS CloudFormation StackSets? (Feb 2025)](https://blog.ekern.me/2025/02/27/aws-cloudformation-stacksets.html)
- [Managing Multi-Account Deployments with StackSets](https://itgix.com/blog/aws-organizations-with-cloudformation-stacksets/)

---

## Related Patterns

- [infrastructure-as-code.md](infrastructure-as-code.md) - Basic CloudFormation/SAM patterns
- [chariot-patterns.md](chariot-patterns.md) - Multi-tenant serverless architecture
- [security-patterns.md](security-patterns.md) - IAM best practices
