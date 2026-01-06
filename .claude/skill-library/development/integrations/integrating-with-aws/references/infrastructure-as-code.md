# AWS Infrastructure as Code with SAM

**CloudFormation and SAM template patterns for serverless Go applications.**

---

## SAM Template Structure

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Runtime: provided.al2023
    Architectures:
      - arm64
    Environment:
      Variables:
        CHARIOT_TABLE: !Ref DynamoDBTable
        CHARIOT_BUCKET: !Ref S3Bucket
        AWS_REGION: !Ref AWS::Region

Resources:
  # Lambda Function
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./build
      Handler: bootstrap
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /api/assets
            Method: GET
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref DynamoDBTable
        - S3CrudPolicy:
            BucketName: !Ref S3Bucket

  # DynamoDB Table
  DynamoDBTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: username
          AttributeType: S
        - AttributeName: key
          AttributeType: S
      KeySchema:
        - AttributeName: username
          KeyType: HASH
        - AttributeName: key
          KeyType: RANGE

  # S3 Bucket
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256

Outputs:
  ApiUrl:
    Description: API Gateway endpoint
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"
```

---

## IAM Policies (Least Privilege)

```yaml
Policies:
  # DynamoDB - specific table
  - Statement:
      - Effect: Allow
        Action:
          - dynamodb:GetItem
          - dynamodb:PutItem
          - dynamodb:Query
        Resource: !GetAtt DynamoDBTable.Arn

  # S3 - specific bucket and prefix
  - Statement:
      - Effect: Allow
        Action:
          - s3:GetObject
          - s3:PutObject
        Resource: !Sub "${S3Bucket.Arn}/*"
```

---

## Environment Variables

```yaml
Environment:
  Variables:
    CHARIOT_TABLE: !Ref DynamoDBTable
    CHARIOT_BUCKET: !Ref S3Bucket
    CHARIOT_POOL: !Ref CognitoUserPool
    AWS_REGION: !Ref AWS::Region
```

---

## Deployment Commands

```bash
# Build
sam build

# Local testing
sam local start-api
sam local invoke FunctionName -e events/test.json

# Deploy
sam deploy --guided

# Hot reload
sam sync --watch
```

---

**Source:** Chariot backend/template.yml
