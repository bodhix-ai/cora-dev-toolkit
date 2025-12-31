# AI Platform Seeding Strategy

**Status:** 📋 **PLANNING**  
**Date:** December 30, 2025  
**Related Context:** `memory-bank/activeContext.md` - Session 43  
**Issues Addressed:**  
- Issue #2: Platform RAG Configuration Missing  
- Issue #3: Provider Credentials Setup

---

## Executive Summary

This plan addresses two interconnected issues preventing the AI Enablement module from functioning in new CORA projects:

1. **Platform RAG table is empty** - No default configuration seeded during project creation
2. **AI provider credentials not configured** - No mechanism to set up provider authentication

**Recommended Solution:**
- Use IAM role-based authentication (preferred) with fallback to AWS Secrets Manager
- Seed platform_rag with sensible defaults during project creation
- Update setup.config.yaml to support AI provider configuration
- Generate seed SQL scripts during project creation
- Document the authentication mechanisms clearly

---

## Problem Statement

### Issue #2: Platform RAG Configuration Missing

**Current State:**
- `platform_rag` table exists but is **EMPTY** in new projects
- Schema file `006-platform-rag.sql` has commented out seed data
- No automatic seeding during `create-cora-project.sh` execution
- Frontend shows "Platform AI configuration not found" (404 error)

**Impact:**
- AI Enablement page fails to load
- Cannot configure AI models or providers
- Document processing features unavailable
- Chat/Q&A features unavailable

**Dependencies:**
- `platform_rag.default_embedding_model_id` → FK to `ai_models.id`
- `platform_rag.default_chat_model_id` → FK to `ai_models.id`
- These can be NULL initially and set after models are discovered

### Issue #3: Provider Credentials Setup

**Current State:**
- `ai_providers` table is seeded with 3 default providers (google_ai, azure_ai_foundry, aws_bedrock)
- All providers have `credentials_secret_path = NULL`
- No section in `setup.config.example.yaml` for AI provider configuration
- "Discover Models" button disabled on AI providers page
- No documentation on credential management approaches

**Impact:**
- Cannot discover models from providers
- Cannot test provider connectivity
- Cannot use AI features until credentials manually configured via SQL

---

## Analysis of Credential Management Approaches

### Approach 1: AWS IAM Role-Based Authentication (RECOMMENDED)

**How It Works:**
1. Lambda execution role is granted permissions to invoke AI providers
2. For AWS Bedrock: Lambda role has `bedrock:InvokeModel` permission
3. For Azure/Google: Lambda role assumes cross-cloud identity federation
4. No long-term credentials stored in database
5. `credentials_secret_path` remains NULL for IAM role providers

**Pros:**
- ✅ **Most Secure** - No long-term credentials to rotate or leak
- ✅ **AWS Best Practice** - Recommended by AWS for Lambda → Bedrock
- ✅ **Zero Maintenance** - No credential rotation needed
- ✅ **Audit Trail** - CloudTrail logs all API calls with identity
- ✅ **Least Privilege** - Can scope permissions per model/resource
- ✅ **No Database Storage** - Credentials never touch database

**Cons:**
- ❌ **AWS-Specific** - Only works for AWS Bedrock (not Azure/Google)
- ❌ **Setup Complexity** - Requires Terraform IAM policy configuration
- ❌ **Cross-Account** - More complex for cross-account Bedrock access
- ❌ **Documentation Critical** - Users must understand IAM role setup

**Best For:**
- AWS Bedrock deployments
- Production environments
- Security-conscious organizations
- AWS-native architectures

---

### Approach 2: AWS Secrets Manager

**How It Works:**
1. API keys/credentials stored in AWS Secrets Manager
2. Lambda execution role granted `secretsmanager:GetSecretValue` permission
3. `credentials_secret_path` stores the ARN or secret name
4. Lambda retrieves credentials at runtime via boto3
5. Credentials cached for performance

**Pros:**
- ✅ **Multi-Provider** - Works for all providers (Azure, Google, OpenAI)
- ✅ **Secure Storage** - Encrypted at rest and in transit
- ✅ **Rotation Support** - Built-in automatic rotation
- ✅ **Access Control** - IAM-based access to secrets
- ✅ **Versioning** - Can roll back credential changes
- ✅ **Audit Trail** - CloudTrail logs secret access

**Cons:**
- ❌ **Cost** - $0.40/secret/month + $0.05/10,000 API calls
- ❌ **Long-Term Credentials** - Must rotate API keys periodically
- ❌ **Setup Required** - Secrets must be created manually or via Terraform
- ❌ **Region-Specific** - Secrets are regional resources

