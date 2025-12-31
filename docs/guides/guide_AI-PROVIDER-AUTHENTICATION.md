# AI Provider Authentication Guide

**Version:** 1.0.0  
**Last Updated:** December 31, 2025  
**Applies To:** CORA Development Toolkit v2.0+  
**Related Standards:** `standard_MODULE-DEPENDENCIES.md`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods Comparison](#authentication-methods-comparison)
3. [AWS Bedrock Setup (IAM Role - Recommended)](#aws-bedrock-setup-iam-role---recommended)
4. [AWS Bedrock Setup (Secrets Manager)](#aws-bedrock-setup-secrets-manager)
5. [Azure OpenAI Setup](#azure-openai-setup)
6. [Google Vertex AI Setup](#google-vertex-ai-setup)
7. [Testing Provider Connectivity](#testing-provider-connectivity)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## Overview

CORA's AI enablement module (`module-ai`) supports multiple AI providers with flexible authentication mechanisms. This guide explains how to configure authentication for each supported provider.

### Supported Providers

| Provider | Provider ID | Best Auth Method | Complexity |
|----------|-------------|------------------|------------|
| AWS Bedrock | `aws_bedrock` | IAM Role | Low |
| Azure AI Foundry | `azure_ai_foundry` | Secrets Manager | Medium |
| Google Vertex AI | `google_ai` | Secrets Manager | Medium |

### Authentication Flow

1. **Project Creation:** AI provider config read from `setup.config.yaml`
2. **Database Seeding:** Provider credentials path stored in `ai_providers` table
3. **Runtime:** Lambda functions retrieve credentials based on configured method
4. **Model Discovery:** Provider APIs called using authenticated credentials
5. **Model Usage:** AI features use discovered models via provider SDK

---

## Authentication Methods Comparison

### Decision Matrix

| Factor | IAM Role | Secrets Manager | SSM Parameter Store | Environment Variables |
|--------|----------|-----------------|---------------------|----------------------|
| **Security** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Very Good | ⭐⭐⭐ Good | ⭐ Poor |
| **Cost** | ⭐⭐⭐⭐⭐ Free | ⭐⭐⭐ $0.40/secret/mo | ⭐⭐⭐⭐⭐ Free | ⭐⭐⭐⭐⭐ Free |
| **Maintenance** | ⭐⭐⭐⭐⭐ Zero rotation | ⭐⭐⭐ Auto-rotation | ⭐⭐ Manual rotation | ⭐ Redeploy to change |
| **Multi-Cloud** | ❌ AWS only | ✅ All providers | ✅ All providers | ✅ All providers |
| **Audit Trail** | ✅ CloudTrail | ✅ CloudTrail | ✅ CloudTrail | ❌ None |
| **Setup Complexity** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Easy | ⭐⭐⭐⭐ Easy | ⭐⭐⭐⭐⭐ Trivial |
| **Production Ready** | ✅ Highly Recommended | ✅ Recommended | ⚠️ Dev/Test Only | ❌ Never Use |

### When to Use Each Method

**IAM Role (Preferred):**
- ✅ AWS Bedrock deployments
- ✅ Production environments
- ✅ Zero-trust security model
- ✅ No credential rotation overhead

**AWS Secrets Manager:**
- ✅ Azure OpenAI deployments
- ✅ Google Vertex AI deployments
- ✅ Cross-cloud architectures
- ✅ Automated credential rotation required

**SSM Parameter Store:**
- ⚠️ Development/testing environments
- ⚠️ Cost-sensitive non-production workloads
- ⚠️ Simple credential storage needs
- ❌ Not recommended for production

**Environment Variables:**
- ❌ **NEVER USE IN PRODUCTION**
- ⚠️ Local development only (with `.env` files)
- ❌ No encryption, no rotation, high security risk

---

## AWS Bedrock Setup (IAM Role - Recommended)

### Overview

IAM role-based authentication is the **most secure** and **lowest maintenance** approach for AWS Bedrock. Lambda execution roles are automatically granted permissions to invoke Bedrock models without storing any long-term credentials.

### Architecture

```
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Lambda         │─────▶│  IAM Role        │
│  (Provider API) │      │  - bedrock:*     │
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐
│  AWS Bedrock    │
│  - Claude 3.5   │
│  - Titan        │
└─────────────────┘
```

### Step 1: Configure setup.config.yaml

**File:** `{project}-stack/setup.config.{project}.yaml`

```yaml
ai_providers:
  aws_bedrock:
    enabled: true
    auth_method: "iam_role"  # Use IAM role-based auth
    credentials_secret_path: ""  # Leave empty for IAM role
    
    # Optional: Specify region (defaults to AWS_REGION env var)
    region: "us-east-1"
```

### Step 2: Terraform IAM Policy (Automatically Applied)

The CORA project template automatically provisions the required IAM permissions when you create a project with `module-ai`.

**File:** `{project}-infra/envs/dev/main.tf`

```hcl
# AWS Bedrock permissions for Lambda (IAM role-based auth)
resource "aws_iam_role_policy" "lambda_bedrock_access" {
  name = "${var.project_name}-lambda-bedrock-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"  # Can be scoped to specific model ARNs
      }
    ]
  })
}
```

**Permissions Explained:**

- `bedrock:InvokeModel` - Call Bedrock models synchronously
- `bedrock:InvokeModelWithResponseStream` - Call Bedrock models with streaming responses
- `bedrock:ListFoundationModels` - Discover available models (used by "Discover Models" button)
- `bedrock:GetFoundationModel` - Get model metadata (capabilities, pricing)

### Step 3: Verify IAM Role Permissions

After deploying infrastructure with Terraform:

```bash
# Navigate to infra directory
cd ~/code/{project}/{project}-infra

# Deploy Terraform (provisions IAM role)
./scripts/deploy-terraform.sh dev

# Verify IAM role has Bedrock permissions
aws iam get-role-policy \
  --role-name {project}-lambda-execution-role \
  --policy-name {project}-lambda-bedrock-access
```

**Expected Output:**

```json
{
  "RoleName": "ai-sec-lambda-execution-role",
  "PolicyName": "ai-sec-lambda-bedrock-access",
  "PolicyDocument": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ],
        "Resource": "*"
      }
    ]
  }
}
```

### Step 4: Test Provider Connectivity

1. **Navigate to AI Enablement page:**
   - URL: `https://{your-domain}/admin/ai-enablement`
   - Click **Providers** tab

2. **Locate AWS Bedrock provider:**
   - Should show `Status: Active`
   - **Discover Models** button should be enabled

3. **Click "Discover Models":**
   - Should retrieve models: Claude 3.5, Titan, etc.
   - Check **Models** tab to see discovered models

### Step 5: Verify Database Configuration

```sql
-- Verify AWS Bedrock provider configuration
SELECT 
  name,
  is_active,
  credentials_secret_path,
  supported_models,
  created_at
FROM public.ai_providers
WHERE name = 'aws_bedrock';
```

**Expected Result:**

| name | is_active | credentials_secret_path | supported_models |
|------|-----------|-------------------------|------------------|
| aws_bedrock | true | NULL | {Claude, Titan, ...} |

**Note:** `credentials_secret_path` should be `NULL` or empty for IAM role auth.

### Advanced: Scoping Permissions to Specific Models

For tighter security, restrict IAM policy to specific model ARNs:

```hcl
resource "aws_iam_role_policy" "lambda_bedrock_access" {
  name = "${var.project_name}-lambda-bedrock-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"  # Read-only, safe to leave open
      }
    ]
  })
}
```

---

## AWS Bedrock Setup (Secrets Manager)

### Overview

While IAM role auth is preferred, Secrets Manager can be used if you need to use API keys or cross-account access patterns.

### Step 1: Create AWS Secret

**Via AWS Console:**

1. Navigate to **AWS Secrets Manager** → **Secrets** → **Store a new secret**
2. Select **Other type of secret**
3. **Key/Value pairs:**
   - Key: `api_key`
   - Value: `{your-bedrock-api-key}`
4. **Secret name:** `{project}/ai/bedrock`
5. **Region:** Same as your Lambda functions
6. Click **Next** → **Store**

**Via AWS CLI:**

```bash
aws secretsmanager create-secret \
  --name "{project}/ai/bedrock" \
  --description "AWS Bedrock API key for {project}" \
  --secret-string '{"api_key":"YOUR_API_KEY_HERE"}' \
  --region us-east-1
```

### Step 2: Get Secret ARN

```bash
aws secretsmanager describe-secret \
  --secret-id "{project}/ai/bedrock" \
  --region us-east-1 \
  --query 'ARN' \
  --output text
```

**Example Output:**

```
arn:aws:secretsmanager:us-east-1:123456789012:secret:{project}/ai/bedrock-AbCdEf
```

### Step 3: Configure setup.config.yaml

```yaml
ai_providers:
  aws_bedrock:
    enabled: true
    auth_method: "secrets_manager"
    credentials_secret_path: "arn:aws:secretsmanager:us-east-1:123456789012:secret:{project}/ai/bedrock-AbCdEf"
    region: "us-east-1"
```

### Step 4: Grant Lambda Permissions

**Terraform automatically provisions this policy:**

```hcl
# Secrets Manager permissions (for Bedrock API key approach)
resource "aws_iam_role_policy" "lambda_secrets_access" {
  name = "${var.project_name}-lambda-secrets-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/ai/*"
        ]
      }
    ]
  })
}
```

### Step 5: Enable Automatic Rotation (Optional)

```bash
# Create rotation Lambda (AWS provides a template)
aws secretsmanager rotate-secret \
  --secret-id "{project}/ai/bedrock" \
  --rotation-lambda-arn "arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRotation" \
  --rotation-rules AutomaticallyAfterDays=30
```

---

## Azure OpenAI Setup

### Overview

Azure OpenAI requires API key authentication. Keys are stored in AWS Secrets Manager for secure access from Lambda functions.

### Step 1: Obtain Azure OpenAI API Key

1. **Navigate to Azure Portal:** https://portal.azure.com
2. Go to **Azure OpenAI** → **Your Resource** → **Keys and Endpoint**
3. Copy **Key 1** (keep Key 2 as backup for rotation)
4. Copy **Endpoint URL** (e.g., `https://your-resource.openai.azure.com/`)

### Step 2: Create AWS Secret for Azure Key

**Secret Format:**

```json
{
  "api_key": "YOUR_AZURE_OPENAI_API_KEY",
  "endpoint": "https://your-resource.openai.azure.com/",
  "api_version": "2024-02-15-preview"
}
```

**Create via AWS CLI:**

```bash
aws secretsmanager create-secret \
  --name "{project}/ai/azure_openai" \
  --description "Azure OpenAI API key for {project}" \
  --secret-string '{
    "api_key": "YOUR_AZURE_API_KEY",
    "endpoint": "https://your-resource.openai.azure.com/",
    "api_version": "2024-02-15-preview"
  }' \
  --region us-east-1
```

### Step 3: Get Secret ARN

```bash
aws secretsmanager describe-secret \
  --secret-id "{project}/ai/azure_openai" \
  --region us-east-1 \
  --query 'ARN' \
  --output text
```

### Step 4: Configure setup.config.yaml

```yaml
ai_providers:
  azure_ai_foundry:
    enabled: true
    auth_method: "secrets_manager"
    credentials_secret_path: "arn:aws:secretsmanager:us-east-1:123456789012:secret:{project}/ai/azure_openai-AbCdEf"
    
    # Azure-specific configuration
    azure:
      endpoint: "https://your-resource.openai.azure.com/"
      api_version: "2024-02-15-preview"
      deployment_name: "gpt-4"  # Optional: default deployment
```

### Step 5: Update Database Configuration

```sql
-- Update Azure OpenAI provider with secret ARN
UPDATE public.ai_providers
SET 
  credentials_secret_path = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:{project}/ai/azure_openai-AbCdEf',
  is_active = true,
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{azure}',
    '{
      "endpoint": "https://your-resource.openai.azure.com/",
      "api_version": "2024-02-15-preview"
    }'::jsonb
  ),
  updated_at = NOW()
WHERE name = 'azure_ai_foundry';
```

### Step 6: Test Connection

1. Navigate to **AI Enablement** → **Providers** tab
2. Find **Azure AI Foundry** provider
3. Click **Discover Models**
4. Should retrieve models: GPT-4, GPT-3.5-turbo, etc.

### Troubleshooting Azure OpenAI

**Error: "Unauthorized" (401)**
- Verify API key is correct (check Azure portal)
- Ensure key hasn't expired or been rotated
- Check secret ARN is correct in database

**Error: "Resource not found" (404)**
- Verify endpoint URL is correct
- Ensure deployment exists in Azure
- Check API version matches Azure's latest

**Error: "Rate limit exceeded" (429)**
- Azure OpenAI has per-minute quotas
- Upgrade Azure tier or request quota increase
- Implement retry logic with exponential backoff

---

## Google Vertex AI Setup

### Overview

Google Vertex AI uses service account JSON key files for authentication. The JSON key is stored in AWS Secrets Manager.

### Step 1: Create Google Cloud Service Account

**Via Google Cloud Console:**

1. Navigate to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. **Name:** `{project}-vertex-ai`
4. **Role:** `Vertex AI User` (or `Vertex AI Administrator` for full access)
5. Click **Create and Continue** → **Done**

**Via gcloud CLI:**

```bash
# Create service account
gcloud iam service-accounts create {project}-vertex-ai \
  --display-name="{project} Vertex AI Service Account" \
  --project=your-gcp-project-id

# Grant Vertex AI role
gcloud projects add-iam-policy-binding your-gcp-project-id \
  --member="serviceAccount:{project}-vertex-ai@your-gcp-project-id.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Step 2: Download Service Account JSON Key

**Via Google Cloud Console:**

1. Navigate to **Service Accounts** → **{project}-vertex-ai**
2. Click **Keys** tab → **Add Key** → **Create new key**
3. Select **JSON** format
4. Click **Create** (downloads `{project}-vertex-ai-123abc.json`)

**Via gcloud CLI:**

```bash
gcloud iam service-accounts keys create ~/Downloads/{project}-vertex-ai-key.json \
  --iam-account={project}-vertex-ai@your-gcp-project-id.iam.gserviceaccount.com
```

### Step 3: Store JSON Key in AWS Secrets Manager

**⚠️ Important:** Store the **entire JSON file contents** as the secret value.

```bash
# Read JSON key file
JSON_KEY=$(cat ~/Downloads/{project}-vertex-ai-key.json)

# Create AWS secret
aws secretsmanager create-secret \
  --name "{project}/ai/google_vertex" \
  --description "Google Vertex AI service account key for {project}" \
  --secret-string "$JSON_KEY" \
  --region us-east-1

# Delete local copy (security best practice)
rm ~/Downloads/{project}-vertex-ai-key.json
```

### Step 4: Get Secret ARN

```bash
aws secretsmanager describe-secret \
  --secret-id "{project}/ai/google_vertex" \
  --region us-east-1 \
  --query 'ARN' \
  --output text
```

### Step 5: Configure setup.config.yaml

```yaml
ai_providers:
  google_ai:
    enabled: true
    auth_method: "secrets_manager"
    credentials_secret_path: "arn:aws:secretsmanager:us-east-1:123456789012:secret:{project}/ai/google_vertex-AbCdEf"
    
    # Google-specific configuration
    google:
      project_id: "your-gcp-project-id"
      location: "us-central1"  # Vertex AI region
```

### Step 6: Update Database Configuration

```sql
-- Update Google Vertex AI provider
UPDATE public.ai_providers
SET 
  credentials_secret_path = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:{project}/ai/google_vertex-AbCdEf',
  is_active = true,
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{google}',
    '{
      "project_id": "your-gcp-project-id",
      "location": "us-central1"
    }'::jsonb
  ),
  updated_at = NOW()
WHERE name = 'google_ai';
```

### Step 7: Test Connection

1. Navigate to **AI Enablement** → **Providers** tab
2. Find **Google AI** provider
3. Click **Discover Models**
4. Should retrieve models: PaLM 2, Gemini, etc.

### Troubleshooting Google Vertex AI

**Error: "Permission denied" (403)**
- Verify service account has `roles/aiplatform.user` role
- Check project ID is correct
- Ensure Vertex AI API is enabled in GCP

**Error: "Invalid authentication credentials" (401)**
- Verify JSON key is stored correctly in Secrets Manager
- Ensure JSON is not corrupted or truncated
- Check service account hasn't been deleted

**Error: "Resource not found" (404)**
- Verify `location` is correct (e.g., `us-central1`)
- Ensure models are available in that region
- Check project ID matches the service account

---

## Testing Provider Connectivity

### Using the AI Enablement UI

**Step 1: Navigate to Providers Tab**

1. Log in as **Platform Owner**
2. Navigate to **Admin** → **AI Enablement**
3. Click **Providers** tab

**Step 2: Verify Provider Status**

| Provider | Expected Status | Credentials Path |
|----------|----------------|------------------|
| AWS Bedrock (IAM) | Active | NULL or empty |
| AWS Bedrock (Secrets) | Active | `arn:aws:secretsmanager:...` |
| Azure OpenAI | Active | `arn:aws:secretsmanager:...` |
| Google Vertex AI | Active | `arn:aws:secretsmanager:...` |

**Step 3: Discover Models**

1. Click **Discover Models** button for provider
2. **Expected behavior:**
   - Button shows loading spinner
   - After 5-30 seconds, models appear in **Models** tab
   - Provider card updates with model count

3. **If discovery fails:**
   - Check browser console for error messages
   - Check Lambda logs in CloudWatch

### Using AWS CLI (Manual Testing)

**Test IAM Role Permissions:**

```bash
# Assume Lambda execution role
aws sts assume-role \
  --role-arn "arn:aws:iam::123456789012:role/{project}-lambda-execution-role" \
  --role-session-name "test-bedrock"

# Export credentials (from assume-role output)
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."

# Test Bedrock API call
aws bedrock list-foundation-models --region us-east-1
```

**Test Secrets Manager Access:**

```bash
# Test retrieving Azure secret
aws secretsmanager get-secret-value \
  --secret-id "{project}/ai/azure_openai" \
  --region us-east-1

# Test retrieving Google secret
aws secretsmanager get-secret-value \
  --secret-id "{project}/ai/google_vertex" \
  --region us-east-1
```

### Interpreting Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `AccessDeniedException` | IAM role lacks permissions | Update IAM policy, redeploy Terraform |
| `ResourceNotFoundException` | Secret doesn't exist | Create secret in Secrets Manager |
| `InvalidSignatureException` | API key is incorrect | Rotate secret with correct key |
| `ValidationException` | Malformed request | Check provider config (endpoint, API version) |
| `ThrottlingException` | Rate limit exceeded | Implement retry logic, upgrade tier |
| `ServiceUnavailableException` | Provider outage | Check provider status page, retry later |

---

## Troubleshooting

### Issue: "Discover Models" Button Disabled

**Symptoms:**
- Button is grayed out and not clickable
- No error messages in console

**Causes & Solutions:**

1. **Provider is not active:**
   ```sql
   -- Check provider status
   SELECT name, is_active FROM public.ai_providers WHERE name = 'aws_bedrock';
   
   -- Activate provider
   UPDATE public.ai_providers SET is_active = true WHERE name = 'aws_bedrock';
   ```

2. **User lacks permissions:**
   - User must have `platform_owner` role
   - Check: `SELECT role FROM public.users WHERE email = 'your-email@example.com';`

3. **Frontend build issue:**
   - Restart Next.js dev server: `pnpm dev`
   - Clear browser cache

---

### Issue: Models Discovered but Cannot Be Used

**Symptoms:**
- Models appear in **Models** tab
- Trying to use model results in 500 error

**Causes & Solutions:**

1. **Model FK constraint violation:**
   ```sql
   -- Check platform_rag configuration
   SELECT default_embedding_model_id, default_chat_model_id FROM public.platform_rag;
   
   -- Set to NULL if pointing to non-existent model
   UPDATE public.platform_rag 
   SET default_embedding_model_id = NULL, default_chat_model_id = NULL;
   ```

2. **Runtime credential retrieval fails:**
   - Check Lambda CloudWatch logs for authentication errors
   - Verify IAM role or secret ARN is correct

---

### Issue: High Secrets Manager Costs

**Symptoms:**
- AWS bill shows high Secrets Manager charges

**Solutions:**

1. **Consolidate secrets:**
   ```bash
   # Instead of 3 secrets ($1.20/month), use 1 secret with all providers ($0.40/month)
   aws secretsmanager create-secret \
     --name "{project}/ai/all-providers" \
     --secret-string '{
       "azure": {"api_key": "...", "endpoint": "..."},
       "google": {JSON_SERVICE_ACCOUNT},
       "openai": {"api_key": "..."}
     }'
   ```

2. **Switch to SSM Parameter Store (dev only):**
   - Free for standard parameters
   - Update `credentials_secret_path` to use SSM ARNs
   - ⚠️ Not recommended for production

3. **Use IAM roles where possible:**
   - AWS Bedrock: Always use IAM role (free, more secure)
   - Azure/Google: No alternative to Secrets Manager

---

### Issue: Cross-Account Bedrock Access Fails

**Symptoms:**
- Bedrock models in different AWS account not accessible

**Solution:**

**Step 1: Resource Policy in Model Account**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLambdaInvoke",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::LAMBDA_ACCOUNT_ID:role/{project}-lambda-execution-role"
      },
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1:MODEL_ACCOUNT_ID:foundation-model/*"
    }
  ]
}
```

**Step 2: Update Lambda IAM Role**

```hcl
resource "aws_iam_role_policy" "lambda_bedrock_cross_account" {
  name = "${var.project_name}-lambda-bedrock-cross-account"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Resource = "arn:aws:iam::MODEL_ACCOUNT_ID:role/BedrockAccessRole"
      }
    ]
  })
}
```

---

## Security Best Practices

### 1. Use IAM Roles for AWS Services

**✅ Do:**
- Use IAM role auth for AWS Bedrock
- Leverage temporary credentials
- Scope permissions to least privilege

**❌ Don't:**
- Use long-term API keys for AWS services
- Store credentials in environment variables
- Grant overly broad permissions (`bedrock:*`)

### 2. Rotate Secrets Regularly

**Secrets Manager (Azure/Google):**

```bash
# Enable automatic rotation (30-day interval)
aws secretsmanager rotate-secret \
  --secret-id "{project}/ai/azure_openai" \
  --rotation-rules AutomaticallyAfterDays=30
```

**Manual Rotation Checklist:**
1. Generate new API key in provider console
2. Update AWS secret with new key
3. Test connectivity
4. Revoke old key in provider console
5. Document rotation in changelog

### 3. Audit Access with CloudTrail

**Enable CloudTrail logging:**

```bash
# Query Secrets Manager access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue={project}/ai/azure_openai \
  --max-results 50
```

**Set up alarms:**

```hcl
resource "aws_cloudwatch_metric_alarm" "secrets_access_spike" {
  alarm_name          = "${var.project_name}-secrets-access-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "GetSecretValue"
  namespace           = "AWS/SecretsManager"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"  # Alert if >100 calls in 5 minutes
  alarm_description   = "High volume of secret retrievals detected"
}
```

### 4. Encrypt Secrets at Rest

**Secrets Manager (default):**
- Uses AWS-managed KMS key (`aws/secretsmanager`)
- No additional configuration needed

**Custom KMS Key (enhanced audit):**

```hcl
resource "aws_kms_key" "secrets" {
  description             = "${var.project_name} secrets encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_secretsmanager_secret" "azure_openai" {
  name       = "${var.project_name}/ai/azure_openai"
  kms_key_id = aws_kms_key.secrets.id
}
```

### 5. Implement Least Privilege

**Lambda Execution Role (minimal permissions):**

```hcl
# Only grant access to specific secrets
resource "aws_iam_role_policy" "lambda_secrets_scoped" {
  name = "${var.project_name}-lambda-secrets-scoped"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "secretsmanager:GetSecretValue"
        Resource = [
          aws_secretsmanager_secret.azure_openai.arn,
          aws_secretsmanager_secret.google_vertex.arn
        ]
      }
    ]
  })
}
```

### 6. Monitor for Suspicious Activity

**CloudWatch Insights Query:**

```sql
-- Find failed authentication attempts
fields @timestamp, @message
| filter @message like /AccessDeniedException|InvalidSignatureException/
| sort @timestamp desc
| limit 100
```

**Set up SNS alerts:**

```hcl
resource "aws_sns_topic" "security_alerts" {
  name = "${var.project_name}-security-alerts"
}

resource "aws_cloudwatch_metric_alarm" "auth_failures" {
  alarm_name          = "${var.project_name}-auth-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
}
```

---

## Cost Optimization

### Monthly Cost Estimates

| Auth Method | Provider | Monthly Cost | Notes |
|-------------|----------|--------------|-------|
| IAM Role | AWS Bedrock | $0.00 | No storage costs, only API usage |
| Secrets Manager | Azure OpenAI | $0.40 | $0.40/secret + $0.05/10k API calls |
| Secrets Manager | Google Vertex | $0.40 | $0.40/secret + $0.05/10k API calls |
| SSM Parameter Store | Any | $0.00 | Free for standard parameters |

**Cost Reduction Strategies:**

1. **Consolidate Secrets:** Store all provider credentials in one secret ($0.40 vs $1.20)
2. **Cache Credentials:** Reduce `GetSecretValue` API calls (cache for 1 hour)
3. **Use IAM Roles:** Prefer IAM role auth over Secrets Manager where possible
4. **Development vs Production:** Use SSM Parameter Store in dev, Secrets Manager in prod

---

## Reference

### Related Documentation

- **CORA Standards:**
  - `standard_MODULE-DEPENDENCIES.md` - Core module integration patterns
  - `standard_MODULE-REGISTRATION.md` - Module lifecycle and configuration
  
- **CORA Guides:**
  - `guide_CORA-MODULE-DEVELOPMENT-PROCESS.md` - Module development workflow
  - `guide_cora-project-setup.md` - Project setup and configuration

### External Resources

- **AWS Bedrock IAM:** https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html
- **AWS Secrets Manager:** https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html
- **Azure OpenAI API:** https://learn.microsoft.com/en-us/azure/ai-services/openai/quickstart
- **Google Vertex AI Auth:** https://cloud.google.com/vertex-ai/docs/authentication

---

**Document Version:** 1.0.0  
**Last Updated:** December 31, 2025  
**Maintained By:** CORA Development Toolkit Team  
**Feedback:** Submit issues via GitHub or contact platform team
