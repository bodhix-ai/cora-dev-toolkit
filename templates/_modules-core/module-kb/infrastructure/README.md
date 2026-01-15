# Module-KB Infrastructure

**CORA Core Module (Tier 2)** - Knowledge Base Infrastructure

This Terraform configuration deploys the complete infrastructure for the CORA Knowledge Base module, including Lambda functions for KB management, S3 storage for documents, and SQS queues for async document processing.

---

## Overview

The module-kb infrastructure provides the backend resources needed for:

- **Knowledge Base Management**: CRUD operations for multi-scope KBs (sys, org, workspace, chat)
- **Document Storage**: S3-based storage with presigned URL uploads
- **Async Processing**: SQS-triggered document parsing, chunking, and embedding generation
- **RAG Integration**: pgvector-based semantic search for chat grounding

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│  (Routes defined in outputs.tf, integrated by main project)     │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ├──► Lambda: kb-base
                │    • KB CRUD operations
                │    • Multi-scope routing
                │    • Access control (RPC)
                │
                ├──► Lambda: kb-document
                │    • Presigned URL generation
                │    • Document metadata CRUD
                │    • SQS message publishing
                │
                └──► Lambda: kb-processor (SQS-triggered)
                     • Document parsing (PDF, DOCX, TXT, MD)
                     • Text chunking (sentence-boundary)
                     • Embedding generation (Bedrock Titan V2)
                     • pgvector storage

┌─────────────────────────────────────────────────────────────────┐
│                        Storage Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  S3 Bucket: {project}-{env}-kb-documents                        │
│  • Versioning enabled (30-day retention)                        │
│  • CORS configured for browser uploads                          │
│  • Public access blocked                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Processing Queue                            │
├─────────────────────────────────────────────────────────────────┤
│  SQS Queue: {project}-{env}-kb-processor-queue                  │
│  • Visibility timeout: 600s (10 min)                            │
│  • Max receive count: 3 (then DLQ)                              │
│  • Long polling enabled                                         │
│                                                                  │
│  DLQ: {project}-{env}-kb-processor-dlq                          │
│  • 14-day retention                                             │
│  • CloudWatch alarm on message count                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resources Created

### Lambda Functions

| Function | Memory | Timeout | Purpose |
|----------|--------|---------|---------|
| **kb-base** | 512 MB | 30s | KB CRUD, toggles, multi-scope routing |
| **kb-document** | 256 MB | 30s | Document upload/download, presigned URLs |
| **kb-processor** | 1024 MB | 300s | Async document processing (parse, chunk, embed) |

### Storage

- **S3 Bucket**: `{project}-{env}-kb-documents`
  - Versioning enabled
  - 30-day lifecycle for old versions
  - CORS configured for presigned URL uploads
  - Public access blocked

### Queuing

- **SQS Queue**: `{project}-{env}-kb-processor-queue`
  - Main queue for document processing
  - 600s visibility timeout (2x Lambda timeout)
  - 14-day message retention
  - Long polling (20s)

- **SQS DLQ**: `{project}-{env}-kb-processor-dlq`
  - Dead letter queue for failed messages
  - 3 retries before DLQ

### IAM

- **Lambda Execution Role**: `{project}-{env}-kb-lambda-role`
  - CloudWatch Logs write access
  - Secrets Manager read (Supabase credentials)
  - S3 read/write access
  - SQS publish/consume access

### Monitoring

- **CloudWatch Log Groups**: 14-day retention for all Lambda functions
- **CloudWatch Alarms** (optional, if SNS topic provided):
  - Lambda error alarms (>5 errors in 5 min)
  - SQS DLQ message alarm (any messages in DLQ)

---

## Prerequisites

### Required

1. **Supabase Database**:
   - pgvector extension enabled
   - KB schema deployed (migrations 001-009)
   - RPC functions deployed

2. **AWS Secrets Manager**:
   - Secret with Supabase credentials (URL, anon key, service role key)
   - ARN provided via `supabase_secret_arn` variable

3. **Lambda Layer**:
   - `org-common` layer deployed by module-access
   - Contains Supabase client and shared utilities

4. **Lambda Build Artifacts**:
   - `backend/.build/kb-base.zip`
   - `backend/.build/kb-document.zip`
   - `backend/.build/kb-processor.zip`

### Optional

- **SNS Topic**: For CloudWatch alarm notifications

---

## Deployment

### 1. Build Lambda Functions

From the module root:

```bash
cd backend
./build-all.sh
```

This creates zip files in `backend/.build/` directory.

### 2. Initialize Terraform

```bash
cd infrastructure
terraform init
```

### 3. Configure Variables

Create `terraform.tfvars`:

```hcl
project_name         = "my-project"
environment          = "dev"
module_name          = "kb"
aws_region           = "us-east-1"
supabase_secret_arn  = "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-project-dev-supabase-abc123"
cors_allowed_origins = ["https://my-project.com", "http://localhost:3000"]
log_level            = "INFO"

# Optional: SNS topic for alarms
sns_topic_arn = "arn:aws:sns:us-east-1:123456789012:my-project-dev-alarms"

# Optional: Common tags
common_tags = {
  Project     = "my-project"
  Environment = "dev"
  ManagedBy   = "terraform"
}
```