**Best For:**
- Azure OpenAI deployments
- Google Vertex AI deployments
- OpenAI API deployments
- Cross-cloud architectures

---

### Approach 3: AWS Systems Manager Parameter Store

**How It Works:**
1. API keys stored in SSM Parameter Store (SecureString type)
2. Lambda execution role granted `ssm:GetParameter` permission
3. `credentials_secret_path` stores the parameter name/ARN
4. Lambda retrieves credentials at runtime

**Pros:**
- ✅ **Cost-Effective** - Free for standard parameters
- ✅ **Multi-Provider** - Works for all providers
- ✅ **Encrypted** - KMS encryption for SecureString
- ✅ **Versioning** - Parameter history tracked
- ✅ **IAM Access Control** - Same as Secrets Manager

**Cons:**
- ❌ **No Auto-Rotation** - Must rotate credentials manually
- ❌ **Less Feature-Rich** - No native rotation like Secrets Manager
- ❌ **Long-Term Credentials** - API keys must be rotated
- ❌ **10KB Limit** - Not suitable for large credentials (e.g., service account JSON)

**Best For:**
- Development/testing environments
- Cost-sensitive deployments
- Simple credential storage needs

---

### Approach 4: Environment Variables

**How It Works:**
1. API keys stored as Lambda environment variables
2. `credentials_secret_path` is NULL or contains env var name
3. Lambda reads `os.environ['OPENAI_API_KEY']`

**Pros:**
- ✅ **Simple** - Easy to understand and configure
- ✅ **No External Dependencies** - No Secrets Manager/SSM needed
- ✅ **Fast Access** - No API calls to retrieve credentials

**Cons:**
- ❌ **HIGHLY INSECURE** - Visible in Lambda console
- ❌ **No Encryption** - Only basic obfuscation
- ❌ **No Rotation** - Must redeploy Lambda to change
- ❌ **Not Recommended** - AWS explicitly discourages for secrets
- ❌ **Audit Nightmare** - Hard to track who accessed what

**Best For:**
- ❌ **NEVER USE IN PRODUCTION**
- Local development only (with `.env` files)

---

## Recommended Solution: Hybrid Approach

### Strategy

**Tiered Authentication Model:**

1. **Tier 1 (Preferred): IAM Role-Based**
   - Use for AWS Bedrock
   - `credentials_secret_path = NULL`
   - Document Lambda IAM policy requirements

2. **Tier 2 (Fallback): AWS Secrets Manager**
   - Use for Azure OpenAI, Google Vertex AI, OpenAI
   - `credentials_secret_path = ARN`
   - Document secret creation process

3. **Tier 3 (Dev Only): SSM Parameter Store**
   - Optional for development environments
   - Lower cost alternative to Secrets Manager

### Configuration Schema

**Add to `setup.config.example.yaml`:**

```yaml
# =============================================================================
# AI Provider Configuration
# =============================================================================
# Configure authentication for AI providers used in the platform.
# Supports multiple authentication methods based on provider type.

ai_providers:
  # AWS Bedrock (Recommended: IAM Role-Based Auth)
  aws_bedrock:
    enabled: true
    auth_method: "iam_role"  # "iam_role" | "secrets_manager" | "ssm_parameter"
    
    # For IAM role auth (recommended):
    # Leave credentials_secret_path empty
    # Ensure Lambda execution role has bedrock:InvokeModel permission
    credentials_secret_path: ""
    
    # For Secrets Manager auth:
    # credentials_secret_path: "arn:aws:secretsmanager:us-east-1:123456789012:secret:bedrock-api-key"
    
    # For SSM Parameter Store auth:
    # credentials_secret_path: "/cora/ai/bedrock/api-key"
    
  # Azure OpenAI (Requires API Key)
  azure_ai_foundry:
    enabled: false
    auth_method: "secrets_manager"  # Azure requires API key
    credentials_secret_path: ""  # e.g., "arn:aws:secretsmanager:...:secret:azure-openai-key"
    
    # Azure-specific configuration
    azure:
      endpoint: ""  # e.g., "https://your-resource.openai.azure.com/"
      api_version: "2024-02-15-preview"
      
  # Google Vertex AI (Requires Service Account)
  google_ai:
    enabled: false
    auth_method: "secrets_manager"  # Google requires service account JSON
    credentials_secret_path: ""  # e.g., "arn:aws:secretsmanager:...:secret:google-sa-json"
    
    # Google-specific configuration
    google:
      project_id: ""
      location: "us-central1"
```

