# Cline Workflows Documentation

Workflows are Markdown files that define a series of steps to guide Cline through repetitive or complex tasks.

> **Source:** https://docs.cline.bot/features/slash-commands/workflows

---

## What are Workflows?

Workflows in Cline are Markdown files that define a series of steps to guide Cline through repetitive or complex tasks. They are a powerful way to automate your development processes directly within your editor.

**To invoke a workflow**, type `/` followed by the workflow's filename in the chat (e.g., `/deploy.md`).

---

## Why Use Cline Workflows?

| Benefit | Description |
|---------|-------------|
| **Automation** | Automate repetitive tasks like setting up a new project, deploying a service, or running a test suite |
| **Consistency** | Ensure tasks are performed the same way every time, reducing errors |
| **Reduced Cognitive Load** | Don't waste mental energy remembering complex sequences of commands or steps |
| **Contextual** | Workflows run within your project's context, so Cline has access to your files and can use its tools |

---

## How Workflows Work

A workflow file is a standard Markdown file with a `.md` extension. Cline reads this file and interprets the instructions step-by-step.

The real power comes from Cline's ability to use its built-in tools and other capabilities within these instructions:

- **Cline Tools**: Use tools like `read_file`, `write_to_file`, `execute_command`, and `ask_followup_question`
- **Command-Line Tools**: Instruct Cline to use any CLI tool installed on your machine (e.g., `git`, `gh`, `npm`, `docker`)
- **MCP Tools**: Reference tools from connected Model Context Protocol (MCP) servers

---

## Workflows vs. Rules vs. Skills

| Feature | Purpose | When to Use |
|---------|---------|-------------|
| **Cline Rules** | Define how Cline should behave generally. Always active (or contextually triggered). | Enforcing coding standards, tech stack preferences, or project-specific constraints |
| **Cline Workflows** | Define what specific task Cline should perform. Invoked on-demand. | Automating repetitive tasks like creating a component or running a release process |
| **Cline Skills** | Domain expertise loaded on-demand. Triggered by matching requests. | Deep knowledge that should be available but not always active |

> **Think of it this way:** Rules are the environment Cline works in, Workflows are the scripts you give Cline to execute, and Skills are the expertise Cline draws upon.

---

## Where are Workflows Stored?

### Project-Specific Workflows

Store workflows that are specific to a single project in `.clinerules/workflows/` in your project's root:

```
project-root/
└── .clinerules/
    └── workflows/
        ├── deploy.md
        ├── release.md
        └── create-component.md
```

These workflows are only available when this specific project is open.

### Global Workflows

Store workflows you want available across all projects in:
- **macOS/Linux**: `~/Documents/Cline/Workflows/`
- **Windows**: `C:\Users\USERNAME\Documents\Cline\Workflows\`

**Note:** Project workflows take precedence when names match global workflows.

---

## Managing Workflows

Click the **Manage Cline Rules and Workflows** button at the bottom of the extension to:

- View all available workflows (project-specific and global)
- Toggle individual workflows on and off
- Create and edit workflows
- Delete workflows you no longer need

---

## Workflow Structure Example

Here is a simple example of a workflow file (`daily-changelog.md`):

```markdown
# Daily Changelog Generator

This workflow helps you create a changelog for your daily work.

1. **Check your recent git commits:**
   I will run the following command to see your commits from today.
   ```bash
   git log --author="$(git config user.name)" --since="yesterday" --oneline
   ```

2. **Summarize your work:**
   I will present the commits to you and ask for a summary of your changes 
   to be added to the `changelog.md` file.

3. **Create/Append to daily changelog:**
   I will append to the `changelog.md` file. The content will include a header 
   with the current date, the list of commits, and your summary.
```

### Breakdown

- **Step 1**: Gives Cline a specific command to run for exact data
- **Step 2**: Describes the action ("ask for a summary") - Cline figures out how to ask
- **Step 3**: Describes the outcome - Cline figures out how to write the file

---

## Quick Start: Creating a PR Review Workflow

### Prerequisites

- Cline installed
- GitHub CLI (`gh`) installed and authenticated
- Git repository with a Pull Request to test

### Step 1: Create the Workflow File

```
project-root/
└── .clinerules/
    └── workflows/
        └── pr-review.md
```

### Step 2: Write the Workflow Content

```markdown
# Pull Request Reviewer

This workflow helps me review a pull request by analyzing the changes and drafting a review.

## 1. Gather PR Information
First, I need to understand what this PR is about. I'll fetch the title, description, and list of changed files.

```bash
gh pr view PR_NUMBER --json title,body,files
```

## 2. Examine Modified Files
Now I will examine the diff to understand the specific code changes.

```bash
gh pr diff PR_NUMBER
```

## 3. Analyze Changes
I will analyze the code changes for:
* **Bugs:** Logic errors or edge cases.
* **Performance:** Inefficient loops or operations.
* **Security:** Vulnerabilities or unsafe practices.

## 4. Confirm Assessment
Based on my analysis, I will present my findings and ask how you want to proceed.

```xml
<ask_followup_question>
  <question>I've reviewed PR #PR_NUMBER. Here is my assessment:

[Insert Analysis Here]

Do you want me to approve this PR, request changes, or just leave a comment?</question>
  <options>["Approve", "Request Changes", "Comment", "Do nothing"]</options>
</ask_followup_question>
```

## 5. Execute Review
Finally, I will execute the review command based on your decision.

```bash
# If approving:
gh pr review PR_NUMBER --approve --body "Looks good to me! [Summary of analysis]"

# If requesting changes:
gh pr review PR_NUMBER --request-changes --body "Please address the following: [Issues list]"

# If commenting:
gh pr review PR_NUMBER --comment --body "[Comments]"
```
```

### Step 3: Run the Workflow

```
/pr-review.md 42
```

Replace `42` with your actual PR number.

---

## Best Practices

### Use Cline to Build Workflows

Use Cline itself to help build workflows. There's a workflow for building workflows:

1. Save `create-new-workflow.md` to your workspace
2. Type `/create-new-workflow.md`
3. Cline guides you through creating a properly structured workflow

**Pro Tip:** After completing a task you'll need to repeat, tell Cline: *"Create a workflow for the process I just completed."* Cline analyzes the conversation and generates the workflow file.

### Workflow Design Principles

| Principle | Description |
|-----------|-------------|
| **Start Simple** | Begin with small, single-task workflows. Combine them as you get comfortable. |
| **Be Modular** | Break complex tasks into smaller, reusable workflows. Easier to maintain and debug. |
| **Use Clear Comments** | Explain *why* a step is happening, not just *what*. Helps both you and Cline. |
| **Version Control** | Store workflows in your Git repository so they are versioned, reviewed, and shared. |

### Be Specific with Tool Use

Don't just say "find the file." Be explicit about which tool Cline should use.

❌ **Bad:** "Find the user controller."

✅ **Good:** "Use `search_files` to look for `UserController` in the `src/controllers` directory."

---

## Available Tools in Workflows

### execute_command

Executes a CLI command on your system.

```xml
<execute_command>
  <command>npm run test</command>
  <requires_approval>false</requires_approval>
</execute_command>
```

### read_file

Reads the contents of a file.

```xml
<read_file>
  <path>src/config.json</path>
</read_file>
```

### write_to_file

Creates or overwrites a file.

```xml
<write_to_file>
  <path>src/components/Button.tsx</path>
  <content>
    // File content goes here...