### 4. Plan and Apply

```bash
terraform plan
terraform apply
```

### 5. Integrate with API Gateway

The `api_routes` output provides all routes that need to be added to the main API Gateway. These should be integrated by the project's main infrastructure.

---

## Configuration

### Lambda Environment Variables

All Lambda functions receive:

- `REGION`: AWS region
- `SUPABASE_SECRET_ARN`: Secrets Manager ARN for database credentials
- `LOG_LEVEL`: Logging verbosity (DEBUG, INFO, WARNING, ERROR)

**kb-document** and **kb-processor** also receive:

- `S3_BUCKET`: Document storage bucket name
- `SQS_QUEUE_URL` (kb-document only): Queue URL for publishing processing messages

### S3 CORS Configuration

The S3 bucket is configured with CORS to allow presigned URL uploads from the browser:

- **Allowed Origins**: Configurable via `cors_allowed_origins` variable
- **Allowed Methods**: GET, PUT, POST, DELETE, HEAD
- **Allowed Headers**: All (`*`)
- **Exposed Headers**: ETag
- **Max Age**: 3000 seconds (50 minutes)

**Security Note**: In production, set `cors_allowed_origins` to specific domains rather than `["*"]`.

### SQS Queue Configuration

- **Visibility Timeout**: 600s (10 minutes) - allows Lambda to process documents without message redelivery
- **Max Receive Count**: 3 - after 3 failed attempts, message moves to DLQ
- **Long Polling**: 20s - reduces API calls and improves throughput

---

## API Routes

The infrastructure creates 3 Lambda functions that handle 38 API routes across 4 scopes:

### kb-base (22 routes)

**Workspace Scope (5 routes):**
- `GET /workspaces/{workspaceId}/kb` - Get workspace KB
- `POST /workspaces/{workspaceId}/kb` - Create workspace KB
- `PATCH /workspaces/{workspaceId}/kb/{kbId}` - Update KB
- `GET /workspaces/{workspaceId}/available-kbs` - List toggleable KBs
- `POST /workspaces/{workspaceId}/kbs/{kbId}/toggle` - Toggle KB

**Chat Scope (4 routes):**
- `GET /chats/{chatId}/kb` - Get chat KB
- `POST /chats/{chatId}/kb` - Create chat KB
- `GET /chats/{chatId}/available-kbs` - List toggleable KBs
- `POST /chats/{chatId}/kbs/{kbId}/toggle` - Toggle KB

**Org Admin Scope (5 routes):**
- `GET /admin/org/kbs` - List org KBs
- `POST /admin/org/kbs` - Create org KB
- `GET /admin/org/kbs/{kbId}` - Get org KB details
- `PATCH /admin/org/kbs/{kbId}` - Update org KB
- `DELETE /admin/org/kbs/{kbId}` - Delete org KB

**Platform Admin Scope (7 routes):**
- `GET /admin/sys/kbs` - List system KBs
- `POST /admin/sys/kbs` - Create system KB
- `GET /admin/sys/kbs/{kbId}` - Get system KB details
- `PATCH /admin/sys/kbs/{kbId}` - Update system KB
- `DELETE /admin/sys/kbs/{kbId}` - Delete system KB
- `POST /admin/sys/kbs/{kbId}/orgs` - Associate system KB with org
- `DELETE /admin/sys/kbs/{kbId}/orgs/{orgId}` - Remove org association

### kb-document (15 routes)

**Workspace Scope (5 routes):**
- `GET /workspaces/{workspaceId}/kb/documents` - List documents
- `POST /workspaces/{workspaceId}/kb/documents` - Get upload URL
- `GET /workspaces/{workspaceId}/kb/documents/{docId}` - Get document metadata
- `DELETE /workspaces/{workspaceId}/kb/documents/{docId}` - Delete document
- `GET /workspaces/{workspaceId}/kb/documents/{docId}/download` - Get download URL

**Chat Scope (4 routes):**
- `GET /chats/{chatId}/kb/documents` - List documents
- `POST /chats/{chatId}/kb/documents` - Get upload URL
- `GET /chats/{chatId}/kb/documents/{docId}` - Get document metadata
- `DELETE /chats/{chatId}/kb/documents/{docId}` - Delete document

**Org Admin Scope (3 routes):**
- `POST /admin/org/kbs/{kbId}/documents` - Upload to org KB
- `GET /admin/org/kbs/{kbId}/documents` - List org KB documents
- `DELETE /admin/org/kbs/{kbId}/documents/{docId}` - Delete from org KB

**Platform Admin Scope (2 routes):**
- `POST /admin/sys/kbs/{kbId}/documents` - Upload to system KB
- `GET /admin/sys/kbs/{kbId}/documents` - List system KB documents

### kb-processor (1 SQS trigger)

- Triggered by SQS messages (not HTTP routes)
- Processes documents asynchronously

---

## Monitoring

### CloudWatch Logs