---

## Implementation Plan

### Phase 1: Update Schema Files

**File:** `templates/_cora-core-modules/module-ai/db/schema/006-platform-rag.sql`

**Action:** Uncomment and refine seed data

```sql
-- Insert default platform RAG configuration
-- Idempotent: Safe to run multiple times
INSERT INTO public.platform_rag (
    available_embedding_models,
    default_embedding_model,
    embedding_model_costs,
    available_chunking_strategies,
    default_chunking_strategy,
    max_chunk_size_tokens,
    min_chunk_size_tokens,
    search_quality_presets,
    default_search_quality,
    default_similarity_threshold,
    max_search_results_global,
    max_context_tokens_global,
    ocr_enabled,
    processing_timeout_minutes,
    max_concurrent_jobs_global,
    vector_index_type,
    backup_retention_days,
    auto_scaling_enabled,
    max_embedding_batch_size,
    embedding_cache_ttl_hours,
    provider_configurations,
    default_ai_provider,
    active_providers,
    default_embedding_model_id,
    default_chat_model_id,
    system_prompt
) 
SELECT 
    ARRAY['text-embedding-3-small', 'text-embedding-3-large'],
    'text-embedding-3-small',
    '{
      "text-embedding-3-small": 1.0, 
      "text-embedding-3-large": 1.5
    }'::jsonb,
    ARRAY['fixed', 'semantic', 'hybrid'],
    'hybrid',
    2000,
    100,
    '{
      "fast": {"similarity_threshold": 0.6, "max_results": 5},
      "balanced": {"similarity_threshold": 0.7, "max_results": 10},
      "comprehensive": {"similarity_threshold": 0.5, "max_results": 25}
    }'::jsonb,
    'balanced',
    0.7,
    50,
    8000,
    true,
    30,
    100,
    'ivfflat',
    90,
    true,
    100,
    24,
    '{}'::jsonb,
    'openai',
    ARRAY['openai'],
    NULL,  -- Set after models are discovered
    NULL,  -- Set after models are discovered
    'You are a helpful AI assistant that provides accurate, well-sourced answers based on the knowledge base. Always cite your sources and acknowledge when you don''t have enough information to answer a question.'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_rag);
```

**Rationale:**
- Uses `WHERE NOT EXISTS` for true idempotency (safer than INSERT ... ON CONFLICT for singleton table)
- Sets default values matching policy project reference implementation
- Leaves model FKs as NULL (cannot reference non-existent models)
- Includes helpful system prompt for AI assistant

---

### Phase 2: Update setup.config.example.yaml

**File:** `templates/_project-stack-template/setup.config.example.yaml`

**Action:** Add AI provider configuration section (see schema above)

**Documentation to include:**
- Comment blocks explaining each auth method
- Examples for each provider type
- Links to provider documentation
- Security best practices

---

### Phase 3: Update create-cora-project.sh

**Add new function: `seed_ai_provider_credentials()`**

