# module-voice

AI-powered voice interviews with Daily.co WebRTC, real-time transcription, and ECS-based Pipecat bot orchestration.

## Overview

The Voice module enables organizations to conduct AI-powered voice interviews with candidates. It integrates with Daily.co for WebRTC video rooms, Deepgram for speech-to-text transcription, Cartesia for text-to-speech synthesis, and uses ECS/Fargate to run Pipecat interview bots.

## Features

- **AI Voice Interviews**: Automated interview sessions with AI-powered conversational bots
- **Real-time Transcription**: Live transcript streaming via WebSocket
- **Daily.co Integration**: WebRTC video rooms for interview sessions
- **ECS/Fargate Bot Runtime**: Scalable Pipecat bot orchestration
- **Standby Bot Pool**: Pre-warmed bots during business hours for fast session starts
- **AI Analytics**: Post-interview scoring and analysis
- **Multi-tenant Credentials**: Organization-specific service credentials
- **S3 Transcript Archival**: Long-term transcript storage with lifecycle policies

## Module Structure

```
module-voice/
├── module.json                    # Module metadata and configuration
├── README.md                      # This file
├── backend/
│   └── lambdas/
│       ├── voice-sessions/        # Session CRUD and bot management
│       ├── voice-configs/         # Interview configuration CRUD
│       ├── voice-credentials/     # Service credentials management
│       ├── voice-transcripts/     # Transcript retrieval
│       ├── voice-analytics/       # AI-generated analytics
│       └── voice-websocket/       # Real-time transcript streaming
├── db/
│   └── schema/
│       ├── 001-voice-sessions.sql
│       ├── 002-voice-transcripts.sql
│       ├── 003-voice-configs.sql
│       ├── 004-voice-credentials.sql
│       ├── 005-voice-analytics.sql
│       └── 006-voice-rpc-functions.sql
├── frontend/
│   ├── components/
│   │   ├── sessions/              # Session-related components
│   │   ├── configs/               # Configuration components
│   │   ├── transcripts/           # Transcript viewer components
│   │   └── interview/             # Interview room components
│   ├── hooks/                     # React hooks
│   ├── lib/                       # API client
│   ├── pages/                     # Page components
│   ├── store/                     # State management
│   └── types/                     # TypeScript types
├── infrastructure/
│   ├── main.tf                    # Lambda, IAM, S3, SQS resources
│   ├── variables.tf               # Required variables
│   └── outputs.tf                 # API routes for APIGW integration
└── routes/
    └── voice/                     # Next.js routes
```

## Dependencies

### Core Modules (Required)

| Module | Usage |
|--------|-------|
| **module-access** | Authentication, user/org context, database operations |
| **module-ai** | OpenAI credentials for interview LLM |
| **module-mgmt** | Health checks, module registration |

### External Services

| Service | Purpose |
|---------|---------|
| **Daily.co** | WebRTC video rooms |
| **Deepgram** | Speech-to-text transcription |
| **Cartesia** | Text-to-speech synthesis |
| **ECS/Fargate** | Pipecat bot runtime |
| **SQS** | Standby bot pool queue |
| **S3** | Transcript archival |
| **AWS Secrets Manager** | Credential storage |

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `voice_sessions` | Interview sessions with Daily.co room details |
| `voice_transcripts` | Interview transcripts with S3 archival |
| `voice_configs` | Pipecat interview configurations |
| `voice_credentials` | Voice service credentials (Daily, Deepgram, Cartesia) |
| `voice_analytics` | AI-generated interview analysis and scores |

### Session Status Lifecycle

```
pending → ready → active → completed
                        ↘ failed
                        ↘ cancelled
```

## API Endpoints

### Sessions

```
GET    /api/voice/sessions?orgId=xxx     List sessions
GET    /api/voice/sessions/{id}          Get session by ID
POST   /api/voice/sessions               Create session
PUT    /api/voice/sessions/{id}          Update session
DELETE /api/voice/sessions/{id}          Delete session
POST   /api/voice/sessions/{id}/start    Start bot for session
```

### Configs

```
GET    /api/voice/configs?orgId=xxx      List configs
GET    /api/voice/configs/{id}           Get config by ID
POST   /api/voice/configs                Create config
PUT    /api/voice/configs/{id}           Update config
DELETE /api/voice/configs/{id}           Delete config
```

### Credentials (Admin only)

```
GET    /api/voice/credentials?orgId=xxx  List credentials metadata
POST   /api/voice/credentials            Create/update credential
DELETE /api/voice/credentials/{id}       Delete credential
POST   /api/voice/credentials/{id}/validate  Validate credential
```