All Lambda functions write logs to CloudWatch with 14-day retention:

- `/aws/lambda/{project}-{env}-kb-kb-base`
- `/aws/lambda/{project}-{env}-kb-kb-document`
- `/aws/lambda/{project}-{env}-kb-kb-processor`

### CloudWatch Alarms (if SNS topic provided)

- **kb-base-errors**: Triggers if >5 errors in 5 minutes
- **kb-document-errors**: Triggers if >5 errors in 5 minutes
- **kb-processor-errors**: Triggers if >5 errors in 5 minutes
- **sqs-dlq-messages**: Triggers if any messages appear in DLQ

### Metrics to Monitor

- **Lambda Duration**: Track processing time for kb-processor (should be <300s)
- **Lambda Concurrent Executions**: kb-processor limited to 10 concurrent instances
- **SQS Queue Depth**: Messages waiting for processing
- **SQS DLQ Depth**: Failed messages (should be 0)
- **S3 Bucket Size**: Total document storage

---

## Maintenance

### Updating Lambda Code

After rebuilding Lambda functions:

```bash
cd backend
./build-all.sh

cd ../infrastructure
terraform plan  # Should show source_code_hash changes
terraform apply
```

Terraform will automatically detect code changes via `source_code_hash` and deploy updated functions with zero downtime (blue-green deployment via `create_before_destroy`).

### Scaling Considerations

- **kb-processor concurrency**: Currently limited to 10 concurrent instances. Increase via `scaling_config.maximum_concurrency` in `main.tf` if needed.
- **S3 bucket size**: Monitor and implement lifecycle policies if storage costs become high.
- **SQS visibility timeout**: Increase if documents take longer than 10 minutes to process.

### Troubleshooting

**Problem: Documents stuck in "processing" status**
- Check CloudWatch logs for kb-processor Lambda
- Check SQS DLQ for failed messages
- Verify Supabase database connectivity
- Verify AWS Bedrock access for embedding generation

**Problem: Upload failing with CORS error**
- Verify `cors_allowed_origins` includes your domain
- Check browser console for specific CORS error
- Ensure presigned URL not expired (15-min expiration)

**Problem: Lambda timeout errors**
- Check document size (max 50 MB per file)
- Check embedding API latency (AWS Bedrock)
- Consider increasing kb-processor memory (more memory = faster processing)

---

## Security

### IAM Permissions

- Lambda functions use **least privilege** principle
- S3 access limited to module-kb bucket only
- SQS access limited to kb-processor queue only
- Secrets Manager access limited to Supabase secret only

### S3 Security

- Public access **blocked** at bucket level
- Presigned URLs have **15-minute expiration**
- Versioning enabled for **document recovery**
- CORS restricts uploads to **specified origins**

### Network Security

- Lambda functions run in **AWS-managed VPC** (no VPC configuration needed for Supabase)
- Supabase credentials stored in **Secrets Manager** (not environment variables)
- All API routes require **authentication** (enforced by API Gateway authorizer)

---

## Outputs

The infrastructure outputs the following for integration:

- **Lambda ARNs**: For reference and monitoring
- **Lambda Invoke ARNs**: For API Gateway integration
- **S3 Bucket Name/ARN**: For application configuration
- **SQS Queue URL/ARN**: For application configuration
- **API Routes**: Complete route definitions for API Gateway

---

## Dependencies

### Upstream Dependencies (Must be deployed first)

1. **module-access**: Provides org-common Lambda layer
2. **Supabase Database**: With kb schema migrations applied

### Downstream Dependencies (Use this module)

1. **Project API Gateway**: Integrates routes from outputs
2. **module-chat** (future): Uses KB for RAG grounding

---

## Cost Estimation

**Monthly costs for moderate usage (approximate):**

- **Lambda**: $10-50 (based on invocations and duration)
- **S3 Storage**: $0.023 per GB (~$2.30 for 100 GB)
- **S3 Requests**: $0.005 per 1,000 PUT, $0.0004 per 1,000 GET (~$1 for 200K requests)
- **SQS**: $0.40 per million requests (first 1M free)
- **CloudWatch Logs**: $0.50 per GB ingested (~$5 for 10 GB)
- **AWS Bedrock (Titan V2)**: ~$0.0001 per 1K tokens (~$10 for 100M tokens)

**Total estimated monthly cost**: $30-70 for typical usage

---

## Version History

- **v1.0.0** (2026-01-15): Initial infrastructure deployment
  - 3 Lambda functions (kb-base, kb-document, kb-processor)
  - S3 bucket with CORS and versioning
  - SQS queue with DLQ
  - CloudWatch monitoring and alarms

---

## Support

For issues or questions:

- **CORA Documentation**: See `docs/specifications/module-kb/`
- **Implementation Plan**: See `docs/plans/plan_module-kb-implementation.md`
- **Standards**: See `docs/standards/standard_LAMBDA-DEPLOYMENT.md`

---

**Last Updated**: January 15, 2026  
**Terraform Version**: >= 1.5.0  
**AWS Provider Version**: >= 5.0