```bash
seed_ai_provider_credentials() {
  local config_file="$1"
  local stack_dir="$2"
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "Config file not found: $config_file"
    log_info "Skipping AI provider credential seeding."
    return
  fi
  
  log_step "Generating AI provider credentials seed file from ${config_file}..."
  
  # Extract provider configurations using yq
  local bedrock_enabled=$(yq '.ai_providers.aws_bedrock.enabled // false' "$config_file")
  local bedrock_auth_method=$(yq '.ai_providers.aws_bedrock.auth_method // "iam_role"' "$config_file")
  local bedrock_creds_path=$(yq '.ai_providers.aws_bedrock.credentials_secret_path // ""' "$config_file")
  
  local azure_enabled=$(yq '.ai_providers.azure_ai_foundry.enabled // false' "$config_file")
  local azure_creds_path=$(yq '.ai_providers.azure_ai_foundry.credentials_secret_path // ""' "$config_file")
  
  local google_enabled=$(yq '.ai_providers.google_ai.enabled // false' "$config_file")
  local google_creds_path=$(yq '.ai_providers.google_ai.credentials_secret_path // ""' "$config_file")
  
  # Create scripts directory if it doesn't exist
  mkdir -p "${stack_dir}/scripts"
  
  # Generate SQL seed file
  cat > "${stack_dir}/scripts/seed-ai-provider-credentials.sql" << 'SQLEOF'
-- Seed AI Provider Credentials
-- Generated by create-cora-project.sh
-- This configures authentication for AI providers
-- Idempotent: Safe to run multiple times

-- AWS Bedrock
UPDATE public.ai_providers
SET 
  credentials_secret_path = '${BEDROCK_CREDS_PATH}',
  is_active = ${BEDROCK_ENABLED},
  updated_at = NOW()
WHERE name = 'aws_bedrock';

-- Azure AI Foundry
UPDATE public.ai_providers
SET 
  credentials_secret_path = '${AZURE_CREDS_PATH}',
  is_active = ${AZURE_ENABLED},
  updated_at = NOW()
WHERE name = 'azure_ai_foundry';

-- Google AI
UPDATE public.ai_providers
SET 
  credentials_secret_path = '${GOOGLE_CREDS_PATH}',
  is_active = ${GOOGLE_ENABLED},
  updated_at = NOW()
WHERE name = 'google_ai';
SQLEOF
  
  # Replace placeholders
  sed -i '' "s|\${BEDROCK_CREDS_PATH}|${bedrock_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${BEDROCK_CREDS_PATH}|${bedrock_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${BEDROCK_ENABLED}|${bedrock_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${BEDROCK_ENABLED}|${bedrock_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${AZURE_CREDS_PATH}|${azure_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${AZURE_CREDS_PATH}|${azure_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${AZURE_ENABLED}|${azure_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${AZURE_ENABLED}|${azure_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${GOOGLE_CREDS_PATH}|${google_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${GOOGLE_CREDS_PATH}|${google_creds_path}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  sed -i '' "s|\${GOOGLE_ENABLED}|${google_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql" 2>/dev/null || \
  sed -i "s|\${GOOGLE_ENABLED}|${google_enabled}|g" "${stack_dir}/scripts/seed-ai-provider-credentials.sql"
  
  log_info "Created ${stack_dir}/scripts/seed-ai-provider-credentials.sql"
}
```

**Integrate into `run_migrations()` function:**

```bash
# After seed-idp-config.sql execution
if [[ -f "${stack_dir}/scripts/seed-ai-provider-credentials.sql" ]]; then
  log_info "Executing seed-ai-provider-credentials.sql..."
  # [same psql execution pattern as IDP seeding]
fi
```

---

### Phase 4: Documentation

**Create:** `docs/guides/ai-provider-authentication.md`

**Contents:**

1. **Overview of Authentication Methods**
   - IAM Role vs Secrets Manager comparison table
   - Security best practices
   - Cost comparison

2. **AWS Bedrock Setup (IAM Role)**
   - Lambda execution role policy example
   - Resource-based policy (if needed)
   - Testing connectivity
   - Troubleshooting

3. **AWS Bedrock Setup (Secrets Manager)**
   - Creating secret in AWS console
   - Storing API key format
   - Lambda permission to read secret
   - Rotation strategy

4. **Azure OpenAI Setup**
   - Obtaining API key from Azure portal
   - Creating AWS secret with Azure key
   - Configuration format
   - Endpoint configuration

5. **Google Vertex AI Setup**
   - Service account creation
   - JSON key download
   - Storing in AWS Secrets Manager
   - Project/location configuration

6. **Testing Provider Connectivity**
   - Using "Discover Models" button
   - Interpreting error messages
   - Common issues and fixes

---

### Phase 5: Terraform Updates

**File:** `templates/_project-infra-template/envs/dev/main.tf`

**Add Lambda permissions for Bedrock (IAM role approach):**

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

# Secrets Manager permissions (for Azure/Google providers)
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

**Documentation:** Explain that:
- IAM role permissions are provisioned automatically for Bedrock
- Users must create Secrets Manager secrets manually for Azure/Google
- Secret naming convention: `{project}/ai/{provider_name}`

---

## Testing Strategy

### Test Scenario 1: Fresh Project with AWS Bedrock (IAM Role)

**Setup:**
1. Run `create-cora-project.sh my-app --with-core-modules`
2. Configure `setup.config.my-app.yaml`:
   ```yaml
   ai_providers:
     aws_bedrock:
       enabled: true
       auth_method: "iam_role"
       credentials_secret_path: ""
   ```
3. Run project creation

