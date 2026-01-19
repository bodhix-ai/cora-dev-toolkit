# CORA Sprint Management Guide

**Purpose:** Define the standard process for closing completed sprints and starting new ones.
**Audience:** Developers (Human) and AI Agents.
**Goal:** Ensure consistent branch management, documentation hygiene, and clear history.

---

## 1. Sprint Closure Process

When a sprint goal is achieved, follow these steps to close the sprint and prepare for merger.

### Step 1.1: Finalize Documentation
1.  Update the current plan file in `docs/plans/`:
    *   Set **Status** to `✅ COMPLETE`.
    *   Ensure "Success Criteria" checklist is fully checked.
    *   Add a "Completion Summary" section if needed.

### Step 1.2: Branch Management
1.  **Rename** the current working branch to a descriptive final name:
    ```bash
    git branch -m <current-branch> <feature>-<sprint-goal>
    # Example: git branch -m ws-crud-kbs ws-crud-kbs-doc-upload
    ```
2.  **Push** the renamed branch:
    ```bash
    git push -u origin <feature>-<sprint-goal>
    ```

### Step 1.3: Archive Plan
1.  **Move and Rename** the plan file to the completed directory:
    ```bash
    mv docs/plans/plan_<old-name>.md docs/plans/completed/plan_<feature>-<sprint-goal>.md
    # Example: mv docs/plans/plan_ws-crud-kbs.md docs/plans/completed/plan_ws-crud-kbs-doc-upload.md
    ```
2.  **Commit** the file move:
    ```bash
    git add docs/plans/completed/
    git add docs/plans/  # To record deletion of old file
    git commit -m "docs: archive completed plan for <sprint-goal>"
    git push
    ```

### Step 1.4: Create Pull Request
1.  Create a PR merging the sprint branch into `main`.
2.  Include a summary of completed features and verification steps.
3.  Reference the archived plan file location.

---

## 2. Sprint Start Process

Start a new sprint for the next phase of work.

### Step 2.1: Create New Branch
1.  Checkout `main` and pull latest changes:
    ```bash
    git checkout main
    git pull origin main
    ```
2.  Create a new branch for the new sprint:
    ```bash
    git checkout -b <feature>-<next-goal>
    # Example: git checkout -b ws-crud-kbs-embeddings
    ```

### Step 2.2: Create New Plan
1.  Create a new plan file in `docs/plans/`:
    *   Filename: `plan_<feature>-<next-goal>.md`
    *   Example: `docs/plans/plan_ws-kb-processing-fix.md` (or `plan_ws-crud-kbs-embeddings.md`)
2.  **Plan Content Requirement:**
    *   **Status:** `🟡 IN PROGRESS`
    *   **Branch:** `<feature>-<next-goal>`
    *   **Scope:** Explicitly define what is IN SCOPE and OUT OF SCOPE.
    *   **Architecture:** Diagrams or descriptions of the solution.
    *   **Implementation Steps:** Checklist of tasks.
    *   **Success Criteria:** Verifiable goals.

### Step 2.3: Initial Commit
1.  Commit the new plan file to the new branch:
    ```bash
    git add docs/plans/plan_<feature>-<next-goal>.md
    git commit -m "docs: create plan for <next-goal> sprint"
    git push -u origin <feature>-<next-goal>
    ```

---

## 3. AI Agent Instructions

**For AI Agents:** When asked to "close sprint" or "start next phase":

1.  **Check Context:** Identify the current active plan and branch.
2.  **Verify Completion:** Ensure all tasks in the current plan are marked complete.
3.  **Execute Closure:** Perform the renaming, moving, and PR creation steps defined in Section 1.
4.  **Execute Start:** Perform the branch creation and plan authoring steps defined in Section 2.
5.  **Confirm:** Report back the new branch name and plan location.

**Critical Rule:** Never delete a plan file. Always move it to `docs/plans/completed/`.
