# module-voice Configuration Guide

This guide covers all configuration options for the Voice module, including interview configurations, service credentials, and infrastructure settings.

## Table of Contents

- [Interview Configuration](#interview-configuration)
- [Service Credentials](#service-credentials)
- [Infrastructure Configuration](#infrastructure-configuration)
- [Environment Variables](#environment-variables)
- [Feature Flags](#feature-flags)

---

## Interview Configuration

Interview configurations (`voice_configs`) define how the AI interviewer behaves. Each organization can have multiple configurations for different interview types.

### Configuration JSON Schema

```json
{
  "bot_name": "string",
  "system_prompt": "string",
  "initial_message": "string",
  "voice": {
    "provider": "cartesia",
    "voice_id": "string",
    "speed": 1.0
  },
  "transcription": {
    "provider": "deepgram",
    "language": "en-US",
    "model": "nova-2"
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 500
  },
  "interview": {
    "max_duration_minutes": 30,
    "idle_timeout_seconds": 60,
    "questions": []
  }
}
```

### Configuration Fields

#### Bot Settings

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bot_name` | string | Yes | Display name for the AI interviewer |
| `system_prompt` | string | Yes | System prompt defining interviewer behavior |
| `initial_message` | string | Yes | First message spoken when session starts |

#### Voice Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `voice.provider` | string | `cartesia` | TTS provider (`cartesia`) |
| `voice.voice_id` | string | - | Voice ID from provider catalog |
| `voice.speed` | number | `1.0` | Speech speed multiplier (0.5-2.0) |
| `voice.pitch` | number | `1.0` | Voice pitch adjustment (0.5-2.0) |

**Available Cartesia Voices:**

| Voice ID | Description |
|----------|-------------|
| `en-US-Neural2-A` | Professional female (American) |
| `en-US-Neural2-D` | Professional male (American) |
| `en-GB-Neural2-A` | Professional female (British) |
| `en-GB-Neural2-B` | Professional male (British) |

#### Transcription Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `transcription.provider` | string | `deepgram` | STT provider (`deepgram`) |
| `transcription.language` | string | `en-US` | Language code for recognition |
| `transcription.model` | string | `nova-2` | Deepgram model to use |
| `transcription.punctuate` | boolean | `true` | Enable automatic punctuation |
| `transcription.diarize` | boolean | `true` | Enable speaker diarization |

**Supported Languages:**

- `en-US` - English (US)
- `en-GB` - English (UK)
- `es` - Spanish
- `fr` - French
- `de` - German
- `pt` - Portuguese

#### LLM Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `llm.provider` | string | `openai` | LLM provider (via module-ai) |
| `llm.model` | string | `gpt-4` | Model identifier |
| `llm.temperature` | number | `0.7` | Response randomness (0-2) |
| `llm.max_tokens` | number | `500` | Maximum response tokens |

#### Interview Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `interview.max_duration_minutes` | number | `30` | Maximum session length |
| `interview.idle_timeout_seconds` | number | `60` | Disconnect after silence |
| `interview.questions` | array | `[]` | Pre-defined questions |
| `interview.enable_follow_ups` | boolean | `true` | Allow AI follow-up questions |
| `interview.strict_question_order` | boolean | `false` | Enforce question sequence |

### Question Configuration

```json
{
  "questions": [
    {
      "id": "q1",
      "text": "Tell me about your experience with distributed systems.",
      "type": "open",
      "category": "technical",
      "follow_up_enabled": true,
      "max_follow_ups": 2,
      "time_limit_seconds": 180
    },
    {
      "id": "q2",
      "text": "What programming languages are you proficient in?",
      "type": "list",
      "category": "technical",
      "expected_items": ["Python", "JavaScript", "Go", "Rust"],
      "min_items": 2
    }
  ]
}
```

**Question Types:**

| Type | Description |
|------|-------------|
| `open` | Free-form response expected |
| `list` | Multiple items expected |
| `yes_no` | Binary response |
| `rating` | Numeric scale response |
| `scenario` | Situational question |

### Example Configurations

#### Technical Interview

```json
{
  "bot_name": "Technical Interviewer",
  "system_prompt": "You are a senior software engineer conducting a technical interview. Ask probing questions about the candidate's technical experience, problem-solving approach, and system design skills. Be professional but friendly.",
  "initial_message": "Hello! I'm excited to learn more about your technical background today. Let's start with you telling me about a challenging project you've worked on recently.",
  "voice": {
    "provider": "cartesia",
    "voice_id": "en-US-Neural2-D",
    "speed": 1.0
  },
  "transcription": {
    "provider": "deepgram",
    "language": "en-US",
    "model": "nova-2"
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7
  },
  "interview": {
    "max_duration_minutes": 45,
    "idle_timeout_seconds": 90,
    "enable_follow_ups": true,
    "questions": [
      {
        "id": "q1",
        "text": "Tell me about a challenging project you've worked on recently.",
        "type": "open",
        "category": "experience",
        "follow_up_enabled": true
      },
      {
        "id": "q2",
        "text": "How would you design a URL shortening service?",
        "type": "scenario",
        "category": "system-design",
        "follow_up_enabled": true,
        "time_limit_seconds": 600
      }
    ]
  }
}
```

#### Behavioral Interview

```json
{
  "bot_name": "Behavioral Interviewer",
  "system_prompt": "You are an HR specialist conducting a behavioral interview. Use the STAR method (Situation, Task, Action, Result) to guide candidates through their responses. Focus on teamwork, leadership, and problem-solving examples.",
  "initial_message": "Hi there! Today we'll be discussing your past experiences to understand how you approach different workplace situations. Please feel free to take your time with your answers.",
  "voice": {
    "provider": "cartesia",
    "voice_id": "en-US-Neural2-A",
    "speed": 0.95
  },
  "transcription": {
    "provider": "deepgram",
    "language": "en-US",
    "model": "nova-2"
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.6
  },
  "interview": {
    "max_duration_minutes": 30,
    "idle_timeout_seconds": 120,
    "enable_follow_ups": true,
    "questions": [
      {
        "id": "q1",
        "text": "Tell me about a time when you had to work with a difficult team member.",
        "type": "scenario",
        "category": "teamwork",
        "follow_up_enabled": true
      },
      {
        "id": "q2",
        "text": "Describe a situation where you had to meet a tight deadline.",
        "type": "scenario",
        "category": "time-management",
        "follow_up_enabled": true
      }
    ]
  }
}
```

---

## Service Credentials

Voice module requires credentials for external services. These are stored securely in AWS Secrets Manager.

### Required Credentials

| Service | Required | Purpose |
|---------|----------|---------|
| Daily.co | Yes | WebRTC video rooms |
| Deepgram | Yes | Speech-to-text |
| Cartesia | Yes | Text-to-speech |

### Credential Configuration

Credentials are managed through the Admin UI or API. Each credential entry stores:

- **Service Name**: `daily`, `deepgram`, or `cartesia`
- **Secret ARN**: Reference to AWS Secrets Manager secret
- **Config Metadata**: Non-sensitive configuration (e.g., region, tier)
- **Is Active**: Enable/disable flag

### Setting Up Credentials

#### Via Admin UI

1. Navigate to **Platform Admin** → **Voice Credentials**
2. Click **Add Credential**
3. Select the service provider
4. Enter the API key
5. Configure additional settings (if applicable)
6. Click **Save**

#### Via API

```bash
curl -X POST /api/voice/credentials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org_xxx",
    "serviceName": "daily",
    "apiKey": "your-api-key-here",
    "configMetadata": {
      "region": "us-west-2",
      "tier": "scale"
    }
  }'
```

### Service-Specific Setup

#### Daily.co

1. Create account at [daily.co](https://daily.co)
2. Generate API key from Dashboard → Developers → API Keys
3. Note: Scale tier recommended for production (parallel rooms)

**Config Metadata:**
```json
{
  "region": "us-west-2",
  "tier": "scale",
  "recording_enabled": false
}
```

#### Deepgram

1. Create account at [deepgram.com](https://deepgram.com)
2. Generate API key from Console → API Keys
3. Ensure key has real-time transcription permissions

**Config Metadata:**
```json
{
  "tier": "nova",
  "features": ["punctuation", "diarization"]
}
```

#### Cartesia

1. Create account at [cartesia.ai](https://cartesia.ai)
2. Generate API key from Dashboard → API Keys
3. Note available voice IDs for configuration

**Config Metadata:**
```json
{
  "tier": "standard",
  "region": "us"
}
```

---

## Infrastructure Configuration

### Terraform Variables

Configure infrastructure via `infrastructure/variables.tf`:

```hcl
variable "project_prefix" {
  description = "Project prefix for resource naming"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "org_common_layer_arn" {
  description = "ARN of the org-common Lambda layer"
  type        = string
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}

variable "supabase_service_key_arn" {
  description = "Secrets Manager ARN for Supabase service key"
  type        = string
}

variable "ecs_cluster_arn" {
  description = "ARN of ECS cluster for Pipecat bots"
  type        = string
}

variable "transcript_bucket_name" {
  description = "S3 bucket name for transcript storage"
  type        = string
}

variable "standby_queue_url" {
  description = "SQS queue URL for standby bot pool"
  type        = string
  default     = ""
}
```

### ECS Configuration

The Pipecat bot runs on ECS/Fargate. Configure the task definition:

```hcl
# Task definition for Pipecat bot
resource "aws_ecs_task_definition" "pipecat_bot" {
  family                   = "${var.project_prefix}-pipecat-bot"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "pipecat-bot"
      image = "${var.ecr_repo_url}:latest"
      
      environment = [
        { name = "DAILY_ROOM_URL", value = "" },  # Set at runtime
        { name = "DAILY_TOKEN", value = "" },      # Set at runtime
        { name = "CONFIG_JSON", value = "" }       # Set at runtime
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/${var.project_prefix}-pipecat"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "bot"
        }
      }
    }
  ])
}
```

### S3 Bucket Configuration

Configure transcript storage with lifecycle policies:

```hcl
resource "aws_s3_bucket" "transcripts" {
  bucket = "${var.project_prefix}-voice-transcripts-${var.environment}"
}

resource "aws_s3_bucket_lifecycle_configuration" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id

  rule {
    id     = "archive-old-transcripts"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years for compliance
    }
  }
}
```

---

## Environment Variables

### Lambda Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY_ARN` | Yes | Secrets Manager ARN for service key |
| `ECS_CLUSTER_NAME` | Yes | ECS cluster name for bots |
| `ECS_TASK_DEFINITION_ARN` | Yes | Task definition ARN |
| `ECS_SUBNETS` | Yes | Comma-separated subnet IDs |
| `ECS_SECURITY_GROUPS` | Yes | Comma-separated SG IDs |
| `TRANSCRIPT_S3_BUCKET` | Yes | S3 bucket for transcripts |
| `WEBSOCKET_API_URL` | Yes | WebSocket API endpoint |
| `STANDBY_SQS_QUEUE_URL` | No | SQS queue for standby pool |
| `DAILY_API_KEY_SECRET_ARN` | No | Platform-wide Daily.co key |

