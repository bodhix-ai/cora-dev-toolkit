# ADR-012: CORA Validation Automation Strategy

**Status:** Accepted (Revised)  
**Date:** January 16, 2026  
**Revised:** January 16, 2026 (Enhanced with deterministic fallbacks, reliability improvements, and discoverability)  
**Deciders:** Engineering Team  
**Context:** Defining the AI automation architecture for the CORA validation suite.

---

## Context

The CORA validation suite has grown to include ~13 distinct validators orchestrated by `cora-validate.py`. These cover diverse domains including database schemas, backend compliance, frontend accessibility, and project structure.

Currently, there is no standardized way for AI agents to interact with this suite. We need an approach that provides:
1. Explicit, repeatable execution of validation
2. Deep domain expertise for remediation
3. Enforcement of architectural boundaries (Stack vs Infra repos)
4. Integration with the Fast Iteration Testing workflow

---

## Decision Drivers

1. **Usability**: Validation should be easy to run via explicit commands
2. **Expertise**: Fixes require deep, domain-specific knowledge (e.g., PostgreSQL internals vs. React patterns)
3. **Safety**: We must prevent AI agents from violating the Two-Repo Pattern (Stack vs. Infra)
4. **Workflow**: Must respect the Template-First and Fast Iteration workflows
5. **Maintainability**: Architecture should be resilient to adding new validators
6. **Cline Feature Alignment**: Must use Cline features as designed (Skills, Workflows, Tasks)
7. **Discoverability**: Users should easily find available validation commands

---

## Options Considered

### Option A: Single Monolithic Skill (`validate-all`)

**Pros**: Simple entry point.  
**Cons**: Context window overload. Cannot fit detailed remediation guides for all 13 domains.

### Option B: Per-Validator Skills (13+ Skills)

**Pros**: Maximum granular expertise.  
**Cons**: Fragmentation. User burden to discover and select the right skill.

### Option C: Hybrid Domain Skills with Orchestrator (Original ADR)

**Pros**: Unified execution, deep specialist expertise.  
**Cons**: **Fundamentally flawed** - Skills cannot programmatically route to other skills. Cline skills are triggered by user intent, not by other skills.

### Option D: Hybrid Workflow + Skill Architecture (Selected)

**Structure**:
1. **Workflows**: Explicit automation for running validation (`/validate.md`)
2. **Skills**: Domain expertise that activates during remediation conversations

**Pros**:
- Workflows provide deterministic, explicit execution
- Skills provide deep expertise when needed
- Natural conversation flow replaces broken "routing"
- Aligns with how Cline features actually work

---

## Decision

We will implement **Option D: Hybrid Workflow + Skill Architecture**.

### Architecture Overview

```
.clinerules/
├── workflows/                     # Explicit automation (invoked via /command)
│   ├── validate.md               # Main entry: /validate.md
│   ├── validate-backend.md       # Backend focus: /validate-backend.md
│   ├── validate-frontend.md      # Frontend focus: /validate-frontend.md
│   ├── fix-and-sync.md           # Fast iteration: /fix-and-sync.md
│   ├── fix-backend.md            # Deterministic fallback: /fix-backend.md
│   ├── fix-data.md               # Deterministic fallback: /fix-data.md
│   ├── fix-frontend.md           # Deterministic fallback: /fix-frontend.md
│   ├── fix-structure.md          # Deterministic fallback: /fix-structure.md
│   └── help-validation.md        # Discoverability: /help-validation.md
│
└── skills/                        # Domain expertise (auto-triggered by intent)
    ├── cora-toolkit-validation-backend/
    │   └── SKILL.md              # Lambda, API, Infra remediation
    ├── cora-toolkit-validation-data/
    │   └── SKILL.md              # Database, Schema remediation
    ├── cora-toolkit-validation-frontend/
    │   └── SKILL.md              # UI, A11y remediation
    └── cora-toolkit-validation-structure/
        └── SKILL.md              # File organization remediation
```

### Dual-Path Expertise Access

A key design principle is providing **two paths** to domain expertise:

| Path | Mechanism | Reliability | Example |
|------|-----------|-------------|---------|
| **Skills** | Intent matching | Variable (depends on phrasing) | "Fix the Lambda errors" |
| **Workflows** | Explicit invocation | Guaranteed | `/fix-backend.md` |

