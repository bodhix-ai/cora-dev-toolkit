# Module-KB Development Guide

**Module**: module-kb (Knowledge Base)  
**Version**: 1.0.0  
**Last Updated**: January 15, 2026

## Overview

This guide covers development and customization of the module-kb Knowledge Base module, including adding document parsers, customizing chunking strategies, testing embedding generation, and monitoring the processing pipeline.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Adding New Document Parsers](#adding-new-document-parsers)
3. [Customizing Chunking Strategy](#customizing-chunking-strategy)
4. [Testing Embedding Generation](#testing-embedding-generation)
5. [Monitoring Processing Pipeline](#monitoring-processing-pipeline)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Lambda Functions

| Lambda | Purpose | Trigger |
|--------|---------|---------|
| `kb-base` | KB CRUD, toggle management | API Gateway |
| `kb-document` | Document upload/download via presigned URLs | API Gateway |
| `kb-processor` | Async document parsing and embedding | SQS |

### Processing Flow

```
User Upload → kb-document Lambda → S3 Upload → SQS Message → kb-processor Lambda
                                                                    ↓
                                                             Parse Document
                                                                    ↓
                                                             Chunk Text
                                                                    ↓
                                                             Generate Embeddings
                                                                    ↓
                                                             Store in pgvector
```

### Database Tables

- `kb_bases` - KB metadata (name, scope, config)
- `kb_docs` - Document metadata (filename, status, s3_key)
- `kb_chunks` - RAG chunks with pgvector embeddings
- `kb_access_*` - Access control tables (sys, orgs, ws, chats)

---

## Adding New Document Parsers

### Current Supported Formats

- PDF (via PyPDF2)
- DOCX (via python-docx)
- TXT (plain text)
- MD (Markdown)

### Adding a New Parser

**Location**: `templates/_modules-core/module-kb/backend/lambdas/kb-processor/lambda_function.py`

#### Step 1: Add Parser Function

```python
def parse_xlsx(file_content: bytes) -> str:
    """
    Parse XLSX file and extract text content.
    
    Args:
        file_content: Raw bytes of the XLSX file
        
    Returns:
        Extracted text content as string
    """
    import openpyxl
    from io import BytesIO
    
    workbook = openpyxl.load_workbook(BytesIO(file_content))
    text_parts = []
    
    for sheet in workbook.worksheets:
        text_parts.append(f"## Sheet: {sheet.title}\n")
        for row in sheet.iter_rows(values_only=True):
            row_text = " | ".join(str(cell) if cell else "" for cell in row)
            if row_text.strip():
                text_parts.append(row_text)
    
    return "\n".join(text_parts)
```

#### Step 2: Register Parser in MIME Type Map

```python
PARSERS = {
    "application/pdf": parse_pdf,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": parse_docx,
    "text/plain": parse_txt,
    "text/markdown": parse_md,
    # Add new parser
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": parse_xlsx,
}
```

#### Step 3: Update Allowed MIME Types

**Location**: `templates/_modules-core/module-kb/backend/lambdas/kb-document/lambda_function.py`

```python
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    # Add new type
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]
```

#### Step 4: Add Dependencies

**Location**: `templates/_modules-core/module-kb/backend/lambdas/kb-processor/requirements.txt`

```
openpyxl==3.1.2
```

#### Step 5: Update Frontend File Validation

**Location**: `templates/_modules-core/module-kb/frontend/components/DocumentUploadZone.tsx`

```typescript
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.xlsx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
```

---

## Customizing Chunking Strategy

### Default Configuration

- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters
- **Strategy**: Fixed-size with sentence boundary preservation

### Per-KB Configuration

Chunking parameters are stored in `kb_bases.config`:

```json
{
  "chunkSize": 1000,
  "chunkOverlap": 200,
  "preserveSentences": true
}
```

### Implementing Custom Chunking

**Location**: `templates/_modules-core/module-kb/backend/lambdas/kb-processor/lambda_function.py`

#### Semantic Chunking (Advanced)

```python
def chunk_semantic(text: str, max_chunk_size: int = 1000) -> list[dict]:
    """
    Semantic chunking that preserves paragraph and section boundaries.
    
    Args:
        text: Full document text
        max_chunk_size: Maximum characters per chunk
        
    Returns:
        List of chunks with metadata
    """
    import re
    
    # Split by paragraphs (double newlines)
    paragraphs = re.split(r'\n\n+', text)
    
    chunks = []
    current_chunk = []
    current_size = 0
    
    for para in paragraphs:
        para_size = len(para)
        
        if current_size + para_size > max_chunk_size and current_chunk:
            # Save current chunk
            chunks.append({
                "content": "\n\n".join(current_chunk),
                "paragraph_count": len(current_chunk)
            })
            current_chunk = []
            current_size = 0
        
        current_chunk.append(para)
        current_size += para_size
    
    # Don't forget the last chunk
    if current_chunk:
        chunks.append({
            "content": "\n\n".join(current_chunk),
            "paragraph_count": len(current_chunk)
        })
    
    return chunks
```

#### Heading-Aware Chunking

```python
def chunk_by_headings(text: str, max_chunk_size: int = 2000) -> list[dict]:
    """
    Chunk by document headings, keeping sections together.
    
    Args:
        text: Full document text (Markdown format)
        max_chunk_size: Maximum characters per chunk
        
    Returns:
        List of chunks with heading metadata
    """
    import re
    
    # Split by headings (# ## ### etc.)
    sections = re.split(r'(^#{1,6}\s+.+$)', text, flags=re.MULTILINE)
    
    chunks = []
    current_heading = None
    current_content = []
    
    for section in sections:
        if re.match(r'^#{1,6}\s+', section):
            # This is a heading
            if current_content:
                chunks.append({
                    "content": "\n".join(current_content),
                    "heading": current_heading
                })
                current_content = []
            current_heading = section.strip()
            current_content.append(section)
        else:
            current_content.append(section)
    
    # Last section
    if current_content:
        chunks.append({
            "content": "\n".join(current_content),
            "heading": current_heading
        })
    
    return chunks
```

---

## Testing Embedding Generation

### Local Testing Setup

#### 1. Set Up Test Environment

```bash
cd templates/_modules-core/module-kb/backend/lambdas/kb-processor

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio
```

#### 2. Create Test File

```python
# test_embeddings.py
import pytest
from lambda_function import generate_embeddings, chunk_text

class TestChunking:
    def test_chunk_text_basic(self):
        text = "A" * 2500
        chunks = chunk_text(text, chunk_size=1000, overlap=200)
        
        assert len(chunks) == 3
        assert len(chunks[0]) == 1000
        
    def test_chunk_text_preserves_sentences(self):
        text = "First sentence. Second sentence. Third sentence."
        chunks = chunk_text(text, chunk_size=25, overlap=5)
        
        # Chunks should break at sentence boundaries
        for chunk in chunks:
            assert chunk.endswith('.') or chunk == chunks[-1]

class TestEmbeddings:
    @pytest.mark.asyncio
    async def test_generate_embeddings_openai(self):
        """Test embedding generation with OpenAI."""
        chunks = ["Hello world", "Test document"]
        
        # Requires OPENAI_API_KEY environment variable
        embeddings = await generate_embeddings(
            chunks=chunks,
            provider="openai",
            model="text-embedding-3-small",
            api_key=os.environ.get("OPENAI_API_KEY")
        )
        
        assert len(embeddings) == 2
        assert len(embeddings[0]) == 1536  # OpenAI dimension
        
    @pytest.mark.asyncio
    async def test_generate_embeddings_bedrock(self):
        """Test embedding generation with AWS Bedrock."""
        chunks = ["Hello world", "Test document"]
        
        # Requires AWS credentials
        embeddings = await generate_embeddings(
            chunks=chunks,
            provider="bedrock",
            model="amazon.titan-embed-text-v2:0",
            api_key=None  # Uses IAM role
        )
        
        assert len(embeddings) == 2
        assert len(embeddings[0]) == 1024  # Titan V2 dimension
```

#### 3. Run Tests

```bash
# Run all tests
pytest test_embeddings.py -v

# Run specific test
pytest test_embeddings.py::TestChunking::test_chunk_text_basic -v

# Run with coverage
pytest test_embeddings.py --cov=lambda_function --cov-report=html
```

### Integration Testing

#### Test Document Processing End-to-End

```bash
# 1. Upload test document via API
curl -X POST "https://api.example.com/workspaces/{wsId}/kb/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.pdf", "fileSize": 1024}'

# 2. Upload to presigned URL
curl -X PUT "$PRESIGNED_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf

# 3. Check processing status
curl "https://api.example.com/workspaces/{wsId}/kb/documents/{docId}" \
  -H "Authorization: Bearer $TOKEN"

# 4. Verify chunks in database
SELECT COUNT(*) FROM kb_chunks WHERE document_id = '{docId}';
```

---

## Monitoring Processing Pipeline

### CloudWatch Metrics

The kb-processor Lambda publishes custom metrics:

| Metric | Description |
|--------|-------------|
| `DocumentsProcessed` | Count of successfully processed documents |
| `DocumentsFailed` | Count of failed documents |
| `ChunksGenerated` | Total chunks created |
| `EmbeddingLatency` | Time to generate embeddings (ms) |
| `ProcessingDuration` | Total processing time (ms) |

### CloudWatch Alarms

Recommended alarms for production:

```hcl
# Terraform example
resource "aws_cloudwatch_metric_alarm" "kb_processor_errors" {
  alarm_name          = "${var.project_name}-kb-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  
  dimensions = {
    FunctionName = aws_lambda_function.kb_processor.function_name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "kb_processor_duration" {
  alarm_name          = "${var.project_name}-kb-processor-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 240000  # 4 minutes (Lambda timeout is 5)
  
  dimensions = {
    FunctionName = aws_lambda_function.kb_processor.function_name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

### Viewing Processing Logs

```bash
# Tail kb-processor logs
aws logs tail /aws/lambda/{project}-kb-processor --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/{project}-kb-processor \
  --filter-pattern "ERROR"

# Search for specific document
aws logs filter-log-events \
  --log-group-name /aws/lambda/{project}-kb-processor \
  --filter-pattern "document_id={doc-id}"
```

### Database Monitoring Queries

```sql
-- Check processing status distribution
SELECT status, COUNT(*) 
FROM kb_docs 
GROUP BY status;

-- Find failed documents with errors
SELECT id, filename, error_message, created_at
FROM kb_docs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- Check chunk distribution by KB
SELECT 
  kb.name,
  COUNT(DISTINCT d.id) as doc_count,
  COUNT(c.id) as chunk_count,
  AVG(LENGTH(c.content)) as avg_chunk_size
FROM kb_bases kb
LEFT JOIN kb_docs d ON d.kb_id = kb.id
LEFT JOIN kb_chunks c ON c.document_id = d.id
GROUP BY kb.id, kb.name;

-- Check embedding dimensions consistency
SELECT 
  embedding_model,
  array_length(embedding, 1) as dimension,
  COUNT(*) as count
FROM kb_chunks
WHERE embedding IS NOT NULL
GROUP BY embedding_model, array_length(embedding, 1);
```

### SQS Dead Letter Queue

Failed messages go to DLQ. To investigate:

```bash
# View DLQ messages
aws sqs receive-message \
  --queue-url https://sqs.{region}.amazonaws.com/{account}/{project}-kb-processor-dlq \
  --max-number-of-messages 10

# Reprocess failed messages (after fixing issue)
aws sqs send-message \
  --queue-url https://sqs.{region}.amazonaws.com/{account}/{project}-kb-processor \
  --message-body '{"document_id": "xxx", "action": "reindex"}'
```

---

## Troubleshooting

### Common Issues

#### 1. Document Stuck in "processing" Status

**Symptoms**: Document shows "processing" for > 5 minutes

**Diagnosis**:
```bash
# Check if SQS message was consumed
aws sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names ApproximateNumberOfMessages

# Check Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value={project}-kb-processor \
  --start-time 2026-01-15T00:00:00Z \
  --end-time 2026-01-15T23:59:59Z \
  --period 300 \
  --statistics Sum
```

**Solutions**:
- Check Lambda logs for errors
- Verify SQS trigger is configured correctly
- Check Lambda timeout (should be 300s)

#### 2. Embeddings Not Generated

**Symptoms**: Chunks exist but have NULL embeddings

**Diagnosis**:
```sql
SELECT COUNT(*) FROM kb_chunks WHERE embedding IS NULL;
```

**Solutions**:
- Check embedding provider API key
- Verify module-ai platform config exists
- Check rate limiting (OpenAI, etc.)

#### 3. pgvector Dimension Mismatch

**Symptoms**: Error "expected X dimensions, got Y"

**Cause**: Embedding model changed after chunks were created

**Solution**:
```sql
-- Check current dimensions
SELECT array_length(embedding, 1), COUNT(*) 
FROM kb_chunks 
WHERE embedding IS NOT NULL 
GROUP BY 1;

-- If migration needed, re-index affected documents
UPDATE kb_docs 
SET status = 'pending' 
WHERE id IN (
  SELECT DISTINCT document_id 
  FROM kb_chunks 
  WHERE array_length(embedding, 1) != 1024  -- Expected dimension
);
```

#### 4. S3 Presigned URL Expired

**Symptoms**: 403 Forbidden when uploading

**Cause**: Upload took > 15 minutes

**Solution**: Request new presigned URL and retry upload

#### 5. Large Document Processing Timeout

**Symptoms**: Lambda times out on large files

**Solutions**:
1. Increase Lambda timeout (max 15 min for async)
2. Implement chunked processing
3. Add file size limits (default 50MB)

### Debug Mode

Enable debug logging in Lambda:

```python
# In lambda_function.py
import logging
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)  # Change from INFO to DEBUG
```

### Health Check Endpoint

Add to kb-base Lambda:

```python
@router.get("/kb/health")
def health_check():
    """
    KB Module Health Check
    
    Returns:
        Health status with component checks
    """
    checks = {
        "database": check_database_connection(),
        "s3": check_s3_access(),
        "embedding_config": check_embedding_config(),
    }
    
    all_healthy = all(checks.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }
```

---

## Best Practices

### 1. Document Size Limits

- Enforce max file size (50MB default)
- Consider document splitting for large files
- Monitor storage costs

### 2. Embedding Model Selection

| Model | Dimension | Best For |
|-------|-----------|----------|
| Titan V2 (Bedrock) | 1024 | Default, cost-effective |
| text-embedding-3-small | 1536 | Higher accuracy |
| text-embedding-3-large | 3072 | Maximum accuracy |

### 3. Chunking Strategy Selection

| Strategy | Use Case |
|----------|----------|
| Fixed-size | General documents |
| Semantic | Technical documentation |
| Heading-aware | Structured documents |

### 4. Performance Optimization

- Use batch embedding generation
- Implement connection pooling for database
- Cache embedding configurations

### 5. Security

- Encrypt S3 bucket at rest
- Use presigned URLs with short expiration
- Implement RLS for multi-tenant isolation

---

## References

- [Module-KB README](../../templates/_modules-core/module-kb/README.md)
- [Technical Specification](../specifications/module-kb/MODULE-KB-TECHNICAL-SPEC.md)
- [User UX Specification](../specifications/module-kb/MODULE-KB-USER-UX-SPEC.md)
- [Admin UX Specification](../specifications/module-kb/MODULE-KB-ADMIN-UX-SPEC.md)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [AWS Bedrock Titan Embeddings](https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html)