**Expected Results:**
- ✅ `platform_rag` table has 1 row with defaults
- ✅ `ai_providers` table has `aws_bedrock` with `credentials_secret_path = NULL`
- ✅ `ai_providers.is_active = true` for aws_bedrock
- ✅ Lambda role has `bedrock:InvokeModel` permission
- ✅ AI Enablement page loads (no 404)
- ✅ "Discover Models" button clickable for AWS Bedrock
- ✅ Models discovered successfully

---

### Test Scenario 2: Fresh Project with Azure OpenAI (Secrets Manager)

**Setup:**
1. Manually create AWS secret: `my-app/ai/azure_openai` with Azure API key
2. Configure `setup.config.my-app.yaml`:
   ```yaml
   ai_providers:
     azure_ai_foundry:
       enabled: true
       auth_method: "secrets_manager"
       credentials_secret_path: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-app/ai/azure_openai"
   ```
3. Run project creation

**Expected Results:**
- ✅ `ai_providers` table has `azure_ai_foundry` with correct ARN
- ✅ Lambda role has `secretsmanager:GetSecretValue` permission
- ✅ "Discover Models" retrieves secret and connects to Azure
- ✅ Models discovered from Azure endpoint

---

### Test Scenario 3: Existing Project Migration

**Setup:**
1. Existing project with empty `platform_rag` table
2. Run migration script manually:
   ```bash
   psql $DB_URL -f scripts/seed-platform-rag.sql
   ```

**Expected Results:**
- ✅ `platform_rag` table populated
- ✅ Idempotent - running twice doesn't create duplicates
- ✅ AI Enablement page loads

---

## Migration Path for Existing Projects

### For test14 and other existing CORA projects:

**Step 1: Add platform_rag seed data**

```sql
-- Run manually via psql or Supabase SQL editor
-- File: scripts/migrations/seed-platform-rag-manual.sql

INSERT INTO public.platform_rag (
    available_embedding_models,
    default_embedding_model,
    embedding_model_costs,
    available_chunking_strategies,
    default_chunking_strategy,
    max_chunk_size_tokens,
    min_chunk_size_tokens,
    search_quality_presets,
    default_search_quality,
    default_similarity_threshold,
    max_search_results_global,
    max_context_tokens_global,
    ocr_enabled,
    processing_timeout_minutes,
    max_concurrent_jobs_global,
    vector_index_type,
    backup_retention_days,
    auto_scaling_enabled,
    max_embedding_batch_size,
    embedding_cache_ttl_hours,
    provider_configurations,
    default_ai_provider,
    active_providers,
    system_prompt
) 
SELECT 
    ARRAY['text-embedding-3-small', 'text-embedding-3-large'],
    'text-embedding-3-small',
    '{"text-embedding-3-small": 1.0, "text-embedding-3-large": 1.5}'::jsonb,
    ARRAY['fixed', 'semantic', 'hybrid'],
    'hybrid',
    2000,
    100,
    '{
      "fast": {"similarity_threshold": 0.6, "max_results": 5},
      "balanced": {"similarity_threshold": 0.7, "max_results": 10},
      "comprehensive": {"similarity_threshold": 0.5, "max_results": 25}
    }'::jsonb,
    'balanced',
    0.7,
    50,
    8000,
    true,
    30,
    100,
    'ivfflat',
    90,
    true,
    100,
    24,
    '{}'::jsonb,
    'openai',
    ARRAY['openai'],
    'You are a helpful AI assistant that provides accurate, well-sourced answers based on the knowledge base. Always cite your sources and acknowledge when you don''t have enough information to answer a question.'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_rag);
```

**Step 2: Configure provider credentials**

For AWS Bedrock (IAM role):
```sql
-- No credential path needed - Lambda role handles auth
UPDATE public.ai_providers
SET is_active = true
WHERE name = 'aws_bedrock';
```

For Azure OpenAI (after creating secret):
```sql
UPDATE public.ai_providers
SET 
  credentials_secret_path = 'arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:test14/ai/azure_openai',
  is_active = true
WHERE name = 'azure_ai_foundry';
```

---

## Success Criteria

### Phase 1: Platform RAG Seeding ✅
- [ ] `006-platform-rag.sql` includes uncommented seed data
- [ ] Seed data uses `WHERE NOT EXISTS` for idempotency
- [ ] Default values match policy project reference
- [ ] Model FKs are NULL initially (no broken references)

### Phase 2: Provider Credentials Configuration ✅
- [ ] `setup.config.example.yaml` includes `ai_providers` section
- [ ] All three auth methods documented with examples
- [ ] Supports aws_bedrock, azure_ai_foundry, google_ai
- [ ] Clear comments explaining each approach

