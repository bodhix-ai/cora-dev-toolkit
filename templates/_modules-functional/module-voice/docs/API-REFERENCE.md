# module-voice API Reference

Complete API documentation for the Voice module endpoints.

## Base URL

```
https://{api-domain}/api/voice
```

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token from authentication |
| `Content-Type` | Yes (POST/PUT) | `application/json` |
| `X-Org-Id` | No | Organization ID (can also be in query/body) |

## Response Format

All responses follow the standard CORA response format:

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid session status",
    "details": { ... }
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `CONFLICT` | 409 | Resource state conflict |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Sessions

Manage voice interview sessions.

### List Sessions

Retrieve a paginated list of sessions for an organization.

```
GET /sessions
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgId` | string | Yes | Organization ID |
| `workspaceId` | string | No | Filter by workspace |
| `status` | string | No | Filter by status |
| `interviewType` | string | No | Filter by interview type |
| `page` | number | No | Page number (default: 1) |
| `pageSize` | number | No | Items per page (default: 20, max: 100) |
| `sortBy` | string | No | Sort field (default: `createdAt`) |
| `sortOrder` | string | No | `asc` or `desc` (default: `desc`) |

**Example Request:**

```bash
curl -X GET "/api/voice/sessions?orgId=org_abc&status=completed&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Example Response:**

```json
{
  "data": [
    {
      "id": "sess_123",
      "orgId": "org_abc",
      "workspaceId": "ws_456",
      "candidateName": "Jane Doe",
      "candidateEmail": "jane@example.com",
      "interviewType": "technical",
      "status": "completed",
      "dailyRoomUrl": null,
      "dailyRoomName": "interview-abc123",
      "startedAt": "2026-01-15T14:30:00Z",
      "completedAt": "2026-01-15T15:00:00Z",
      "durationSeconds": 1800,
      "createdAt": "2026-01-15T14:00:00Z",
      "updatedAt": "2026-01-15T15:00:00Z",
      "createdBy": "user_789"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "pageSize": 10
  }
}
```

---

### Get Session

Retrieve a single session by ID.

```
GET /sessions/{id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Example Request:**

```bash
curl -X GET "/api/voice/sessions/sess_123" \
  -H "Authorization: Bearer $TOKEN"
```

**Example Response:**

```json
{
  "data": {
    "id": "sess_123",
    "orgId": "org_abc",
    "workspaceId": "ws_456",
    "candidateName": "Jane Doe",
    "candidateEmail": "jane@example.com",
    "interviewType": "technical",
    "status": "completed",
    "dailyRoomUrl": "https://example.daily.co/interview-abc123",
    "dailyRoomName": "interview-abc123",
    "dailyRoomToken": null,
    "sessionMetadata": {
      "configId": "cfg_789",
      "botTaskArn": "arn:aws:ecs:..."
    },
    "startedAt": "2026-01-15T14:30:00Z",
    "completedAt": "2026-01-15T15:00:00Z",
    "durationSeconds": 1800,
    "createdAt": "2026-01-15T14:00:00Z",
    "updatedAt": "2026-01-15T15:00:00Z",
    "createdBy": "user_789",
    "updatedBy": "user_789"
  }
}
```

---

### Create Session

Create a new interview session.

```
POST /sessions
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orgId` | string | Yes | Organization ID |
| `workspaceId` | string | No | Workspace ID |
| `candidateName` | string | Yes | Candidate's full name |
| `candidateEmail` | string | Yes | Candidate's email address |
| `interviewType` | string | Yes | Interview type identifier |
| `configId` | string | No | Voice config ID to use |
| `sessionMetadata` | object | No | Additional metadata |

**Example Request:**

```bash
curl -X POST "/api/voice/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org_abc",
    "workspaceId": "ws_456",
    "candidateName": "John Smith",
    "candidateEmail": "john@example.com",
    "interviewType": "technical",
    "configId": "cfg_789"
  }'
```

**Example Response:**

```json
{
  "data": {
    "id": "sess_456",
    "orgId": "org_abc",
    "workspaceId": "ws_456",
    "candidateName": "John Smith",
    "candidateEmail": "john@example.com",
    "interviewType": "technical",
    "status": "pending",
    "dailyRoomUrl": null,
    "dailyRoomName": null,
    "dailyRoomToken": null,
    "sessionMetadata": {
      "configId": "cfg_789"
    },
    "startedAt": null,
    "completedAt": null,
    "durationSeconds": null,
    "createdAt": "2026-01-16T10:00:00Z",
    "updatedAt": "2026-01-16T10:00:00Z",
    "createdBy": "user_123"
  }
}
```

---

### Update Session

Update an existing session.

```
PUT /sessions/{id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `candidateName` | string | No | Updated candidate name |
| `candidateEmail` | string | No | Updated candidate email |
| `status` | string | No | Updated status |
| `sessionMetadata` | object | No | Updated metadata |

**Valid Status Transitions:**

- `pending` → `ready`, `cancelled`
- `ready` → `active`, `cancelled`
- `active` → `completed`, `failed`, `cancelled`

**Example Request:**

```bash
curl -X PUT "/api/voice/sessions/sess_456" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled"
  }'
```

---

### Delete Session

Delete a session (soft delete).

```
DELETE /sessions/{id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Note:** Only sessions in `pending` or `cancelled` status can be deleted.

**Example Request:**

```bash
curl -X DELETE "/api/voice/sessions/sess_456" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Start Session Bot

Start the AI bot for a session. Creates a Daily.co room and launches the Pipecat bot.

```
POST /sessions/{id}/start
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `configId` | string | No | Override config ID |
| `useStandbyBot` | boolean | No | Use standby bot if available |

**Example Request:**

```bash
curl -X POST "/api/voice/sessions/sess_456/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "useStandbyBot": true
  }'
```

**Example Response:**

```json
{
  "data": {
    "id": "sess_456",
    "status": "ready",
    "dailyRoomUrl": "https://example.daily.co/interview-xyz789",
    "dailyRoomName": "interview-xyz789",
    "dailyRoomToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sessionMetadata": {
      "configId": "cfg_789",
      "botTaskArn": "arn:aws:ecs:us-east-1:123456789:task/cluster/abc123"
    }
  }
}
```

---

### List Session KBs

List knowledge bases associated with a session.

```
GET /sessions/{id}/kbs
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Session ID |

**Example Response:**

```json
{
  "data": [
    {
      "id": "skb_123",
      "sessionId": "sess_456",
      "kbId": "kb_789",
      "kbName": "Technical Documentation",
      "isEnabled": true,
      "addedAt": "2026-01-16T10:00:00Z",
      "addedBy": "user_123"
    }
  ]
}
```

---

### Add Session KB

Associate a knowledge base with a session.

```
POST /sessions/{id}/kbs
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kbId` | string | Yes | Knowledge base ID |

**Example Request:**

```bash
curl -X POST "/api/voice/sessions/sess_456/kbs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kbId": "kb_789"
  }'
```

---

### Toggle Session KB

Enable or disable a KB association.

```
PUT /sessions/{id}/kbs/{kbId}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isEnabled` | boolean | Yes | Enable/disable flag |

---

### Remove Session KB

Remove a KB association from a session.

```
DELETE /sessions/{id}/kbs/{kbId}
```

---

## Configurations

Manage interview configurations.

### List Configs

Retrieve configurations for an organization.

```
GET /configs
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgId` | string | Yes | Organization ID |
| `interviewType` | string | No | Filter by interview type |
| `isActive` | boolean | No | Filter by active status |

**Example Response:**

```json
{
  "data": [
    {
      "id": "cfg_123",
      "orgId": "org_abc",
      "name": "Technical Interview - Senior",
      "interviewType": "technical",
      "description": "Configuration for senior technical interviews",
      "configJson": {
        "bot_name": "Technical Interviewer",
        "system_prompt": "...",
        "voice": { ... },
        "transcription": { ... },
        "llm": { ... },
        "interview": { ... }
      },
      "isActive": true,
      "createdAt": "2026-01-10T09:00:00Z",
      "updatedAt": "2026-01-15T14:00:00Z",
      "createdBy": "user_456"
    }
  ]
}
```

---

### Get Config

Retrieve a single configuration.

```
GET /configs/{id}
```

---

### Create Config

Create a new interview configuration.

```
POST /configs
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orgId` | string | Yes | Organization ID |
| `name` | string | Yes | Configuration name |
| `interviewType` | string | Yes | Interview type identifier |
| `description` | string | No | Configuration description |
| `configJson` | object | Yes | Configuration JSON (see Configuration Guide) |
| `isActive` | boolean | No | Active status (default: true) |

**Example Request:**

```bash
curl -X POST "/api/voice/configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org_abc",
    "name": "Behavioral Interview",
    "interviewType": "behavioral",
    "description": "Standard behavioral interview configuration",
    "configJson": {
      "bot_name": "HR Interviewer",
      "system_prompt": "You are conducting a behavioral interview...",
      "initial_message": "Hello! Let'\''s discuss your experiences.",
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
        "temperature": 0.7
      },
      "interview": {
        "max_duration_minutes": 30,
        "questions": []
      }
    }
  }'