### Transcripts

```
GET    /api/voice/transcripts?orgId=xxx  List transcripts
GET    /api/voice/transcripts/{id}       Get transcript by ID
```

### Analytics

```
GET    /api/voice/analytics/{sessionId}  Get analytics by session
```

## Frontend Usage

### List Sessions

```typescript
import { useVoiceSessions } from '@cora/module-voice';

function SessionList({ orgId }: { orgId: string }) {
  const { sessions, loading, error, refetch } = useVoiceSessions(orgId);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <List>
      {sessions.map(session => (
        <SessionCard key={session.id} session={session} />
      ))}
    </List>
  );
}
```

### Start Interview Session

```typescript
import { useVoiceSession } from '@cora/module-voice';

function InterviewRoom({ sessionId }: { sessionId: string }) {
  const { session, startSession, loading } = useVoiceSession(sessionId);

  const handleStart = async () => {
    await startSession();
    // Session now has dailyRoomUrl and dailyRoomToken
  };

  if (session?.status === 'ready') {
    return <DailyRoom url={session.dailyRoomUrl} token={session.dailyRoomToken} />;
  }

  return (
    <Button onClick={handleStart} disabled={loading}>
      Start Interview
    </Button>
  );
}
```

### Real-time Transcript

```typescript
import { useRealTimeTranscript } from '@cora/module-voice';

function LiveTranscript({ sessionId }: { sessionId: string }) {
  const { segments, isConnected } = useRealTimeTranscript(sessionId);

  return (
    <Box>
      <Typography variant="caption">
        {isConnected ? '🟢 Live' : '🔴 Disconnected'}
      </Typography>
      {segments.map((segment, i) => (
        <Typography key={i}>
          <strong>{segment.speaker}:</strong> {segment.text}
        </Typography>
      ))}
    </Box>
  );
}
```

## Configuration

### Interview Config JSON Schema

```json
{
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
    "temperature": 0.7
  },
  "interview": {
    "max_duration_minutes": 30,
    "questions": [
      {
        "id": "q1",
        "text": "Tell me about your experience...",
        "type": "open",
        "follow_up_enabled": true
      }
    ]
  }
}
```

## Infrastructure

### Required AWS Resources

- **Lambda Functions**: 6 functions for API handlers
- **S3 Bucket**: Transcript storage with lifecycle policy
- **SQS Queue**: Standby bot pool
- **ECS Cluster**: Pipecat bot runtime
- **IAM Roles**: Lambda execution, ECS task execution
- **Secrets Manager**: Service credentials storage

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ECS_CLUSTER_NAME` | ECS cluster for Pipecat bots |
| `ECS_TASK_DEFINITION_ARN` | Task definition for bot containers |
| `ECS_SUBNETS` | Comma-separated subnet IDs |
| `ECS_SECURITY_GROUPS` | Comma-separated security group IDs |
| `TRANSCRIPT_S3_BUCKET` | S3 bucket for transcripts |
| `STANDBY_SQS_QUEUE_URL` | SQS queue URL for bot pool |
| `WEBSOCKET_API_URL` | WebSocket API endpoint |
| `DAILY_API_KEY_SECRET_ARN` | Secrets Manager ARN for Daily.co key |

## Development

### Local Development

```bash
# Install dependencies
pnpm install

# Build Lambda functions
cd backend && ./build.sh

# Run frontend
cd frontend && pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run backend tests
pnpm test:backend

# Run frontend tests
pnpm test:frontend
```

### Compliance Checks

```bash
# From cora-dev-toolkit root
python3 validation/cora-validate.py --module module-voice
```

## Deployment

See the infrastructure documentation for deployment instructions:

- [Module Deployment Guide](../../docs/guides/guide_MODULE-BUILD-AND-DEPLOYMENT-REQUIREMENTS.md)
- [Infrastructure Variables](./infrastructure/variables.tf)

## Specifications

Detailed specifications are available in the docs:

- [Parent Specification](../../docs/specifications/module-voice/MODULE-VOICE-SPEC.md)
- [Technical Specification](../../docs/specifications/module-voice/MODULE-VOICE-TECHNICAL-SPEC.md)
- [User UX Specification](../../docs/specifications/module-voice/MODULE-VOICE-USER-UX-SPEC.md)
- [Admin UX Specification](../../docs/specifications/module-voice/MODULE-VOICE-ADMIN-UX-SPEC.md)

## License

Part of the CORA Development Toolkit.
