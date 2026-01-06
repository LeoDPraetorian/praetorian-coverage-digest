# AWS Security Best Practices

**Security patterns for serverless applications with AWS SDK Go v2.**

---

## IAM Best Practices

### Least Privilege

```yaml
# ❌ BAD: Wildcard permissions
- Effect: Allow
  Action: "dynamodb:*"
  Resource: "*"

# ✅ GOOD: Specific permissions
- Effect: Allow
  Action:
    - dynamodb:GetItem
    - dynamodb:PutItem
    - dynamodb:Query
  Resource: !GetAtt MyTable.Arn
```

### Resource-Level Permissions

```yaml
# DynamoDB - specific table
Resource: !GetAtt DynamoDBTable.Arn

# S3 - specific bucket and prefix
Resource: !Sub "${S3Bucket.Arn}/${TenantID}/*"
```

---

## Credential Management

### Lambda Execution Roles (Recommended)

```yaml
# SAM automatically creates execution role
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref DynamoDBTable
```

**No hardcoded credentials needed - IAM role provides temporary credentials**

### Secrets Manager for API Keys

```go
import "github.com/aws/aws-sdk-go-v2/service/secretsmanager"

func getAPIKey(ctx context.Context) (string, error) {
    client := secretsmanager.NewFromConfig(cfg)
    result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String("my-api-key"),
    })
    return *result.SecretString, err
}
```

---

## Encryption

### DynamoDB Encryption at Rest

```yaml
DynamoDBTable:
  Type: AWS::DynamoDB::Table
  Properties:
    SSESpecification:
      SSEEnabled: true
      SSEType: KMS
      KMSMasterKeyId: !Ref KMSKey
```

### S3 Encryption

```yaml
S3Bucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: aws:kms
            KMSMasterKeyID: !Ref KMSKey
```

---

## Input Validation

```go
func validateInput(input string) error {
    if len(input) == 0 || len(input) > 1000 {
        return errors.New("invalid input length")
    }
    if !regexp.MustCompile(`^[a-zA-Z0-9-]+$`).MatchString(input) {
        return errors.New("invalid characters")
    }
    return nil
}
```

---

## Audit Logging

```go
slog.Info("security event",
    "action", "DeleteAsset",
    "user", user.Email,
    "tenant", tenant,
    "resource", assetKey,
    "timestamp", time.Now().UTC(),
)
```

---

## Best Practices

1. ✅ Use IAM execution roles (not access keys)
2. ✅ Implement least privilege policies
3. ✅ Enable encryption at rest (DynamoDB, S3)
4. ✅ Use HTTPS/TLS for data in transit
5. ✅ Store secrets in Secrets Manager
6. ✅ Validate all inputs
7. ✅ Enable CloudTrail logging
8. ✅ Rotate credentials regularly
9. ❌ Never hardcode credentials
10. ❌ Never log sensitive data

---

**Source:** AWS IAM Best Practices
