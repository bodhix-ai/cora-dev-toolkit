# Cline Tasks Documentation

Understanding tasks in Cline - the fundamental unit of work that drives every coding session.

> **Source:** https://docs.cline.bot/features/tasks/understanding-tasks

---

## What are Tasks?

Most users interact with Cline through tasks - the fundamental unit of work that drives every coding session. Whether you're building a new feature, fixing a bug, refactoring code, or exploring a codebase, every interaction with Cline happens within the context of a task.

A task represents a complete conversation and work session between you and the AI agent, created through prompts - the instructions you provide to tell Cline what you want to accomplish. Tasks serve as self-contained work sessions that capture your entire conversation with Cline, including all the code changes, command executions, and decisions made along the way.

This approach ensures that your work is organized, traceable, and resumable. Each task maintains its own isolated context, allowing you to work on multiple projects simultaneously without confusion.

---

## Key Characteristics

Each task in Cline:

- **Has a unique identifier**: Every task gets its own ID and dedicated storage directory
- **Contains the full conversation**: All messages, tool uses, and results are preserved
- **Tracks resources used**: Token usage, API costs, and execution time are monitored
- **Can be interrupted and resumed**: Tasks maintain their state across VSCode sessions
- **Creates checkpoints**: File changes are tracked through Git-based snapshots
- **Enables documentation**: Tasks can be exported as markdown for team documentation
- **Provides cost management**: Resource tracking helps monitor API usage and costs

---

## Creating Tasks with Prompts

Tasks begin with prompts - your instructions to Cline. The quality of your results depends heavily on how you describe what you want.

### Prompt Components

A well-structured prompt typically includes:

| Component | Description |
|-----------|-------------|
| **Goal** | What you want to accomplish |
| **Context** | Background information and constraints |
| **Requirements** | Specific features or functionality needed |
| **Preferences** | Technology choices, coding style, etc. |
| **Examples** | References to guide the implementation |

---

## Task Execution Modes

Cline operates in two distinct modes that help structure your workflow:

| Mode | Purpose |
|------|---------|
| **Plan Mode** | Information gathering, discussing approaches, and creating strategies without making changes |
| **Act Mode** | Actual implementation where Cline executes file modifications, runs commands, and uses tools |

---

## Task Resources

Each task consumes resources that are tracked:

| Resource | Description |
|----------|-------------|
| **Tokens** | The amount of text processed (input and output) |
| **API Costs** | Monetary cost based on the model and token usage |
| **Time** | Duration from start to completion |
| **Checkpoints** | Number of file state snapshots created |

---

## Common Task Patterns

### Code Generation

```
Create a TypeScript function that validates email addresses using regex. 
Include unit tests using Jest and handle edge cases like international domains.
```

### Bug Fixing

```
@terminal The app crashes when clicking the submit button. 
Fix the error and ensure proper error handling is in place.
```

### Refactoring

```
Refactor the authentication logic in @auth.ts to use async/await 
instead of callbacks. Maintain all existing functionality.
```

### Feature Implementation

```
Add a dark mode toggle to the settings page. Use the existing theme 
context and persist the preference to localStorage.
```

---

## Task Resumption

One of Cline's powerful features is the ability to resume interrupted tasks.

### When Tasks Get Interrupted

- You stop a long-running task
- An error occurs that needs intervention
- You need to switch to another task

### Resuming a Task

1. Open the task from history
2. Cline loads the complete conversation
3. File states are checked against checkpoints
4. The task continues with awareness of the interruption
5. You can provide additional context if needed

---

## Understanding Task Context

Tasks maintain context throughout their lifecycle:

| Context Type | Description |
|--------------|-------------|
| **Conversation History** | All previous messages and responses |
| **File Changes** | Tracked modifications and their order |
| **Tool Results** | Output from commands and operations |
| **Checkpoint States** | Snapshots of file states at key points |

This context allows Cline to:
- Understand what has been done
- Maintain consistency in approach
- Resume work intelligently
- Learn from previous attempts

---

## Task Management

Cline provides tools to manage your task history, helping you organize, search, and maintain your workspace efficiently.

### Accessing Task History

- Clicking the "History" button in the Cline sidebar
- Using Command Palette: Search for "Cline: Show Task History"
- Keyboard shortcut (if configured in your VSCode settings)

### Search and Filter

#### Search Bar
- Fuzzy search across all task content
- Searches through prompts, responses, and code
- Instantly filters results as you type
- Highlights matching text in results

#### Sort Options
- **Newest** (default) - Most recent tasks first
- **Oldest** - Earliest tasks first
- **Most Expensive** - Highest API cost tasks
- **Most Tokens** - Highest token usage
- **Most Relevant** - Best matches when searching

#### Favorites Filter
- Toggle to show only starred tasks
- Quickly access your most important work
- Combine with search for precise filtering

### Task Actions

#### Primary Actions
- **Open**: Click on a task to reopen it in the Cline chat
- **Resume**: Continue an interrupted task from where it left off
- **Export**: Save the conversation to markdown for documentation

#### Management Actions
- **Favorite ⭐**: Click the star icon to mark important tasks
- **Delete 🗑️**: Remove individual tasks (favorites are protected)
- **Duplicate**: Create a new task based on an existing one

---

## Task Favorites

The favorites system helps you preserve and quickly access important tasks.

### Using Favorites

**Marking Favorites:**
- Click the star icon next to any task
- Star fills in when favorited
- Click again to unfavorite

**Protection Features:**
- Favorited tasks are protected from accidental deletion
- Bulk delete operations skip favorites by default
- Can override protection with explicit confirmation

**Use Cases for Favorites:**
- Reference implementations you want to keep
- Successful problem-solving patterns
- Tasks with reusable code snippets
- Important project milestones
- Learning examples for team members

---

## Task Metrics

Understanding your task metrics helps optimize usage.

### Available Metrics

| Metric | Description |
|--------|-------------|
| **Token Usage** | Total input/output tokens consumed |
| **API Cost** | Estimated cost based on model pricing |
| **Checkpoint Count** | Number of file snapshots created |

### Using Metrics

- **Budget Tracking**: Monitor API costs across tasks
- **Efficiency Analysis**: Identify expensive operations
- **Model Comparison**: Compare costs between models
- **Optimization**: Find tasks that could be more efficient