```

---

### Update Config

Update an existing configuration.

```
PUT /configs/{id}
```

**Request Body:** Same as Create Config (all fields optional)

---

### Delete Config

Delete a configuration.

```
DELETE /configs/{id}
```

**Note:** Configurations in use by active sessions cannot be deleted.

---

## Credentials

Manage voice service credentials. Requires admin permissions.

### List Credentials

List credential metadata for an organization.

```
GET /credentials
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgId` | string | Yes | Organization ID |
| `serviceName` | string | No | Filter by service |

**Example Response:**

```json
{
  "data": [
    {
      "id": "cred_123",
      "orgId": "org_abc",
      "serviceName": "daily",
      "configMetadata": {
        "region": "us-west-2",
        "tier": "scale"
      },
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    },
    {
      "id": "cred_456",
      "orgId": "org_abc",
      "serviceName": "deepgram",
      "configMetadata": {
        "tier": "nova"
      },
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Note:** API keys are never returned in responses. Only metadata is exposed.

---

### Create/Update Credential

Create or update a service credential.

```
POST /credentials
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orgId` | string | Yes | Organization ID |
| `serviceName` | string | Yes | Service name (`daily`, `deepgram`, `cartesia`) |
| `apiKey` | string | Yes | API key (stored in Secrets Manager) |
| `configMetadata` | object | No | Non-sensitive configuration |

**Example Request:**

```bash
curl -X POST "/api/voice/credentials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org_abc",
    "serviceName": "daily",
    "apiKey": "your-daily-api-key",
    "configMetadata": {
      "region": "us-west-2",
      "tier": "scale"
    }
  }'
```

---

### Delete Credential

Delete a service credential.

```
DELETE /credentials/{id}
```

---

### Validate Credential

Test that a credential is valid.

```
POST /credentials/{id}/validate
```

**Example Response:**

```json
{
  "data": {
    "valid": true,
    "serviceName": "daily",
    "message": "API key is valid",
    "details": {
      "account": "example-org",
      "tier": "scale",
      "rooms_limit": 100
    }
  }
}
```

---

## Transcripts

Access interview transcripts.

### List Transcripts

List transcripts for an organization.

```
GET /transcripts
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgId` | string | Yes | Organization ID |
| `sessionId` | string | No | Filter by session |
| `candidateName` | string | No | Search by candidate name |
| `interviewType` | string | No | Filter by interview type |
| `page` | number | No | Page number |
| `pageSize` | number | No | Items per page |

**Example Response:**

```json
{
  "data": [
    {
      "id": "trans_123",
      "orgId": "org_abc",
      "sessionId": "sess_456",
      "candidateName": "Jane Doe",
      "interviewType": "technical",
      "summary": "Candidate demonstrated strong technical skills...",
      "transcriptText": null,
      "transcriptS3Url": "s3://bucket/transcripts/trans_123.json",
      "metadata": {
        "duration_seconds": 1800,
        "word_count": 5420,
        "speaker_count": 2
      },
      "createdAt": "2026-01-15T15:00:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### Get Transcript

Retrieve a single transcript with full content.

```
GET /transcripts/{id}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeText` | boolean | No | Include full transcript text |

**Example Response:**

```json
{
  "data": {
    "id": "trans_123",
    "orgId": "org_abc",
    "sessionId": "sess_456",
    "candidateName": "Jane Doe",
    "interviewType": "technical",
    "summary": "Candidate demonstrated strong technical skills...",
    "transcriptText": "[00:00:05] Bot: Hello! I'm excited to learn more about your technical background...\n[00:00:15] Candidate: Thank you! I've been working as a software engineer for...",
    "transcriptS3Url": "s3://bucket/transcripts/trans_123.json",
    "metadata": {
      "duration_seconds": 1800,
      "word_count": 5420,
      "speaker_count": 2,
      "segments": [
        {
          "speaker": "bot",
          "start_time": 5.0,
          "end_time": 14.5,
          "text": "Hello! I'm excited to learn more about your technical background..."
        }
      ]
    },
    "createdAt": "2026-01-15T15:00:00Z"
  }
}
```

---

## Analytics

Access AI-generated interview analytics.

### Get Analytics by Session

Retrieve analytics for a session.

```
GET /analytics/{sessionId}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |

**Example Response:**

```json
{
  "data": {
    "id": "anal_123",
    "orgId": "org_abc",
    "sessionId": "sess_456",
    "transcriptId": "trans_123",
    "score": 78,
    "strengths": [
      "Strong technical knowledge in distributed systems",
      "Clear communication and structured thinking",
      "Good problem-solving approach"
    ],
    "weaknesses": [
      "Limited experience with frontend technologies",
      "Could improve on time management during problem-solving"
    ],
    "recommendations": [
      "Consider for backend engineering roles",
      "May benefit from frontend pairing sessions",
      "Strong candidate for system design focused positions"
    ],
    "detailedAnalysis": {
      "categories": {
        "technical_depth": {
          "score": 85,
          "notes": "Demonstrated deep understanding of backend systems..."
        },
        "communication": {
          "score": 80,
          "notes": "Clear explanations, good use of examples..."
        },
        "problem_solving": {
          "score": 70,
          "notes": "Good approach but took time to structure solution..."
        }
      },
      "overall_impression": "Strong technical candidate with solid fundamentals...",
      "suggested_follow_up": [
        "Deep dive on scalability experience",
        "Frontend collaboration assessment"
      ]
    },
    "createdAt": "2026-01-15T15:05:00Z"
  }
}
```

---

### List Analytics

List analytics for an organization.

```
GET /analytics
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgId` | string | Yes | Organization ID |
| `minScore` | number | No | Minimum score filter |
| `maxScore` | number | No | Maximum score filter |
| `page` | number | No | Page number |
| `pageSize` | number | No | Items per page |

---

## WebSocket API

Real-time transcript streaming via WebSocket.

### Connection

```
wss://{ws-domain}/voice?sessionId={sessionId}&token={token}
```

**Connection Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID to subscribe to |
| `token` | string | Yes | Authentication token |

### Message Types

#### Transcript Update

Received when new transcript segments are available.

```json
{
  "type": "transcript",
  "sessionId": "sess_456",
  "data": {
    "speaker": "candidate",
    "text": "I've been working with distributed systems for five years...",
    "startTime": 125.5,
    "endTime": 132.8,
    "isFinal": true
  }
}
```

#### Status Update

Received when session status changes.

```json
{
  "type": "status",
  "sessionId": "sess_456",
  "data": {
    "status": "active",
    "previousStatus": "ready",
    "timestamp": "2026-01-16T10:30:00Z"
  }
}
```

#### Error

Received on errors.

```json
{
  "type": "error",
  "sessionId": "sess_456",
  "data": {
    "code": "BOT_DISCONNECTED",
    "message": "Interview bot has disconnected unexpectedly"
  }
}
```

### Client Messages

#### Ping

Keep connection alive.

```json
{
  "type": "ping"
}
```

Response:

```json
{
  "type": "pong"
}
```

---

## Rate Limits

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Sessions (read) | 100 req/min |
| Sessions (write) | 20 req/min |
| Configs | 50 req/min |
| Credentials | 10 req/min |
| Transcripts | 50 req/min |
| Analytics | 50 req/min |
| WebSocket | 10 connections/org |

---

## Pagination

List endpoints support cursor-based pagination:

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTIzfQ=="
  }
}
```

Use `cursor` parameter for next page:

```
GET /sessions?orgId=org_abc&cursor=eyJpZCI6MTIzfQ==
```

---

## Related Documentation

- [Configuration Guide](./CONFIGURATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Technical Specification](../../../docs/specifications/module-voice/MODULE-VOICE-TECHNICAL-SPEC.md)