This dual-path approach ensures users always have a deterministic fallback when intent-based skill activation fails.

### Why Workflows + Skills (Not Skills Alone)

| Cline Feature | Design Intent | Our Usage |
|---------------|---------------|-----------|
| **Workflows** | Explicit, repeatable automation sequences invoked via `/command` | Running validation suite, deterministic steps, **fallback expertise** |
| **Skills** | Domain expertise loaded on-demand when user intent matches | Remediation knowledge, activated during fix conversations |
| **Tasks** | Conversation units with checkpoints and resumability | Long-running fix sessions that may span time |

**Key Insight**: The original ADR tried to use a Skill as an orchestrator that would "route" to other skills. This is impossible—skills are triggered by Cline matching user intent to skill descriptions, not by programmatic invocation from another skill.

**Reliability Insight**: Skills activate via intent matching, which is inherently uncertain. Adding explicit `fix-*.md` workflows provides deterministic access to the same expertise, ensuring users are never blocked by skill activation failures.

### Component Responsibilities

#### Workflows (Execution Layer)

| Workflow | Purpose | Invocation |
|----------|---------|------------|
| `validate.md` | Run full suite, categorize results, present summary | `/validate.md` |
| `validate-backend.md` | Run backend validators only | `/validate-backend.md` |
| `validate-frontend.md` | Run frontend validators only | `/validate-frontend.md` |
| `fix-and-sync.md` | Template-first fix + sync + deploy | `/fix-and-sync.md <file>` |
| `fix-backend.md` | **Deterministic fallback** - Load backend expertise directly | `/fix-backend.md` |
| `fix-data.md` | **Deterministic fallback** - Load data expertise directly | `/fix-data.md` |
| `fix-frontend.md` | **Deterministic fallback** - Load frontend expertise directly | `/fix-frontend.md` |
| `fix-structure.md` | **Deterministic fallback** - Load structure expertise directly | `/fix-structure.md` |
| `help-validation.md` | **Discoverability** - List all validation commands and usage | `/help-validation.md` |

#### Skills (Expertise Layer)

| Skill | Triggers On | Provides |
|-------|-------------|----------|
| `cora-toolkit-validation-backend` | "fix Lambda", "API error", "authorizer issue" | Lambda 7-rules, API patterns, repo boundaries |
| `cora-toolkit-validation-data` | "fix schema", "database naming", "RLS policy" | DB naming standards, migration patterns |
| `cora-toolkit-validation-frontend` | "fix accessibility", "UI compliance" | Section 508, Next.js patterns |
| `cora-toolkit-validation-structure` | "fix imports", "file structure" | Module boundaries, import restrictions |

**Note on Skill Naming**: Skills use the `cora-toolkit-validation-*` prefix (not just `cora-*` or `cora-validation-*`) to minimize collision risk with user global skills. The more distinctive the name, the less likely a user's personal skill will accidentally override the project skill.

### ⚠️ Global Skill Precedence Warning

**CRITICAL**: Per Cline documentation: *"When a global skill and project skill have the same name, the global skill takes precedence."*

This means:
- If a user has a personal global skill named `cora-toolkit-validation-backend`, it **will override** the project skill entirely
- The project skill will NOT load—the user's global version will be used instead
- This can cause confusion when the user doesn't get expected behavior

**Mitigations**:
1. Use highly distinctive `cora-toolkit-validation-*` prefix
2. Document this limitation in troubleshooting section
3. Fallback workflows (`/fix-*.md`) remain unaffected by skill precedence
4. Add skill activation confirmation messages to detect when wrong skill loads

### How They Work Together

**Primary Flow (Skill Activation)**:
1. **User invokes workflow**: `/validate.md`
2. **Workflow runs validation**: Executes `cora-validate.py`, parses results
3. **Workflow presents summary**: Shows errors by domain, offers both skill triggers and fallback workflows
4. **User requests fix**: "Fix the Lambda errors"
5. **Skill activates**: `cora-toolkit-validation-backend` loads automatically (intent match)
6. **Skill provides remediation**: Domain-specific fix guidance
7. **Fast Iteration**: Skill references `/fix-and-sync.md` for template workflow