### Phase 3: Project Creation Integration ✅
- [ ] `seed_ai_provider_credentials()` function added to `create-cora-project.sh`
- [ ] Reads `ai_providers` config from YAML
- [ ] Generates `seed-ai-provider-credentials.sql`
- [ ] Integrated into `run_migrations()` function
- [ ] Idempotent execution

### Phase 4: Documentation ✅
- [ ] `docs/guides/ai-provider-authentication.md` created
- [ ] IAM role approach fully documented with examples
- [ ] Secrets Manager approach documented
- [ ] Provider-specific setup instructions (AWS, Azure, Google)
- [ ] Troubleshooting guide

### Phase 5: Terraform Automation ✅
- [ ] Lambda execution role includes Bedrock permissions
- [ ] Lambda execution role includes Secrets Manager permissions
- [ ] Scoped to project-specific secrets
- [ ] Documented in Terraform comments

### Testing ✅
- [ ] Fresh project creation works (AWS Bedrock IAM role)
- [ ] Fresh project creation works (Azure Secrets Manager)
- [ ] Existing project migration works
- [ ] AI Enablement page loads without 404
- [ ] "Discover Models" button functional
- [ ] Models successfully discovered from provider

---

## Implementation Checklist

### Week 1: Schema & Configuration
- [ ] Update `006-platform-rag.sql` with seed data
- [ ] Update `001-ai-providers.sql` (already has seed data, validate)
- [ ] Add `ai_providers` section to `setup.config.example.yaml`
- [ ] Test schema changes in isolated Supabase project

### Week 2: Scripting
- [ ] Add `seed_ai_provider_credentials()` to `create-cora-project.sh`
- [ ] Integrate into `run_migrations()`
- [ ] Test with all three providers (AWS, Azure, Google)
- [ ] Validate idempotency

### Week 3: Terraform & IAM
- [ ] Add Bedrock permissions to Lambda role
- [ ] Add Secrets Manager permissions to Lambda role
- [ ] Document Terraform changes
- [ ] Test IAM policy in dev environment

### Week 4: Documentation & Testing
- [ ] Write `ai-provider-authentication.md`
- [ ] Create migration guide for existing projects
- [ ] Test end-to-end with fresh project
- [ ] Update activeContext.md with completion status

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| IAM role misconfiguration blocks Bedrock access | High | Provide IAM policy templates, CloudFormation examples |
| Secret ARN typos prevent Secrets Manager retrieval | Medium | Validate ARN format in setup.config parsing |
| Users don't understand IAM vs Secrets Manager trade-offs | Medium | Comprehensive documentation with decision matrix |
| Platform_rag seed data violates FK constraints | High | Keep model FKs as NULL initially, document discovery workflow |
| Existing projects break during migration | High | Provide rollback SQL scripts, test migration thoroughly |
| Cross-account Bedrock access fails | Medium | Document cross-account IAM setup with resource policies |

---

## Future Enhancements

1. **Credential Rotation Automation**
   - Lambda function to rotate Secrets Manager secrets
   - CloudWatch Events trigger for rotation
   - Notification on rotation failure

2. **Multi-Region Provider Support**
   - Configure Bedrock regions per provider
   - Fallback regions for high availability

3. **Cost Tracking**
   - CloudWatch metrics for model invocation costs
   - Budget alerts for AI spending

4. **Provider Health Monitoring**
   - Scheduled Lambda to test provider connectivity
   - Dashboard showing provider status

5. **Workload Identity Federation**
   - Support for Google Cloud Workload Identity
   - Azure Managed Identity integration
   - Eliminate long-term credentials entirely

---

## References

- **Policy Project Implementation:** `policy/legacy/pm-app-stack/scripts/migrations/repopulate-platform-rag.sql`
- **CORA Schema Files:** `templates/_cora-core-modules/module-ai/db/schema/`
- **AWS Bedrock IAM:** https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam_id-based-policy-examples.html
- **AWS Secrets Manager:** https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html
- **Azure OpenAI API:** https://learn.microsoft.com/en-us/azure/ai-services/openai/quickstart
- **Google Vertex AI Auth:** https://cloud.google.com/vertex-ai/docs/authentication

---

**Next Steps:**
1. Review and approve this plan
2. Toggle to Act Mode for implementation
3. Start with Phase 1 (Schema updates)
4. Validate each phase before proceeding

---

**Status:** 📋 **AWAITING APPROVAL**  
**Updated:** December 30, 2025, 2:34 PM EST
