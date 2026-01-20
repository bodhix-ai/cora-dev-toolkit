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

### Step 1.2: Branch Archiving
1.  **Create Archive Tags** before switching branches:
    ```bash
    # Archive tag (always create)
    git tag archive/<current-branch> <current-branch>
    git push origin archive/<current-branch>
    
    # Module-focus tag (for module-specific work)
    # Determine the primary module: access, ai, mgmt, kb, chat, ws, eval, voice
    git tag module/<module-name>/<description> <current-branch>
    git push origin module/<module-name>/<description>
    
    # Example: For eval optimization work
    # git tag archive/admin-eval-config-s2 admin-eval-config-s2
    # git tag module/eval/admin-config-sprint admin-eval-config-s2
    # git push origin archive/admin-eval-config-s2 module/eval/admin-config-sprint
    ```

2.  **Optional: Rename Branch** to a more descriptive final name (if not already descriptive):
    ```bash
    git branch -m <current-branch> <feature>-<sprint-goal>
    git push -u origin <feature>-<sprint-goal>
    ```

**Note:** See [Branching Strategy Standard](../standards/standard_BRANCHING-STRATEGY.md#branch-archiving) for complete tag naming conventions.

### Step 1.3: Update Active Context
1.  **Update** `memory-bank/activeContext.md`:
    *   Move the completed branch from "Active Branches" table to a "Recently Completed" section
    *   Mark status as "✅ Archived" with completion date
    *   Remove context file reference if using branch-specific context files
    
    ```bash
    # Edit memory-bank/activeContext.md
    # Then commit the change
    git add memory-bank/activeContext.md
    git commit -m "docs: mark <branch-name> as archived in activeContext"
    ```

### Step 1.4: Archive Plan
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

### Step 1.5: Create Pull Request
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

### Step 2.3: Update Active Context
1.  **Update** `memory-bank/activeContext.md`:
    *   Add the new branch to the "Active Branches" table
    *   Mark it as **ACTIVE** with the focus area description
    *   Reference the new plan file and context file (if using branch-specific context)
    
    ```bash
    # Edit memory-bank/activeContext.md
    # Then commit the change
    git add memory-bank/activeContext.md
    git commit -m "docs: add <branch-name> to activeContext"
    ```

### Step 2.4: Initial Commit
1.  Commit the plan file and context updates:
    ```bash
    git add docs/plans/plan_<feature>-<next-goal>.md memory-bank/activeContext.md
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
