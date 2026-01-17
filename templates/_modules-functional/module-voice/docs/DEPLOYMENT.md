# module-voice Deployment Guide

Complete deployment instructions for the Voice module, including infrastructure provisioning, database setup, and deployment procedures.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Infrastructure Deployment](#infrastructure-deployment)
- [Database Setup](#database-setup)
- [Lambda Deployment](#lambda-deployment)
- [ECS Deployment](#ecs-deployment)
- [Frontend Integration](#frontend-integration)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Infrastructure

Before deploying module-voice, ensure the following are in place:

| Prerequisite | Description |
|--------------|-------------|
| CORA Project | A CORA project created via `create-cora-project.sh` |
| module-access | Core access module deployed and functional |
| module-ai | AI module deployed (for LLM credentials) |
| module-mgmt | Management module deployed (for health checks) |
| module-kb | Knowledge base module (for KB grounding) |
| Supabase | Database provisioned with service key |
| AWS Account | With permissions for Lambda, ECS, S3, SQS, Secrets Manager |

### Required Credentials

Obtain API keys for external services:

| Service | Purpose | Get Key From |
|---------|---------|--------------|
| Daily.co | WebRTC video rooms | [daily.co/dashboard](https://dashboard.daily.co) |
| Deepgram | Speech-to-text | [console.deepgram.com](https://console.deepgram.com) |
| Cartesia | Text-to-speech | [cartesia.ai](https://cartesia.ai) |

### Tools Required

```bash
# Verify required tools
terraform --version  # >= 1.5.0
aws --version        # >= 2.0.0
python3 --version    # >= 3.11
pnpm --version       # >= 8.0.0
```

---

## Infrastructure Deployment

### Step 1: Copy Module to Project

If not already included during project creation:

```bash
# From cora-dev-toolkit root
cp -r templates/_modules-functional/module-voice \
  ~/code/{project}-stack/cora-modules/module-voice
```

### Step 2: Configure Terraform Variables

Create or update `terraform.tfvars` in your infra project:

```hcl
# module-voice variables
voice_module_enabled = true

# ECS Configuration
ecs_cluster_name     = "pipecat-cluster"
ecs_subnets          = ["subnet-abc123", "subnet-def456"]
ecs_security_groups  = ["sg-xyz789"]

# S3 Configuration
transcript_bucket_name = "{project}-voice-transcripts-dev"

# Optional: Standby Bot Pool
standby_pool_enabled = true
standby_sqs_queue_url = "" # Created by Terraform
```

### Step 3: Deploy Infrastructure

```bash
cd ~/code/{project}-infra

# Initialize Terraform (if needed)
terraform init

# Review planned changes
./scripts/deploy-terraform.sh dev --plan

# Apply infrastructure
./scripts/deploy-terraform.sh dev
```

### Step 4: Verify Resources Created

```bash
# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `voice`)]'

# Check S3 bucket
aws s3 ls | grep voice-transcripts

# Check ECS cluster
aws ecs describe-clusters --clusters pipecat-cluster
```

---

## Database Setup

### Step 1: Run Schema Migrations

Execute the schema files in order:

```bash
cd ~/code/{project}-stack/cora-modules/module-voice/db/schema

# Run each migration
psql $SUPABASE_DB_URL -f 001-voice-sessions.sql
psql $SUPABASE_DB_URL -f 002-voice-transcripts.sql
psql $SUPABASE_DB_URL -f 003-voice-configs.sql
psql $SUPABASE_DB_URL -f 004-voice-credentials.sql
psql $SUPABASE_DB_URL -f 005-voice-analytics.sql
psql $SUPABASE_DB_URL -f 006-voice-rpc-functions.sql
psql $SUPABASE_DB_URL -f 007-voice-session-kb.sql
```

Or use the migration script:

```bash
cd ~/code/bodhix/cora-dev-toolkit
./scripts/run-database-migrations.sh module-voice dev
```

### Step 2: Verify Tables Created

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'voice_%';

-- Expected output:
-- voice_sessions
-- voice_transcripts
-- voice_configs
-- voice_credentials
-- voice_analytics
-- voice_session_kb
```

### Step 3: Configure RLS Policies

The schema files include RLS policies. Verify they're active:

```sql
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename LIKE 'voice_%';
```

---

## Lambda Deployment

### Step 1: Build Lambda Packages

```bash
cd ~/code/{project}-infra

# Build all voice Lambdas
./scripts/build-lambda-zips.sh module-voice
```

This creates ZIP files for:
- `voice-sessions`
- `voice-configs`
- `voice-credentials`
- `voice-transcripts`
- `voice-analytics`
- `voice-websocket`

### Step 2: Deploy Lambda Functions

```bash
# Deploy via Terraform
./scripts/deploy-terraform.sh dev

# Or deploy specific Lambda
./scripts/deploy-lambda.sh module-voice/voice-sessions
```

### Step 3: Configure Lambda Environment

Ensure environment variables are set in Terraform:

```hcl
resource "aws_lambda_function" "voice_sessions" {
  # ...
  
  environment {
    variables = {
      SUPABASE_URL              = var.supabase_url
      SUPABASE_SERVICE_KEY_ARN  = var.supabase_service_key_arn
      ECS_CLUSTER_NAME          = aws_ecs_cluster.pipecat.name
      ECS_TASK_DEFINITION_ARN   = aws_ecs_task_definition.pipecat_bot.arn
      ECS_SUBNETS               = join(",", var.ecs_subnets)
      ECS_SECURITY_GROUPS       = join(",", var.ecs_security_groups)
      TRANSCRIPT_S3_BUCKET      = aws_s3_bucket.transcripts.id
      WEBSOCKET_API_URL         = aws_apigatewayv2_api.websocket.api_endpoint
    }
  }
}
```

### Step 4: Verify Lambda Deployment

```bash
# Test voice-sessions Lambda
aws lambda invoke \
  --function-name {project}-voice-sessions-dev \
  --payload '{"httpMethod": "GET", "path": "/health"}' \
  response.json

cat response.json
```

---

## ECS Deployment

### Step 1: Build Pipecat Bot Container

```bash
cd ~/code/{project}-infra/containers/pipecat-bot

# Build Docker image
docker build -t pipecat-bot:latest .

# Tag for ECR
docker tag pipecat-bot:latest \
  {account-id}.dkr.ecr.{region}.amazonaws.com/pipecat-bot:latest
```

### Step 2: Push to ECR

```bash
# Login to ECR
aws ecr get-login-password --region {region} | \
  docker login --username AWS --password-stdin \
  {account-id}.dkr.ecr.{region}.amazonaws.com

# Push image
docker push {account-id}.dkr.ecr.{region}.amazonaws.com/pipecat-bot:latest
```

### Step 3: Verify ECS Task Definition

```bash
# List task definitions
aws ecs list-task-definitions --family-prefix pipecat-bot

# Describe task definition
aws ecs describe-task-definition --task-definition pipecat-bot
```

### Step 4: Test ECS Task Launch

```bash
# Run test task
aws ecs run-task \
  --cluster pipecat-cluster \
  --task-definition pipecat-bot \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-abc123],securityGroups=[sg-xyz789],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"pipecat-bot","environment":[{"name":"TEST_MODE","value":"true"}]}]}'
```

---

## Frontend Integration

### Step 1: Install Module Dependencies

```bash
cd ~/code/{project}-stack

# Install dependencies
pnpm install
```

### Step 2: Configure Module Routes

Add voice routes to the app router:

```typescript
// app/(authenticated)/voice/page.tsx
export { default } from '@/cora-modules/module-voice/routes/voice/page';

// app/(authenticated)/voice/[id]/page.tsx
export { default } from '@/cora-modules/module-voice/routes/voice/[id]/page';
```

### Step 3: Add Navigation Entry

Update sidebar navigation in `module.json` or navigation config:

```json
{
  "navigation": {
    "label": "Interviews",
    "icon": "Mic",
    "path": "/voice",
    "requiredPermissions": ["voice:read"]
  }
}
```

### Step 4: Build and Test Frontend

```bash
# Start development server
./scripts/start-dev.sh

# Visit http://localhost:3000/voice
```

---

## Post-Deployment Verification

### Health Check Endpoints

Verify all Lambda health endpoints:

```bash
# Sessions Lambda
curl https://{api-domain}/api/voice/sessions/health

# Configs Lambda
curl https://{api-domain}/api/voice/configs/health

# WebSocket Lambda
curl https://{api-domain}/api/voice/ws/health
```

### Functional Tests

#### Test 1: Create Session

```bash
curl -X POST https://{api-domain}/api/voice/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org_test",
    "candidateName": "Test Candidate",
    "candidateEmail": "test@example.com",
    "interviewType": "technical"
  }'
```

#### Test 2: Create Config

```bash
curl -X POST https://{api-domain}/api/voice/configs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org_test",
    "name": "Test Config",
    "interviewType": "technical",
    "configJson": {
      "bot_name": "Test Bot",
      "system_prompt": "You are a test interviewer.",
      "initial_message": "Hello, this is a test.",
      "voice": {"provider": "cartesia", "voice_id": "en-US-Neural2-A"},
      "transcription": {"provider": "deepgram", "language": "en-US"},
      "llm": {"provider": "openai", "model": "gpt-4"}
    }
  }'
```

#### Test 3: Start Session

```bash
curl -X POST https://{api-domain}/api/voice/sessions/{session-id}/start \
  -H "Authorization: Bearer $TOKEN"
```

### Monitoring Setup

#### CloudWatch Alarms

```bash
# Create alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name "{project}-voice-sessions-errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value={project}-voice-sessions-dev \
  --evaluation-periods 1 \
  --alarm-actions {sns-topic-arn}
```

#### Log Groups

Verify log groups exist:

```bash
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/{project}-voice
```

---

## Environment-Specific Configuration

### Development

```hcl
# dev.tfvars
environment = "dev"
voice_module_enabled = true
standby_pool_enabled = false  # Save costs in dev
transcript_retention_days = 30
```

### Staging

```hcl
# staging.tfvars
environment = "staging"
voice_module_enabled = true
standby_pool_enabled = true
standby_pool_min_bots = 1
transcript_retention_days = 90
```

### Production

```hcl
# prod.tfvars
environment = "prod"
voice_module_enabled = true
standby_pool_enabled = true
standby_pool_min_bots = 3
standby_pool_max_bots = 10
transcript_retention_days = 365
enable_cloudwatch_alarms = true
```

---

## Rollback Procedures

### Lambda Rollback

```bash
# List Lambda versions
aws lambda list-versions-by-function \
  --function-name {project}-voice-sessions-dev

# Rollback to previous version
aws lambda update-alias \
  --function-name {project}-voice-sessions-dev \
  --name live \
  --function-version {previous-version}
```

### Database Rollback

```sql
-- Drop tables in reverse order (emergency only)
DROP TABLE IF EXISTS voice_session_kb CASCADE;
DROP TABLE IF EXISTS voice_analytics CASCADE;
DROP TABLE IF EXISTS voice_transcripts CASCADE;
DROP TABLE IF EXISTS voice_credentials CASCADE;
DROP TABLE IF EXISTS voice_configs CASCADE;
DROP TABLE IF EXISTS voice_sessions CASCADE;
```

### Infrastructure Rollback

```bash
# Rollback Terraform to previous state
cd ~/code/{project}-infra
terraform plan -target=module.voice -destroy
terraform apply -target=module.voice -destroy
```

---

## Troubleshooting

### Common Issues

#### Issue: Session Stuck in "pending"

**Symptoms:** Session created but never transitions to "ready"

**Diagnosis:**
```bash
# Check ECS task status
aws ecs list-tasks --cluster pipecat-cluster

# Check CloudWatch logs
aws logs tail /aws/lambda/{project}-voice-sessions-dev --follow
```

**Solutions:**
1. Verify ECS subnets have internet access
2. Check security group allows outbound HTTPS
3. Verify ECR image exists and is accessible
4. Check ECS task execution role permissions

#### Issue: Daily.co Room Creation Fails

**Symptoms:** Error "Failed to create Daily.co room"

**Diagnosis:**
```bash
# Test Daily.co API directly
curl -H "Authorization: Bearer $DAILY_API_KEY" \
  https://api.daily.co/v1/rooms
```

**Solutions:**
1. Verify Daily.co API key is valid
2. Check API key permissions include room creation
3. Verify credential is stored correctly in Secrets Manager
4. Check Daily.co account tier supports required features

#### Issue: Transcription Not Working

**Symptoms:** Session active but no transcript appearing

**Diagnosis:**
```bash
# Check WebSocket connections
aws logs filter-log-events \
  --log-group-name /aws/lambda/{project}-voice-websocket-dev \
  --filter-pattern "transcript"
```

**Solutions:**
1. Verify Deepgram API key is valid
2. Check Deepgram key has real-time transcription enabled
3. Verify WebSocket API Gateway is deployed
4. Check DynamoDB connection table exists

#### Issue: Bot Disconnects Immediately

**Symptoms:** ECS task starts but exits within seconds

**Diagnosis:**
```bash
# Check ECS task logs
aws logs tail /ecs/{project}-pipecat --follow
```

**Solutions:**
1. Verify all required environment variables are set
2. Check Daily.co room exists and is accessible
3. Verify Cartesia API key is valid
4. Check container has sufficient memory (1024 MB minimum)

### Diagnostic Commands

```bash
# Full system health check
./scripts/health-check.sh module-voice dev

# View all voice-related CloudWatch logs
aws logs filter-log-events \
  --log-group-name-prefix /aws/lambda/{project}-voice \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"

# Check API Gateway integrations
aws apigatewayv2 get-integrations --api-id {api-id}

# Verify Secrets Manager access
aws secretsmanager get-secret-value \
  --secret-id {project}/voice/daily-api-key \
  --query 'SecretString' --output text
```

---

## Security Considerations

### IAM Permissions

Lambda execution role requires:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:{project}/voice/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RunTask",
        "ecs:StopTask",
        "ecs:DescribeTasks"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ecs:cluster": "arn:aws:ecs:*:*:cluster/pipecat-cluster"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::{project}-voice-transcripts-*/*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::*:role/{project}-ecs-task-role",
        "arn:aws:iam::*:role/{project}-ecs-execution-role"
      ]
    }
  ]
}
```

### Network Security

- ECS tasks should run in private subnets
- Use VPC endpoints for AWS services where possible
- Security groups should allow only required traffic
- Enable VPC Flow Logs for audit

### Data Security

- API keys stored in AWS Secrets Manager
- Transcripts encrypted at rest in S3
- Database connections use SSL
- PII handled according to data retention policies

---

## Related Documentation

- [Configuration Guide](./CONFIGURATION.md)
- [API Reference](./API-REFERENCE.md)
- [Technical Specification](../../../docs/specifications/module-voice/MODULE-VOICE-TECHNICAL-SPEC.md)
- [Module Build & Deployment Guide](../../../docs/guides/guide_MODULE-BUILD-AND-DEPLOYMENT-REQUIREMENTS.md)
