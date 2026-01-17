# Voice Module - Data Model Specification

**Module Name:** module-voice  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 16, 2026

**Parent Specification:** [MODULE-VOICE-TECHNICAL-SPEC.md](../MODULE-VOICE-TECHNICAL-SPEC.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Entity: voice_sessions](#2-entity-voice_sessions)
3. [Entity: voice_transcripts](#3-entity-voice_transcripts)
4. [Entity: voice_configs](#4-entity-voice_configs)
5. [Entity: voice_credentials](#5-entity-voice_credentials)
6. [Entity: voice_analytics](#6-entity-voice_analytics)
7. [Entity: voice_session_kb](#7-entity-voice_session_kb)

---

## 1. Overview

The module-voice data model consists of 6 entities:

| Entity | Purpose | Key Relationships |
|--------|---------|-------------------|
| voice_sessions | Interview sessions with Daily.co room details | belongs_to: orgs, workspaces; has_many: transcripts, analytics, session_kb |
| voice_transcripts | Interview transcripts with S3 archival | belongs_to: voice_sessions |
| voice_configs | Pipecat interview configurations | belongs_to: orgs; has_many: sessions |
| voice_credentials | Voice service credentials (Daily, Deepgram, Cartesia) | belongs_to: orgs |
| voice_analytics | AI-generated interview analysis | belongs_to: voice_sessions, voice_transcripts |
| voice_session_kb | Junction table for KB grounding | belongs_to: voice_sessions, kb_bases |

### Naming Conventions

- All tables use `voice_` prefix
- Snake_case for database columns
- camelCase for API responses
- Junction tables use singular nouns per CORA standard

---

## 2. Entity: voice_sessions

**Purpose:** Tracks voice interview sessions with Daily.co room details and lifecycle state.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to orgs(id) | Organization (multi-tenant) |
| workspace_id | UUID | No | NULL | FK to workspaces(id) | Optional workspace association |
| candidate_name | VARCHAR(255) | No | NULL | - | Interview candidate name |
| candidate_email | VARCHAR(255) | No | NULL | - | Interview candidate email |
| interview_type | VARCHAR(100) | Yes | - | NOT NULL | Type of interview (e.g., technical, behavioral) |
| config_id | UUID | No | NULL | FK to voice_configs(id) | Associated interview configuration |
| status | VARCHAR(50) | Yes | 'pending' | CHECK constraint | Session lifecycle status |
| daily_room_url | TEXT | No | NULL | - | Daily.co room URL |
| daily_room_name | VARCHAR(255) | No | NULL | - | Daily.co room name |
| daily_room_token | TEXT | No | NULL | - | Daily.co participant token |
| ecs_task_arn | TEXT | No | NULL | - | ECS task ARN for Pipecat bot |
| session_metadata | JSONB | No | '{}' | - | Additional session metadata |
| started_at | TIMESTAMPTZ | No | NULL | - | When interview started |
| completed_at | TIMESTAMPTZ | No | NULL | - | When interview completed |
| duration_seconds | INTEGER | No | NULL | - | Total interview duration |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

### Status Values

| Status | Description | Transitions To |
|--------|-------------|----------------|
| pending | Session created, Daily.co room not yet ready | ready, failed, cancelled |
| ready | Daily.co room created, waiting for participant | active, cancelled |
| active | Interview in progress | completed, failed, cancelled |
| completed | Interview finished successfully | - |
| failed | Error occurred during session | - |
| cancelled | Session cancelled by user | - |

### Relationships

```
voice_sessions
├── belongs_to: orgs (org_id → orgs.id)
├── belongs_to: workspaces (workspace_id → workspaces.id) [optional]
├── belongs_to: auth.users (created_by → auth.users.id)
├── belongs_to: voice_configs (config_id → voice_configs.id)
├── has_many: voice_transcripts (via session_id FK)
├── has_one: voice_analytics (via session_id FK)
└── has_many: voice_session_kb (via session_id FK)
```

### Validation Rules

**Field Validation:**
- `interview_type`: Required, 1-100 characters
- `status`: Must be one of: pending, ready, active, completed, failed, cancelled
- `org_id`: User must be member of organization
- `candidate_email`: If provided, must be valid email format
- `duration_seconds`: If provided, must be non-negative

**Business Rules:**
1. Status can only transition forward (pending → ready → active → completed/failed)
2. `started_at` is set when status changes to `active`
3. `completed_at` and `duration_seconds` are set when status changes to `completed`
4. Daily.co room token expires after 24 hours
5. ECS task ARN is set when bot is started
6. Sessions can be scoped to a workspace (like chat_sessions)
7. Sessions can have multiple KBs for AI grounding

---

## 3. Entity: voice_transcripts

**Purpose:** Stores interview transcripts with database and S3 storage for archival.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to orgs(id) | Organization (multi-tenant) |
| session_id | UUID | Yes | - | FK to voice_sessions(id) | Parent session |
| transcript_text | TEXT | No | NULL | - | Full transcript text |
| transcript_s3_url | TEXT | No | NULL | - | S3 URL for archived transcript |
| candidate_name | VARCHAR(255) | No | NULL | - | Denormalized from session |
| interview_type | VARCHAR(100) | No | NULL | - | Denormalized from session |
| summary | TEXT | No | NULL | - | AI-generated summary |
| word_count | INTEGER | No | NULL | - | Total word count |
| speaker_segments | JSONB | No | '[]' | - | Array of speaker segments |
| metadata | JSONB | No | '{}' | - | Additional metadata |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

### Speaker Segments Schema

```json
{
  "speaker_segments": [
    {
      "speaker": "bot",
      "text": "Hello, welcome to your interview.",
      "start_time": 0.0,
      "end_time": 2.5,
      "confidence": 0.98
    },
    {
      "speaker": "candidate",
      "text": "Thank you, I'm excited to be here.",
      "start_time": 3.0,
      "end_time": 5.2,
      "confidence": 0.95
    }
  ]
}
```

### Relationships

```
voice_transcripts
├── belongs_to: orgs (org_id → orgs.id)
├── belongs_to: voice_sessions (session_id → voice_sessions.id)
├── belongs_to: auth.users (created_by → auth.users.id)
└── has_one: voice_analytics (via transcript_id FK)
```

### Validation Rules

**Field Validation:**
- `session_id`: Required, must exist in voice_sessions
- `transcript_s3_url`: If provided, must be valid S3 URL

**Business Rules:**
1. Created when interview completes or is archived
2. S3 URL populated when archived to cold storage
3. Denormalized fields copied from session at creation time

---

## 4. Entity: voice_configs

**Purpose:** JSON-based Pipecat interview configurations per organization.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to orgs(id) | Organization (multi-tenant) |
| name | VARCHAR(255) | Yes | - | NOT NULL | Configuration name |
| interview_type | VARCHAR(100) | Yes | - | NOT NULL | Type of interview |
| description | TEXT | No | NULL | - | Configuration description |
| config_json | JSONB | Yes | - | NOT NULL | Pipecat configuration |
| is_active | BOOLEAN | Yes | true | - | Whether config is active |
| version | INTEGER | Yes | 1 | - | Configuration version |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

### Config JSON Schema

```json
{
  "config_json": {
    "bot_name": "Interview Assistant",
    "system_prompt": "You are conducting a technical interview...",
    "initial_message": "Hello! I'm your interview assistant today.",
    "voice": {
      "provider": "cartesia",
      "voice_id": "en-US-Neural2-A",
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
      "questions": [
        {
          "id": "q1",
          "text": "Tell me about your experience with...",
          "type": "open",
          "follow_up_enabled": true
        }
      ],
      "scoring_rubric": {
        "criteria": ["communication", "technical_depth", "problem_solving"]
      }
    }
  }
}
```

### Relationships

```
voice_configs
├── belongs_to: orgs (org_id → orgs.id)
├── belongs_to: auth.users (created_by → auth.users.id)
└── has_many: voice_sessions (via config_id FK)
```

### Validation Rules

**Field Validation:**
- `name`: Required, 1-255 characters, unique per organization
- `interview_type`: Required, 1-100 characters
- `config_json`: Required, must be valid JSON matching schema

**Business Rules:**
1. Unique name per organization
2. Version incremented on each update
3. Only active configs can be used for new sessions

---

## 5. Entity: voice_credentials

**Purpose:** Voice-specific AI service credentials (Daily.co, Deepgram, Cartesia). OpenAI credentials are managed by module-ai.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to orgs(id) | Organization (multi-tenant) |
| service_name | VARCHAR(50) | Yes | - | CHECK constraint | Service: daily, deepgram, cartesia |
| credentials_secret_arn | TEXT | Yes | - | NOT NULL | AWS Secrets Manager ARN |
| config_metadata | JSONB | No | '{}' | - | Service-specific configuration |
| is_active | BOOLEAN | Yes | true | - | Whether credential is active |
| last_validated_at | TIMESTAMPTZ | No | NULL | - | Last successful validation |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

### Service Names

| Service | Purpose | Config Metadata |
|---------|---------|-----------------|
| daily | WebRTC rooms | `{"region": "us-west-2", "max_participants": 2}` |
| deepgram | Speech-to-text | `{"model": "nova-2", "language": "en-US"}` |
| cartesia | Text-to-speech | `{"voice_id": "...", "speed": 1.0}` |

### Relationships

```
voice_credentials
├── belongs_to: orgs (org_id → orgs.id)
└── belongs_to: auth.users (created_by → auth.users.id)
```

### Validation Rules

**Field Validation:**
- `service_name`: Must be one of: daily, deepgram, cartesia
- `credentials_secret_arn`: Required, valid AWS Secrets Manager ARN format
- One credential per service per organization (UNIQUE constraint)

**Business Rules:**
1. Actual credentials stored in AWS Secrets Manager, not database
2. Only active credentials are used
3. `last_validated_at` updated when credentials are verified

---

## 6. Entity: voice_analytics

**Purpose:** AI-generated interview analysis, scores, and recommendations.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to orgs(id) | Organization (multi-tenant) |
| session_id | UUID | Yes | - | FK to voice_sessions(id) | Parent session |
| transcript_id | UUID | No | NULL | FK to voice_transcripts(id) | Associated transcript |
| overall_score | NUMERIC(5,2) | No | NULL | CHECK (0-100) | Overall interview score |
| category_scores | JSONB | No | '{}' | - | Scores by category |
| strengths | TEXT[] | No | '{}' | - | Identified strengths |
| weaknesses | TEXT[] | No | '{}' | - | Areas for improvement |
| recommendations | TEXT[] | No | '{}' | - | Recommendations |
| key_moments | JSONB | No | '[]' | - | Notable interview moments |
| detailed_analysis | JSONB | No | '{}' | - | Full AI analysis |
| model_used | VARCHAR(100) | No | NULL | - | AI model used for analysis |
| processing_time_ms | INTEGER | No | NULL | - | Analysis processing time |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |

### Category Scores Schema

```json
{
  "category_scores": {
    "communication": {
      "score": 85,
      "weight": 0.25,
      "feedback": "Clear and articulate responses"
    },
    "technical_depth": {
      "score": 72,
      "weight": 0.35,
      "feedback": "Good understanding, could go deeper"
    },
    "problem_solving": {
      "score": 90,
      "weight": 0.25,
      "feedback": "Excellent analytical approach"
    },
    "cultural_fit": {
      "score": 88,
      "weight": 0.15,
      "feedback": "Strong alignment with values"
    }
  }
}
```

### Key Moments Schema

```json
{
  "key_moments": [
    {
      "timestamp": 145.5,
      "type": "strength",
      "description": "Excellent explanation of system design",
      "quote": "I would approach this by..."
    },
    {
      "timestamp": 320.2,
      "type": "concern",
      "description": "Hesitation on scalability question",
      "quote": "I'm not entirely sure..."
    }
  ]
}
```

### Relationships

```
voice_analytics
├── belongs_to: orgs (org_id → orgs.id)
├── belongs_to: voice_sessions (session_id → voice_sessions.id)
├── belongs_to: voice_transcripts (transcript_id → voice_transcripts.id)
└── belongs_to: auth.users (created_by → auth.users.id)
```

### Validation Rules

**Field Validation:**
- `session_id`: Required, must exist in voice_sessions
- `overall_score`: If provided, must be 0-100

**Business Rules:**
1. Generated after transcript processing completes
2. One analytics record per session
3. AI-driven analysis using OpenAI via module-ai

---

## 7. Entity: voice_session_kb

**Purpose:** Junction table linking voice sessions to knowledge bases for AI grounding.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| session_id | UUID | Yes | - | FK to voice_sessions(id) | Parent session |
| kb_id | UUID | Yes | - | FK to kb_bases(id) | Knowledge base |
| is_enabled | BOOLEAN | Yes | true | - | Whether KB is enabled for this session |
| added_at | TIMESTAMPTZ | Yes | NOW() | - | When KB was associated |
| added_by | UUID | Yes | - | FK to auth.users(id) | User who added the association |

### Relationships

```
voice_session_kb
├── belongs_to: voice_sessions (session_id → voice_sessions.id)
├── belongs_to: kb_bases (kb_id → kb_bases.id)
└── belongs_to: auth.users (added_by → auth.users.id)
```

### Validation Rules

**Field Validation:**
- `session_id`: Required, must exist in voice_sessions
- `kb_id`: Required, must exist in kb_bases
- UNIQUE constraint on (session_id, kb_id)

**Business Rules:**
1. Same pattern as `chat_session_kb` in module-chat
2. Users can toggle KBs on/off per session
3. KBs provide context for AI voice responses during interviews

---

**Document Version:** 1.0  
**Last Updated:** January 16, 2026