**Fallback Flow (Skill Doesn't Activate)**:
1. **User invokes workflow**: `/validate.md`
2. **Workflow presents summary**: Shows errors by domain
3. **User tries skill**: "Fix the Lambda errors" → skill doesn't activate
4. **User uses fallback**: `/fix-backend.md`
5. **Workflow loads expertise**: Same content as skill, guaranteed to load
6. **User gets remediation**: Domain-specific fix guidance

### Skill Activation Strategy

**Critical Design Decision**: Skills activate based on user intent matching skill descriptions. To ensure reliable activation, workflows must guide users toward skill-trigger-friendly language. **When intent matching fails, workflows provide deterministic fallbacks.**

#### Trigger Phrase Patterns

| Skill | Reliable Triggers | Unreliable Triggers | Fallback Workflow |
|-------|-------------------|---------------------|-------------------|
| `cora-toolkit-validation-backend` | "Fix the Lambda errors", "API routing issue", "authorizer problem", "502 error", "source_code_hash" | "Fix it", "Fix all errors" | `/fix-backend.md` |
| `cora-toolkit-validation-data` | "Fix the database naming", "schema error", "table naming issue", "RLS policy", "ADR-011" | "Fix the data" | `/fix-data.md` |
| `cora-toolkit-validation-frontend` | "Fix accessibility errors", "a11y issue", "UI compliance", "Section 508", "WCAG" | "Fix the frontend" | `/fix-frontend.md` |
| `cora-toolkit-validation-structure` | "Fix import violations", "file structure error", "module boundaries" | "Fix organization" | `/fix-structure.md` |

### Skill Activation Verification

**Critical**: Skills activate based on intent matching, which can be unreliable. To ensure correct activation:

#### 1. Activation Confirmation Messages
Each skill MUST output a confirmation message as its first response:
```
✅ **CORA Toolkit Backend Expert activated** - I'll help fix Lambda, API Gateway, and authorization issues.
```

This provides immediate feedback that the intended skill loaded.

#### 2. Skill Precedence Rules
Per Cline documentation: *"When a global skill and project skill have the same name, the global skill takes precedence."*

**Decision**: All CORA validation skills are **project-level skills only**, stored in `.clinerules/skills/`. Additionally:
- Use highly distinctive `cora-toolkit-validation-*` prefix to minimize collision with user global skills
- Avoids precedence conflicts with user's global skills
- Keeps skills versioned with the project
- Allows project-specific customization

#### 3. Deterministic Fallback Workflows
When skill activation fails, users can invoke expertise directly via workflows:

| If This Fails | Use This Instead |
|---------------|------------------|
| "Fix the Lambda errors" (skill doesn't activate) | `/fix-backend.md` (guaranteed) |
| "Fix the schema issue" (skill doesn't activate) | `/fix-data.md` (guaranteed) |

Workflows embed the same expertise content as skills, ensuring users are never blocked.

#### 4. Activation Testing Protocol
Before considering implementation complete, verify each skill activates correctly:

| Test Input | Expected Skill | Verification | Fallback |
|------------|----------------|--------------|----------|
| "Fix the Lambda timeout error" | `cora-toolkit-validation-backend` | See "Backend Expert activated" | `/fix-backend.md` |
| "The table naming violates ADR-011" | `cora-toolkit-validation-data` | See "Data Expert activated" | `/fix-data.md` |
| "Fix the missing alt text" | `cora-toolkit-validation-frontend` | See "Frontend Expert activated" | `/fix-frontend.md` |
| "Fix the cross-module import" | `cora-toolkit-validation-structure` | See "Structure Expert activated" | `/fix-structure.md` |
| "Fix it" (vague) | None (fallback) | See domain clarification prompt | User chooses `/fix-*.md` |

#### Workflow Output Guidance

Workflows MUST present domain-specific options with trigger-friendly phrasing AND fallback workflows:

```markdown
## Suggested Next Steps

**Option A: Natural Language (Skill Activation)**
To get expert help, say one of:
- **Backend (Lambda, API)**: "Fix the Lambda errors" or "Help with API routing"
- **Data (Schema, naming)**: "Fix the database naming issues"
- **Frontend (A11y, UI)**: "Fix the accessibility errors"
- **Structure (Imports, files)**: "Fix the import violations"

**Option B: Direct Workflow (Guaranteed)**
If skills don't activate, use these commands directly:
- **Backend**: `/fix-backend.md`
- **Data**: `/fix-data.md`
- **Frontend**: `/fix-frontend.md`
- **Structure**: `/fix-structure.md`

**Need help?** Run `/help-validation.md` to see all available validation commands.
```

### Discoverability

Users need to know what validation commands are available. The `/help-validation.md` workflow addresses this:

```markdown
# CORA Validation Help

## Available Workflows

| Command | Purpose |
|---------|---------|
| `/validate.md` | Run full validation suite |
| `/validate-backend.md` | Run backend validators only |
| `/validate-frontend.md` | Run frontend validators only |
| `/fix-backend.md` | Get backend fix guidance |
| `/fix-data.md` | Get database fix guidance |
| `/fix-frontend.md` | Get frontend fix guidance |
| `/fix-structure.md` | Get structure fix guidance |
| `/fix-and-sync.md <file>` | Fix template and sync to project |
| `/help-validation.md` | Show this help |

## Quick Start

1. Run `/validate.md` to see all errors
2. Say "Fix the [domain] errors" or use `/fix-[domain].md`
3. Follow the guidance to fix issues
4. Re-run validation to confirm fixes
```

### Cross-Domain Fix Patterns

Real-world fixes often span multiple domains. When a fix requires expertise outside the current skill's domain:

1. **Skill identifies boundary**: "This Lambda fix also requires a schema change"
2. **Skill completes its portion**: Makes the Lambda code changes
3. **Skill hands off explicitly**: "To complete this fix, ask for help with the schema portion"
4. **User invokes next skill**: "Fix the schema part"

Skills should NOT attempt fixes outside their domain—they document the need and defer.

### Fallback Handling

When user intent is vague (e.g., "Fix it", "Fix all errors"), no skill may activate reliably. The `.clinerules` file should include a fallback rule:

```markdown
## Validation Fix Fallback
When fixing CORA validation errors and the domain is unclear:
1. Ask the user to specify: backend, data, frontend, or structure
2. Reference the validation output to suggest the most impactful domain
3. Never attempt multi-domain fixes without explicit user direction
4. Suggest `/help-validation.md` for users who seem confused about available commands
```

### Task Integration Strategy

Cline Tasks provide checkpoints and resumability for complex work. Use Tasks strategically:

| Scenario | Error Threshold | Recommendation |
|----------|-----------------|----------------|
| Single-domain, few errors | 1-3 errors in 1 domain | Continue in current conversation |
| Single-domain, many errors | 4+ errors in 1 domain | Consider starting a Task |
| Multi-domain fix session | 2+ errors across 2+ domains | **Create dedicated Task** for checkpointing |
| Interrupted fix session | Any | Resume Task to restore context |
| Documentation of fix pattern | Completed fix | Export Task as markdown |

**Workflow Guidance**: After `/validate.md` identifies multi-domain errors, output specific guidance:

```markdown
## Task Recommendation

You have **{X} errors across {N} domains**. This fix session may take multiple conversation turns.

**Recommended**: Start a new Task for checkpoint support:
> "Start a task to fix the validation errors"

This allows you to:
- Checkpoint after each fix
- Resume if interrupted
- Export the fix process for documentation
```

### Error Handling in Workflows

Workflows MUST handle failure cases gracefully:

```markdown
## 1. Run Validation
```bash
if [ ! -f "./validation/cora-validate.py" ]; then
    echo "ERROR: Validation script not found at ./validation/cora-validate.py"
    echo "Are you in the correct directory? Expected: project root"
    exit 1
fi

python3 ./validation/cora-validate.py --all --format json 2>&1 || {
    echo "ERROR: Validation script failed. Common causes:"
    echo "  - Missing Python 3"
    echo "  - Missing dependencies (run: pip install -r validation/requirements.txt)"
    echo "  - Invalid project structure"
    exit 1
}
```
```

### Architectural Safety

The `cora-toolkit-validation-backend` skill (and `/fix-backend.md` workflow) embeds Two-Repo Pattern enforcement:

```markdown
## Deployment Target Rules

**CRITICAL**: Before syncing any fix, determine the correct repository:

| Code Location | Target Repo | Sync Command |
|---------------|-------------|--------------|
| `packages/module-*/backend/` | `{project}-stack` | `sync-fix-to-project.sh <stack-path>` |
| `lambdas/authorizer/` | `{project}-infra` | `sync-fix-to-project.sh <infra-path>` |
| `templates/_modules-core/` | N/A (template only) | Copy to both if applicable |

**NEVER** sync functional module code to the infra repo.
```

### Supporting Documentation Strategy

To avoid content duplication and maintenance burden, skills and workflows reference existing documentation via relative paths:

```markdown
# In SKILL.md or fix-*.md workflow:
For complete Lambda deployment standards, see:
[Lambda Deployment Standard](../../../docs/standards/standard_LAMBDA-DEPLOYMENT.md)
```

**Do NOT** duplicate content from existing standards into skill/workflow bundles. Instead:
1. Reference existing docs with relative paths
2. Skills can bundle only skill-specific content (e.g., remediation workflows)
3. Update one source of truth, not multiple copies

### Skill Versioning

Skills include a version field for future compatibility and tracking:

```yaml
---
name: cora-toolkit-validation-backend
version: "1.0"
description: Fix CORA Lambda deployment errors...
---
```

Version updates should follow:
- **Patch** (1.0 → 1.1): Bug fixes, minor clarifications
- **Minor** (1.0 → 2.0): New capabilities, expanded coverage
- **Major** (1.x → 2.0): Breaking changes to skill behavior

### Task Integration

Cline Tasks provide natural support for multi-step remediation:

- **Checkpoints**: Each file modification creates a checkpoint
- **Resumability**: Interrupted fix sessions can be resumed
- **Export**: Completed sessions can be exported as documentation
- **Cost Tracking**: Token usage and API costs are monitored

---

## Consequences

**Positive**:
- **Correct Feature Usage**: Workflows and Skills used as designed
- **Explicit Execution**: `/validate.md` is deterministic and discoverable
- **Natural Remediation Flow**: Skills activate through normal conversation
- **Context Efficiency**: Skills load expertise only when domain is discussed
- **Repo Integrity**: Backend expert enforces Two-Repo boundaries
- **Guided Activation**: Workflows provide trigger-friendly language for reliable skill activation
- **Activation Observability**: Confirmation messages provide feedback on skill loading
- **Project Isolation**: Project-level skills avoid global precedence conflicts
- **Deterministic Fallbacks**: `/fix-*.md` workflows guarantee expertise access when skills fail
- **Distinctive Naming**: `cora-toolkit-validation-*` prefix minimizes global skill collision
- **No Documentation Duplication**: Skills reference existing docs, single source of truth
- **Discoverability**: `/help-validation.md` helps users find available commands
- **Error Resilience**: Workflows handle failures gracefully with actionable messages

**Negative**:
- **More Components**: 9 workflows + 4 skills = 13 components (was 4 + 4 = 8)
- **User Learning Curve**: Must understand workflow invocation (`/command`)
- **Manual Domain Handoff**: Cross-domain fixes require explicit user direction between skills

**Mitigated Risks**:
- ~~Activation Uncertainty~~: Fallback workflows guarantee expertise access
- ~~Precedence Conflicts~~: Highly distinctive `cora-toolkit-validation-*` naming reduces collision risk
- ~~Documentation Drift~~: Reference existing docs instead of duplicating
- ~~Discovery Confusion~~: `/help-validation.md` provides command reference

**Neutral**:
- **No Automatic Routing**: User drives domain selection through conversation (this is actually more natural)

---

## Troubleshooting

### Skill Doesn't Activate When Expected

**Symptoms**: User says "Fix the Lambda errors" but doesn't see activation confirmation.

**Diagnosis**:
1. Check if user has a global skill with the same name:
   - macOS/Linux: `ls ~/.cline/skills/`
   - Windows: `dir C:\Users\USERNAME\.cline\skills\`
2. Look for `cora-toolkit-validation-*` directories in global skills
3. If found, the global skill is taking precedence

**Resolution**:
1. Rename or remove the conflicting global skill
2. Or use the fallback workflow: `/fix-backend.md`

### Wrong Skill Activates

**Symptoms**: User asks for backend help but sees "Frontend Expert activated".

**Diagnosis**:
1. Check if the phrasing triggered a different skill
2. Verify skill descriptions don't have overlapping triggers

**Resolution**:
1. Use more specific trigger phrases
2. Or use the explicit fallback workflow

### Workflow Command Not Found

**Symptoms**: `/validate.md` doesn't execute.

**Diagnosis**:
1. Check that `.clinerules/workflows/` exists
2. Verify `validate.md` is in that directory
3. Ensure workflows are enabled in Cline settings

**Resolution**:
1. Create the workflows directory and files
2. Enable workflows in Cline Settings → Features

---

## Example Conversation Flows

### Flow 1: Single-Domain Fix (Happy Path - Skill Activates)

```
User: /validate.md
Cline: [Runs validation, shows 5 Lambda errors, 2 schema errors]
       
       Suggested next steps:
       
       **Option A: Natural Language**
       - Backend: "Fix the Lambda errors"
       - Data: "Fix the database naming issues"
       
       **Option B: Direct Workflow**
       - Backend: /fix-backend.md
       - Data: /fix-data.md
       
       Need help? Run /help-validation.md

User: Fix the Lambda errors
Cline: [cora-toolkit-validation-backend activates]
       ✅ **CORA Toolkit Backend Expert activated**
       
       I see 5 Lambda deployment issues. Let me fix them following
       the Template-First workflow...
```

### Flow 2: Skill Doesn't Activate (Fallback Path)

```
User: /validate.md
Cline: [Shows 5 Lambda errors]
       
       **Option A: Natural Language** - "Fix the Lambda errors"
       **Option B: Direct Workflow** - /fix-backend.md

User: Fix the Lambda errors
Cline: [Skill doesn't activate, generic response]
       I can help with that. What specifically needs fixing?

User: /fix-backend.md
Cline: [Workflow loads, expertise guaranteed]
       
       # CORA Backend Fix Workflow
       
       I'll help fix Lambda, API Gateway, and authorization issues.
       [Full remediation guidance loads...]
```

### Flow 3: Cross-Domain Fix

```
User: Fix the Lambda timeout error in module-ai
Cline: [cora-toolkit-validation-backend activates]
       ✅ **CORA Toolkit Backend Expert activated**
       
       The Lambda timeout is caused by a slow database query.
       I can fix the Lambda configuration, but the query optimization
       requires schema expertise.
       
       Lambda fix: Increased timeout to 30s (applied to template)
       
       To optimize the underlying query:
       - Say "Fix the slow query in ai_providers", OR
       - Use /fix-data.md directly

User: Fix the slow query in ai_providers
Cline: [cora-toolkit-validation-data activates]
       ✅ **CORA Toolkit Data Expert activated**
       
       Analyzing the query pattern...
```

### Flow 4: Vague Intent (Clarification + Fallback Options)

```
User: Fix all the errors
Cline: I found errors in multiple domains. To ensure correct fixes,
       please specify which domain to address first:
       
       **Say one of these** (skill activation):
       - "Fix the Lambda errors" (5 backend errors)
       - "Fix the database naming" (2 data errors)
       
       **Or use a workflow directly** (guaranteed):
       - /fix-backend.md
       - /fix-data.md
       
       Which should I fix first?

User: /fix-backend.md
Cline: [Workflow loads directly, no intent matching needed]
```

### Flow 5: New User Discovery

```
User: How do I validate my CORA project?
Cline: Run /help-validation.md for a list of all validation commands.

User: /help-validation.md
Cline: [Shows complete command reference with examples]
```

---

## Revision History

| Date | Change |
|------|--------|
| 2026-01-16 | Initial version (Option C: Hybrid Domain Skills) |
| 2026-01-16 | **Revised** to Option D after analysis revealed Option C's routing assumption was incompatible with Cline's skill architecture |
| 2026-01-16 | **Enhanced** with skill activation strategy, cross-domain patterns, fallback handling, and example conversation flows |
| 2026-01-16 | **Enhanced** with activation verification protocol, skill precedence rules, Task integration strategy, and observability improvements |
| 2026-01-16 | **Enhanced** with deterministic fallback workflows (`/fix-*.md`), distinctive skill naming (`cora-validation-*`), and documentation reference strategy (no duplication) |
| 2026-01-16 | **Enhanced** with `/help-validation.md` for discoverability, error handling in workflows, Task integration thresholds, troubleshooting section, skill versioning, and more distinctive `cora-toolkit-validation-*` naming |

---

## References

- `docs/plans/plan_validation_skills_implementation.md`
- `docs/guides/guide_FAST-ITERATION-TESTING.md`
- `docs/reference/doc-cline-skills.md`
- `docs/reference/doc-cline-workflows.md`
- `docs/reference/doc-cline-tasks.md`
- `validation/cora-validate.py`
