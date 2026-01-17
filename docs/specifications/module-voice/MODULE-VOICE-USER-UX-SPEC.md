# Voice Module - User UX Specification

**Module Name:** module-voice  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 16, 2026

**Parent Specification:** [MODULE-VOICE-SPEC.md](./MODULE-VOICE-SPEC.md)

---

## Table of Contents

1. [User Personas](#1-user-personas)
2. [Use Cases](#2-use-cases)
3. [User Journeys](#3-user-journeys)
4. [Page Specifications](#4-page-specifications)
5. [Component Library Usage](#5-component-library-usage)
6. [Interaction Patterns](#6-interaction-patterns)
7. [Mobile Responsiveness](#7-mobile-responsiveness)
8. [Accessibility Requirements](#8-accessibility-requirements)
9. [Frontend Testing Requirements](#9-frontend-testing-requirements)

---

## 1. User Personas

### 1.1 Primary Persona: HR Manager / Recruiter

**Role:** Talent Acquisition Specialist

**Goals:**
- Conduct efficient screening interviews at scale
- Standardize interview processes across candidates
- Review transcripts and analytics to make hiring decisions
- Reduce time-to-hire with AI-powered interviews

**Pain Points:**
- Scheduling conflicts with live interviews
- Inconsistent interview quality across interviewers
- Time-consuming manual transcript review
- Difficulty comparing candidates objectively

**Technical Proficiency:** Intermediate

**Frequency of Use:** Daily

**Context of Use:**
- **Device:** Desktop (primary), Tablet (occasional)
- **Location:** Office, Remote
- **Time constraints:** High (managing multiple candidates)

### 1.2 Secondary Persona: Interview Candidate

**Role:** Job Applicant

**Goals:**
- Complete interview on their own schedule
- Understand what to expect in the interview
- Feel comfortable with the AI interviewer
- Demonstrate skills effectively

**Pain Points:**
- Unfamiliarity with AI interview format
- Technical difficulties with audio/video
- Anxiety about being recorded
- Uncertainty about evaluation criteria

**Technical Proficiency:** Varies (Novice to Advanced)

**Frequency of Use:** One-time (per application)

**Context of Use:**
- **Device:** Desktop (recommended), Mobile (possible)
- **Location:** Home, Library, Quiet space
- **Time constraints:** Fixed interview duration (15-30 min)

### 1.3 Tertiary Persona: Hiring Manager

**Role:** Department Manager reviewing candidates

**Goals:**
- Review interview results quickly
- Understand candidate strengths/weaknesses
- Make data-driven hiring decisions
- Compare candidates objectively

**Pain Points:**
- Limited time to review interviews
- Need for actionable insights
- Difficulty accessing key moments

**Technical Proficiency:** Intermediate

**Frequency of Use:** Weekly

---

## 2. Use Cases

### 2.1 Use Case: Create Interview Session

**Actor:** HR Manager

**Preconditions:**
- User is logged in
- User is member of an organization
- Interview configuration exists

**Main Flow:**
1. User navigates to Voice Interviews page
2. User clicks "New Interview" button
3. System displays create session form
4. User fills in:
   - Candidate name (optional)
   - Candidate email (optional)
   - Interview type (select from configs)
5. User clicks "Create Session"
6. System creates session with status "pending"
7. System displays session card with "Start" button
8. User copies interview link or sends to candidate

**Alternative Flows:**
- **4a. No configs available**
  - System prompts to create config first
  - User navigates to config management
  
- **6a. Creation fails**
  - System displays error message
  - User retries

**Postconditions:**
- Session created in "pending" status
- Session appears in interview list

**Frequency:** High (multiple per day)

### 2.2 Use Case: Start Interview Session

**Actor:** HR Manager or Candidate

**Preconditions:**
- Session exists in "pending" or "ready" status
- User has interview link/token

**Main Flow:**
1. User clicks "Start Interview" button
2. System creates Daily.co room
3. System starts Pipecat bot (or requests from standby pool)
4. System displays interview room with Daily.co embed
5. User grants microphone/camera permissions
6. AI bot greets user and begins interview
7. Real-time transcript appears in side panel
8. Interview proceeds through questions
9. Bot announces interview completion
10. System updates session to "completed"
11. System displays completion confirmation

**Alternative Flows:**
- **3a. Bot startup fails**
  - System retries (up to 3 times)
  - If still fails, show error with support contact
  
- **5a. Permissions denied**
  - System shows instructions for enabling permissions
  
- **7a. WebSocket disconnects**
  - System attempts reconnection
  - Shows "Reconnecting..." indicator

**Postconditions:**
- Session in "completed" or "failed" status
- Transcript saved to database
- Analytics generated (async)

**Frequency:** High

### 2.3 Use Case: Review Interview Transcript

**Actor:** HR Manager or Hiring Manager

**Preconditions:**
- Session is completed
- Transcript exists

**Main Flow:**
1. User navigates to completed session
2. User clicks "View Transcript" tab
3. System displays full transcript with speaker labels
4. User reads through conversation
5. User can jump to specific timestamps
6. User reviews AI-generated summary
7. User can export transcript (PDF/TXT)

**Alternative Flows:**
- **3a. Transcript still processing**
  - System shows "Processing..." indicator
  - User can return later

**Postconditions:**
- User has reviewed transcript

**Frequency:** Medium

### 2.4 Use Case: View Interview Analytics

**Actor:** HR Manager or Hiring Manager

**Preconditions:**
- Session is completed
- Analytics have been generated

**Main Flow:**
1. User navigates to completed session
2. User clicks "Analytics" tab
3. System displays:
   - Overall score (0-100)
   - Category breakdown (communication, technical, etc.)
   - Strengths list
   - Areas for improvement
   - Key moments with timestamps
4. User clicks key moment to jump to transcript
5. User reviews recommendations
6. User makes hiring decision

**Postconditions:**
- User has reviewed analytics
- User can make informed decision

**Frequency:** Medium

---

## 3. User Journeys

### 3.1 Journey: First Interview Setup (HR Manager)

**Scenario:** HR Manager sets up first AI interview for a candidate

**Steps:**

1. **Navigate to Voice Module**
   - Entry: Left navigation → "Voice Interviews"
   - Visual: Microphone icon with module name
   - Expected action: Click to open interview list

2. **View Empty State**
   - View: Empty interview list
   - Content: "No interviews yet. Create your first AI interview."
   - Visual: Illustration of AI interviewer
   - CTA: "New Interview" button

3. **Create Interview**
   - View: Create session modal/page
   - Fields: Interview type selector, candidate info
   - Help: Tooltips explaining each field
   - Action: Fill form, click "Create"

4. **Start or Share**
   - View: Session card with options
   - Options: "Start Now" or "Copy Link"
   - Decision: User chooses path

5. **Monitor Interview**
   - View: Live interview or waiting for candidate
   - Feedback: Real-time status updates

**Journey Map:**

```
Navigate → Empty State → Create → Start/Share → Monitor → Review
  (Nav)     (List)       (Form)   (Session)    (Live)    (Results)
```

**Pain Points:**
- May not know which interview type to select
- Might be unsure how to share link with candidate

**Solutions:**
- Default/recommended interview type marked
- Clear "Copy Link" button with sharing instructions

### 3.2 Journey: Candidate Interview Experience

**Scenario:** Candidate completes an AI interview

**Steps:**

1. **Receive Link**
   - Entry: Email/SMS with interview link
   - Content: Instructions, expected duration, tips
   - CTA: "Start Interview" button

2. **Landing Page**
   - View: Pre-interview preparation page
   - Content: What to expect, audio/video check
   - Requirements: Microphone permission prompt
   - CTA: "Begin Interview" button

3. **Interview Room**
   - View: Daily.co video room
   - Features: AI bot video/avatar, self-view
   - Overlay: Live transcript (optional)
   - Controls: Mute, end interview

4. **Interview Progress**
   - Flow: Bot asks questions, candidate responds
   - Feedback: Visual indicators of listening/speaking
   - Timer: Optional time remaining display

5. **Completion**
   - View: Thank you message
   - Content: Next steps, timeline expectations
   - Optional: Brief feedback form

**Journey Map:**

```
Receive Link → Landing → Permission → Interview → Completion
   (Email)     (Prep)    (Browser)    (Room)       (Thanks)
```

**Pain Points:**
- Technical difficulties with permissions
- Uncertainty about AI responses
- Not knowing how long interview will take

**Solutions:**
- Clear permission prompts with troubleshooting
- Natural bot responses with thinking indicators
- Progress indicator showing question count

### 3.3 Journey: Review Multiple Candidates (Hiring Manager)

**Scenario:** Hiring Manager reviews 5 candidates' interviews

**Steps:**

1. **Access Interview List**
   - View: Filtered list of completed interviews
   - Filter: By role, date, score
   - Sort: By score, date

2. **Quick Scan**
   - View: Session cards with scores
   - Info: Candidate name, score, date, duration
   - Action: Click to expand

3. **Deep Dive**
   - View: Full analytics for selected candidate
   - Compare: Category scores
   - Review: Key moments

4. **Compare Candidates**
   - View: Side-by-side comparison (future feature)
   - Metrics: Overall scores, category breakdowns

5. **Make Decision**
   - Action: Mark favorites, add notes
   - Export: Summary report

**Journey Map:**

```
List → Scan → Select → Review → Compare → Decide
```

---

## 4. Page Specifications

### 4.1 Page: Voice Interviews List

**Route:** `/[org-slug]/voice`

**Purpose:** Display all interview sessions for the organization

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: {Org} > Voice Interviews                        │
├─────────────────────────────────────────────────────────────┤
│ Header:                                                     │
│   Voice Interviews [Title]              [New Interview Btn] │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [All] [Pending] [Active] [Completed]                  │
├─────────────────────────────────────────────────────────────┤
│ Filters & Search:                                           │
│   [Search candidate...] [Type ▼] [Date Range ▼]            │
├─────────────────────────────────────────────────────────────┤
│ Session Cards:                                              │
│   ┌───────────────────────────────────────────────────────┐│
│   │ [Status Badge]                           [Score: 85]  ││
│   │ Candidate: John Doe                                   ││
│   │ Type: Technical Interview                             ││
│   │ Created: Jan 15, 2026 • Duration: 25 min              ││
│   │                                                       ││
│   │ [View Details] [Start/Resume] [⋮ More]               ││
│   └───────────────────────────────────────────────────────┘│
│   [More session cards...]                                   │
├─────────────────────────────────────────────────────────────┤
│ Pagination: ← Previous | Page 1 of 5 | Next →              │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Library | Props | Notes |
|-----------|---------|-------|-------|
| Breadcrumb | MUI | links, current | Standard nav |
| PageHeader | Custom | title, action | With New button |
| Tabs | MUI Tabs | value, onChange | Filter by status |
| SearchBar | MUI TextField | value, onChange | Debounced 300ms |
| SessionCard | Custom | session, onStart, onView | Action buttons |
| ScoreBadge | Custom | score | Color-coded |
| StatusBadge | MUI Chip | status | pending/active/completed |
| Pagination | MUI | page, count | Standard paging |

**Data Loading:**

```typescript
const { 
  sessions, 
  loading, 
  error,
  refetch 
} = useVoiceSessions(client, currentOrg.id, {
  status: activeTab,
  search: searchTerm,
  interviewType: typeFilter
});
```

**States:**

- **Loading**: Skeleton session cards (3-4 placeholders)
- **Empty**: Illustration + "No interviews yet" + CTA
- **Error**: Error alert with retry button
- **Loaded**: Session cards with data

**Empty State:**

```
┌─────────────────────────────────────────────────┐
│           [🎙️ Microphone Illustration]          │
│                                                 │
│          No voice interviews yet                │
│                                                 │
│   Create your first AI-powered interview to    │
│   screen candidates efficiently.               │
│                                                 │
│            [New Interview Button]              │
└─────────────────────────────────────────────────┘
```

**Mobile Behavior:**
- Single column card layout
- Filters collapse into dropdown
- Sticky "New" button at bottom
- Infinite scroll instead of pagination

### 4.2 Page: Session Detail

**Route:** `/[org-slug]/voice/sessions/[id]`

**Purpose:** Display single session with tabs for transcript, analytics

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: {Org} > Voice > John Doe Interview              │
├─────────────────────────────────────────────────────────────┤
│ Header:                                                     │
│   [Status] Technical Interview - John Doe                   │
│   Created: Jan 15, 2026 | Duration: 25 min | Score: 85     │
│   [Start/Resume] [Copy Link] [⋮ More]                      │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Transcript] [Analytics]                   │
├─────────────────────────────────────────────────────────────┤
│ Tab Content (varies by tab):                                │
│                                                             │
│ [Overview Tab]                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Session Details          │ Quick Stats                  ││
│ │ • Candidate: John Doe    │ • Score: 85/100              ││
│ │ • Email: john@email.com  │ • Duration: 25 min           ││
│ │ • Type: Technical        │ • Questions: 8               ││
│ │ • Config: Technical v1   │ • Completed: ✓               ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [Transcript Tab] - See 4.3                                  │
│ [Analytics Tab] - See 4.4                                   │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Library | Props | Notes |
|-----------|---------|-------|-------|
| SessionHeader | Custom | session | Status, actions |
| TabPanel | MUI | value, children | Tab content |
| DetailCard | MUI Card | data | Key-value pairs |
| StatCard | Custom | label, value | Numeric stats |
| ActionButton | MUI Button | onClick | Primary actions |

**States:**

- **Loading**: Skeleton layout
- **Not Found**: 404 with back link
- **Pending**: Show "Start Interview" CTA
- **Active**: Show interview room or status
- **Completed**: Show all tabs with data

### 4.3 Page: Transcript View (Tab)

**Route:** `/[org-slug]/voice/sessions/[id]?tab=transcript`

**Purpose:** Display interview transcript with speaker labels

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Transcript Controls:                                        │
│   [🔍 Search] [Jump to: ▼] [Export ▼]                       │
├─────────────────────────────────────────────────────────────┤
│ Summary:                                                    │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ AI-Generated Summary                                    ││
│ │ The candidate demonstrated strong technical knowledge   ││
│ │ in system design and problem-solving. Key discussion... ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Full Transcript:                                            │
│                                                             │
│ [00:00] 🤖 Bot                                              │
│ Hello! Welcome to your technical interview. I'm your       │
│ AI interviewer today. Let's get started...                 │
│                                                             │
│ [00:15] 👤 John Doe                                         │
│ Thank you! I'm excited to be here and discuss my           │
│ experience with distributed systems...                     │
│                                                             │
│ [00:45] 🤖 Bot                                              │
│ Great! Can you walk me through a challenging project       │
│ you've worked on recently?                                  │
│                                                             │
│ [01:02] 👤 John Doe                                         │
│ Certainly. At my previous company, I led the design of...  │
│                                                             │
│ [... more segments ...]                                     │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Library | Props | Notes |
|-----------|---------|-------|-------|
| TranscriptSearch | MUI TextField | onSearch | Highlight matches |
| TranscriptSummary | MUI Card | summary | Collapsible |
| TranscriptSegment | Custom | segment | Speaker + text |
| SpeakerIcon | MUI Icon | speaker | Bot vs candidate |
| Timestamp | Custom | seconds | Clickable |
| ExportMenu | MUI Menu | onExport | PDF, TXT options |

**Interaction Patterns:**

- **Search**: Highlights matching text in transcript
- **Jump to**: Dropdown with key moments or questions
- **Timestamp click**: Future - play audio from that point
- **Export**: Downloads transcript in selected format

### 4.4 Page: Analytics View (Tab)

**Route:** `/[org-slug]/voice/sessions/[id]?tab=analytics`

**Purpose:** Display AI-generated interview analysis

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Overall Score                                               │
│ ┌─────────────────────────────────────────────────────────┐│
│ │        ╭───────╮                                        ││
│ │       │   85   │     Excellent Performance             ││
│ │        ╰───────╯     Top 20% of candidates             ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Category Scores                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Communication     ████████████████░░░░ 85%              ││
│ │ Technical Depth   ██████████████░░░░░░ 72%              ││
│ │ Problem Solving   ██████████████████░░ 90%              ││
│ │ Cultural Fit      █████████████████░░░ 88%              ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────────────────┐  │
│ │ Strengths              │ │ Areas for Improvement      │  │
│ │ ✓ Clear communication  │ │ △ Could elaborate more     │  │
│ │ ✓ Strong problem-      │ │ △ Limited examples from    │  │
│ │   solving approach     │ │   previous roles           │  │
│ │ ✓ Good system design   │ │ △ Scalability concerns    │  │
│ │   knowledge            │ │   need more depth          │  │
│ └────────────────────────┘ └────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ Key Moments                                                 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ⭐ 02:25 - Excellent explanation of microservices       ││
│ │           "I would design the system with..."           ││
│ │           [Jump to Transcript]                          ││
│ │                                                         ││
│ │ ⚠️ 08:15 - Hesitation on database scaling               ││
│ │           "I'm not entirely sure about..."              ││
│ │           [Jump to Transcript]                          ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Recommendations                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 1. Consider for senior role based on system design      ││
│ │ 2. Follow-up on database experience in next round       ││
│ │ 3. Strong candidate for distributed systems team        ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Library | Props | Notes |
|-----------|---------|-------|-------|
| ScoreCircle | Custom | score, label | Large circular display |
| CategoryBar | Custom | category, score | Progress bar style |
| StrengthsList | Custom | items | Checkmark icons |
| WeaknessesList | Custom | items | Triangle icons |
| KeyMomentCard | Custom | moment, onJump | Clickable |
| RecommendationsList | Custom | items | Numbered list |

### 4.5 Page: Interview Room

**Route:** `/[org-slug]/voice/sessions/[id]/interview` or `/interview/[token]`

**Purpose:** Live interview experience with Daily.co room

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Progress: Question 3 of 8]                    [End ✕]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────┐  ┌─────────────┐ │
│  │                                      │  │ Live        │ │
│  │                                      │  │ Transcript  │ │
│  │         Daily.co Video               │  │             │ │
│  │         (AI Bot or Avatar)           │  │ 🤖 Bot:     │ │
│  │                                      │  │ Tell me     │ │
│  │                                      │  │ about...    │ │
│  │                                      │  │             │ │
│  │                                      │  │ 👤 You:     │ │
│  │                                      │  │ I have      │ │
│  │                                      │  │ experience..│ │
│  └──────────────────────────────────────┘  │             │ │
│                                             │             │ │
│  ┌─────────────────┐                        │             │ │
│  │   Your Video    │ [Mute] [Video] [?]    │             │ │
│  └─────────────────┘                        └─────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Library | Props | Notes |
|-----------|---------|-------|-------|
| DailyProvider | Daily React | config | Daily.co SDK |
| VideoTile | Daily | participant | Bot video |
| SelfView | Daily | - | User's camera |
| LiveTranscript | Custom | segments | WebSocket powered |
| ProgressBar | MUI | current, total | Question progress |
| ControlBar | Custom | onMute, onEnd | Interview controls |

**States:**

- **Connecting**: "Connecting to interview room..."
- **Waiting for Bot**: "AI interviewer is joining..."
- **Active**: Full interview UI
- **Ending**: "Wrapping up interview..."
- **Completed**: Redirect to thank you page

---

## 5. Component Library Usage

### 5.1 Material-UI Components

```typescript
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Typography,
  Chip,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  CircularProgress,
  Skeleton,
  Alert,
  Snackbar,
  Menu,
  Tooltip,
  Breadcrumbs,
  Link,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
```

### 5.2 Icons

```typescript
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideoIcon,
  VideocamOff as VideoOffIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Star as StarIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Schedule as ScheduleIcon,
  Assessment as AnalyticsIcon,
  Description as TranscriptIcon
} from '@mui/icons-material';
```

### 5.3 Custom Components

**SessionCard:**

```typescript
interface SessionCardProps {
  session: VoiceSession;
  onStart: (id: string) => void;
  onView: (id: string) => void;
  onCopyLink: (id: string) => void;
}

export function SessionCard({ 
  session, 
  onStart, 
  onView, 
  onCopyLink 
}: SessionCardProps) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <StatusBadge status={session.status} />
          {session.analytics?.overallScore && (
            <ScoreBadge score={session.analytics.overallScore} />
          )}
        </Box>
        
        <Typography variant="h6">
          {session.candidateName || 'Unnamed Candidate'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {session.interviewType}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDate(session.createdAt)}
          {session.durationSeconds && ` • ${formatDuration(session.durationSeconds)}`}
        </Typography>
      </CardContent>
      
      <CardActions>
        <Button size="small" onClick={() => onView(session.id)}>
          View Details
        </Button>
        {session.status === 'pending' && (
          <Button 
            size="small" 
            variant="contained" 
            onClick={() => onStart(session.id)}
          >
            Start Interview
          </Button>
        )}
        <IconButton size="small" onClick={() => onCopyLink(session.id)}>
          <CopyIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}
```

**LiveTranscriptPanel:**

```typescript
interface LiveTranscriptPanelProps {
  sessionId: string;
  isActive: boolean;
}

export function LiveTranscriptPanel({ 
  sessionId, 
  isActive 
}: LiveTranscriptPanelProps) {
  const { segments, connected, error } = useRealTimeTranscript(sessionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);
  
  if (!isActive) return null;
  
  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2">
          Live Transcript
          {connected ? (
            <Chip label="Live" color="success" size="small" sx={{ ml: 1 }} />
          ) : (
            <Chip label="Connecting..." size="small" sx={{ ml: 1 }} />
          )}
        </Typography>
      </Box>
      
      <Box ref={scrollRef} sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {segments.map((segment, index) => (
          <TranscriptSegment key={index} segment={segment} />
        ))}
      </Box>
    </Paper>
  );
}
```

---

## 6. Interaction Patterns

### 6.1 Session Creation Flow

```typescript
function CreateSessionDialog({ open, onClose, onCreated }: CreateSessionDialogProps) {
  const { currentOrg } = useOrgContext();
  const { configs } = useVoiceConfigs(client, currentOrg.id);
  
  const [formData, setFormData] = useState<CreateSessionData>({
    orgId: currentOrg.id,
    candidateName: '',
    candidateEmail: '',
    interviewType: '',
    configId: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const api = createVoiceClient(client);
      const session = await api.createSession(formData);
      
      showToast('Interview created successfully');
      onCreated(session);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>New Voice Interview</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            label="Candidate Name"
            value={formData.candidateName}
            onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
            fullWidth
            margin="normal"
            helperText="Optional - can be added later"
          />
          
          <TextField
            label="Candidate Email"
            type="email"
            value={formData.candidateEmail}
            onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
            fullWidth
            margin="normal"
            helperText="Optional - for sending interview link"
          />
          
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Interview Type</InputLabel>
            <Select
              value={formData.configId}
              onChange={(e) => {
                const config = configs.find(c => c.id === e.target.value);
                setFormData({
                  ...formData,
                  configId: e.target.value,
                  interviewType: config?.interviewType || ''
                });
              }}
              label="Interview Type"
            >
              {configs.map(config => (
                <MenuItem key={config.id} value={config.id}>
                  {config.name} ({config.interviewType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !formData.configId}
          >
            {loading ? <CircularProgress size={20} /> : 'Create Interview'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
```

### 6.2 Real-Time Transcript Hook

```typescript
interface UseRealTimeTranscriptResult {
  segments: TranscriptSegment[];
  connected: boolean;
  error: Error | null;
}

export function useRealTimeTranscript(sessionId: string): UseRealTimeTranscriptResult {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    if (!sessionId) return;
    
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setConnected(true);
      // Subscribe to session
      ws.send(JSON.stringify({
        action: 'subscribe',
        session_id: sessionId
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'transcript_segment') {
        setSegments(prev => [...prev, data.segment]);
      }
    };
    
    ws.onerror = (err) => {
      setError(new Error('WebSocket connection failed'));
      setConnected(false);
    };
    
    ws.onclose = () => {
      setConnected(false);
      // Attempt reconnection after 3 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          // Reconnect logic
        }
      }, 3000);
    };
    
    return () => {
      ws.close();
    };
  }, [sessionId]);
  
  return { segments, connected, error };
}
```

### 6.3 Interview Room Integration

```typescript
import DailyIframe from '@daily-co/daily-js';

export function InterviewRoom({ session }: { session: VoiceSession }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callObjectRef = useRef<DailyIframe | null>(null);
  
  const [status, setStatus] = useState<'loading' | 'active' | 'error'>('loading');
  
  useEffect(() => {
    if (!session.dailyRoomUrl || !session.dailyRoomToken) return;
    
    const daily = DailyIframe.createCallObject({
      url: session.dailyRoomUrl
    });
    
    callObjectRef.current = daily;
    
    daily.on('joined-meeting', () => setStatus('active'));
    daily.on('error', () => setStatus('error'));
    daily.on('left-meeting', handleInterviewEnd);
    
    daily.join({
      token: session.dailyRoomToken,
      userName: session.candidateName || 'Candidate'
    });
    
    return () => {
      daily.destroy();
    };
  }, [session.dailyRoomUrl, session.dailyRoomToken]);
  
  const handleMuteToggle = () => {
    const call = callObjectRef.current;
    if (call) {
      const isAudioEnabled = call.localAudio();
      call.setLocalAudio(!isAudioEnabled);
    }
  };
  
  const handleEndInterview = async () => {
    const call = callObjectRef.current;
    if (call) {
      await call.leave();
    }
  };
  
  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Connecting to interview...</Typography>
      </Box>
    );
  }
  
  if (status === 'error') {
    return (
      <Alert severity="error">
        Failed to connect to interview room. Please try again.
      </Alert>
    );
  }
  
  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      <Box sx={{ flex: 2, p: 2 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        <ControlBar 
          onMute={handleMuteToggle}
          onEnd={handleEndInterview}
        />
      </Box>
      <Box sx={{ flex: 1, borderLeft: 1, borderColor: 'divider' }}>
        <LiveTranscriptPanel sessionId={session.id} isActive={true} />
      </Box>
    </Box>
  );
}
```

---

## 7. Mobile Responsiveness

### 7.1 Breakpoints

```typescript
// Following MUI default breakpoints
const breakpoints = {
  xs: 0,      // Mobile portrait
  sm: 600,    // Mobile landscape / tablet portrait
  md: 900,    // Tablet landscape / small desktop
  lg: 1200,   // Desktop
  xl: 1536    // Large desktop
};
```

### 7.2 Responsive Layouts

**Session List:**
- **Desktop (≥900px)**: Grid of 3 columns
- **Tablet (600-899px)**: Grid of 2 columns
- **Mobile (<600px)**: Single column stack

**Session Detail:**
- **Desktop**: Side panel layout (transcript + analytics)
- **Mobile**: Stacked tabs, full-width content

**Interview Room:**
- **Desktop**: Video + transcript side by side
- **Mobile**: Video full screen, transcript as overlay/drawer

### 7.3 Mobile-Specific Considerations

```typescript
// Interview room on mobile
function InterviewRoomMobile({ session }: { session: VoiceSession }) {
  const [showTranscript, setShowTranscript] = useState(false);
  
  return (
    <Box sx={{ height: '100vh', position: 'relative' }}>
      {/* Full-screen video */}
      <DailyVideo session={session} />
      
      {/* Floating controls */}
      <Box sx={{ 
        position: 'fixed', 
        bottom: 16, 
        left: '50%', 
        transform: 'translateX(-50%)' 
      }}>
        <ControlBar />
      </Box>
      
      {/* Transcript drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={showTranscript}
        onOpen={() => setShowTranscript(true)}
        onClose={() => setShowTranscript(false)}
        swipeAreaWidth={56}
      >
        <LiveTranscriptPanel sessionId={session.id} />
      </SwipeableDrawer>
    </Box>
  );
}
```

---

## 8. Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance

**Perceivable:**
- ✅ All video content has text alternatives (live transcript)
- ✅ Color contrast ratio ≥4.5:1 for text
- ✅ Score badges use color + text/icon
- ✅ Audio content has real-time captions

**Operable:**
- ✅ All functionality available via keyboard
- ✅ No keyboard traps in interview room
- ✅ Focus indicators on all interactive elements
- ✅ Sufficient time for interview completion

**Understandable:**
- ✅ Clear labels on all form fields
- ✅ Error messages identify the issue
- ✅ Consistent navigation throughout

**Robust:**
- ✅ Valid HTML structure
- ✅ ARIA attributes for dynamic content
- ✅ Screen reader announcements for status changes

### 8.2 Interview Room Accessibility

```typescript
// Accessible interview controls
<ControlBar>
  <IconButton
    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
    aria-pressed={isMuted}
    onClick={handleMuteToggle}
  >
    {isMuted ? <MicOffIcon /> : <MicIcon />}
  </IconButton>
  
  <IconButton
    aria-label="End interview"
    onClick={handleEndInterview}
    color="error"
  >
    <StopIcon />
  </IconButton>
</ControlBar>

// Live transcript with live region
<Box 
  role="log" 
  aria-live="polite" 
  aria-label="Interview transcript"
>
  {segments.map(segment => (
    <TranscriptSegment key={segment.id} segment={segment} />
  ))}
</Box>

// Status announcements
<Box role="status" aria-live="assertive" className="sr-only">
  {statusAnnouncement}
</Box>
```

### 8.3 Screen Reader Support

```typescript
// Announce score with context
<Box aria-label={`Overall score: ${score} out of 100. ${getScoreDescription(score)}`}>
  <ScoreCircle score={score} />
</Box>

// Key moments with full context
<Box 
  role="article"
  aria-label={`Key moment at ${formatTime(moment.timestamp)}: ${moment.description}`}
>
  <KeyMomentCard moment={moment} />
</Box>
```

---

## 9. Frontend Testing Requirements

### 9.1 Component Tests

```typescript
describe('SessionCard', () => {
  it('displays session information correctly', () => {
    const session = mockSession({ 
      candidateName: 'John Doe',
      status: 'completed',
      interviewType: 'Technical'
    });
    
    render(<SessionCard session={session} onView={jest.fn()} onStart={jest.fn()} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
  
  it('shows Start button for pending sessions', () => {
    const session = mockSession({ status: 'pending' });
    
    render(<SessionCard session={session} onView={jest.fn()} onStart={jest.fn()} />);
    
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });
  
  it('hides Start button for completed sessions', () => {
    const session = mockSession({ status: 'completed' });
    
    render(<SessionCard session={session} onView={jest.fn()} onStart={jest.fn()} />);
    
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
  });
});

describe('TranscriptViewer', () => {
  it('displays all transcript segments', () => {
    const segments = [
      { speaker: 'bot', text: 'Hello, welcome to the interview.' },
      { speaker: 'candidate', text: 'Thank you!' }
    ];
    
    render(<TranscriptViewer segments={segments} />);
    
    expect(screen.getByText(/Hello, welcome/)).toBeInTheDocument();
    expect(screen.getByText(/Thank you!/)).toBeInTheDocument();
  });
  
  it('highlights search matches', async () => {
    const segments = [
      { speaker: 'candidate', text: 'I have experience with React.' }
    ];
    
    render(<TranscriptViewer segments={segments} />);
    
    const searchInput = screen.getByRole('searchbox');
    await userEvent.type(searchInput, 'React');
    
    const highlight = screen.getByText('React');
    expect(highlight).toHaveClass('highlight');
  });
});
```

### 9.2 Integration Tests

```typescript
describe('Interview Flow', () => {
  it('completes full create → start flow', async () => {
    render(<VoiceInterviewsPage />);
    
    // Click new interview button
    await userEvent.click(screen.getByRole('button', { name: /new interview/i }));
    
    // Fill form
    await userEvent.type(
      screen.getByLabelText(/candidate name/i),
      'Test Candidate'
    );
    await userEvent.click(screen.getByLabelText(/interview type/i));
    await userEvent.click(screen.getByText('Technical Interview'));
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText('Test Candidate')).toBeInTheDocument();
    });
    
    // Start interview
    await userEvent.click(screen.getByRole('button', { name: /start/i }));
    
    // Verify interview room loads
    await waitFor(() => {
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });
  });
});
```

### 9.3 Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('Session list has no accessibility violations', async () => {
    const { container } = render(<SessionList sessions={mockSessions} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('Interview room has no accessibility violations', async () => {
    const { container } = render(<InterviewRoom session={mockSession} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('Analytics view has no accessibility violations', async () => {
    const { container } = render(<AnalyticsView analytics={mockAnalytics} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 9.4 Test Coverage Requirements

| Area | Target Coverage |
|------|-----------------|
| Component Tests | ≥80% |
| User Flow Tests | 100% critical paths |
| Accessibility Tests | 100% of pages |
| Responsive Tests | xs, sm, md breakpoints |

---

**Document Version:** 1.0  
**Last Updated:** January 16, 2026  
**Author:** AI (Claude)  
**Specification Type:** User UX