### Frontend Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_WS_URL=wss://ws.example.com
NEXT_PUBLIC_DAILY_SCRIPT_URL=https://unpkg.com/@daily-co/daily-js
```

---

## Feature Flags

Control module features through configuration:

### Standby Bot Pool

Enable pre-warmed bots for faster session starts:

```json
{
  "standby_pool": {
    "enabled": true,
    "min_bots": 2,
    "max_bots": 10,
    "business_hours": {
      "start": "08:00",
      "end": "18:00",
      "timezone": "America/New_York"
    }
  }
}
```

### Transcript Archival

Configure automatic S3 archival:

```json
{
  "archival": {
    "enabled": true,
    "archive_after_days": 30,
    "delete_from_db_after_archive": false,
    "compression": "gzip"
  }
}
```

### Analytics Generation

Enable AI-powered post-interview analysis:

```json
{
  "analytics": {
    "enabled": true,
    "auto_generate": true,
    "generate_after_completion": true,
    "scoring_model": "gpt-4",
    "scoring_criteria": ["technical_depth", "communication", "problem_solving"]
  }
}
```

---

## Best Practices

### Security

1. **Never expose API keys in frontend code**
2. **Use IAM roles for AWS service access**
3. **Rotate credentials regularly**
4. **Enable CloudTrail for audit logging**

### Performance

1. **Enable standby pool for production workloads**
2. **Use regional deployments close to users**
3. **Configure appropriate timeouts**
4. **Monitor ECS task metrics**

### Cost Optimization

1. **Use spot instances for ECS tasks when possible**
2. **Configure S3 lifecycle policies**
3. **Disable standby pool outside business hours**
4. **Monitor API usage per service**

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Session stuck in "pending" | ECS task failed to start | Check ECS logs, verify subnets/SGs |
| No audio | Daily.co credential invalid | Verify API key, check domain settings |
| Transcription delayed | Deepgram rate limited | Check usage, upgrade tier |
| Bot disconnects early | Idle timeout too short | Increase `idle_timeout_seconds` |

### Diagnostic Commands

```bash
# Check ECS task status
aws ecs describe-tasks --cluster $CLUSTER --tasks $TASK_ARN

# View bot logs
aws logs tail /ecs/pipecat-bot --follow

# Test Daily.co API
curl -H "Authorization: Bearer $DAILY_API_KEY" \
  https://api.daily.co/v1/rooms
```

---

## Related Documentation

- [API Reference](./API-REFERENCE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Technical Specification](../../../docs/specifications/module-voice/MODULE-VOICE-TECHNICAL-SPEC.md)
