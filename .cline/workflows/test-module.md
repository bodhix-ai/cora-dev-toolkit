# CORA Module Testing Pipeline

Orchestrates the full testing cycle for new CORA modules with AI-first error fixing.

**Usage:** `/test-module.md <module-name> <test-ws-number>`

**Example:** `/test-module.md module-kb 24`

---

## Phase 0: Configuration Preparation

### Step 0.1: Verify Config File Exists

The user must have prepared the setup config file before starting:

```bash
CONFIG_FILE="templates/_project-stack-template/setup.config.test-ws-${WS_NUMBER}.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: Config file not found: $CONFIG_FILE"
    echo "Please create it based on the latest test config (e.g., setup.config.test-ws-23.yaml)"
    exit 1
fi
```

### Step 0.2: User Confirmation

Ask the user to confirm the config file is ready with the new module enabled:

```xml
<ask_followup_question>
  <question>Have you updated setup.config.test-ws-${WS_NUMBER}.yaml with ${MODULE_NAME} enabled in the modules.enabled list?</question>
  <options>["Yes, config is ready", "No, I need to update it first"]</options>
</ask_followup_question>
```

**Wait for user confirmation before proceeding.**

---

## Phase 1: Project Creation (~3-4 min)

### Step 1.1: Create Project

```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit

# Create the project from config
./scripts/create-cora-project.sh --input templates/_project-stack-template/setup.config.test-ws-${WS_NUMBER}.yaml
```

### Step 1.2: Capture Validation Results

The create-cora-project.sh script runs validation automatically. Capture and analyze any errors.

**If validation errors are found:**
- Invoke `/fix-cycle.md` with the errors
- After fixes, re-run this phase

**If validation passes:**
- Continue to Phase 2

---

## Phase 2: Pre-Deployment Validation (~1-2 min)

**Purpose:** Catch errors BEFORE expensive 5-minute Terraform deployment.

### Step 2.1: Install Dependencies

```bash
PROJECT_PATH="~/code/bodhix/testing/test-ws-${WS_NUMBER}"
cd ${PROJECT_PATH}/ai-sec-stack
pnpm install --frozen-lockfile 2>&1
```

### Step 2.2: TypeScript Type Check

```bash
cd ${PROJECT_PATH}/ai-sec-stack
pnpm -r run type-check 2>&1
```

**If TypeScript errors are found:**
- Present all errors grouped by file
- Invoke `/fix-cycle.md` with the errors
- After fixes, re-run Step 2.2

### Step 2.3: Lambda Build Verification

```bash
cd ${PROJECT_PATH}/ai-sec-stack

# Build all module Lambdas
for module_dir in packages/module-*/backend; do
    if [ -f "$module_dir/build.sh" ]; then
        echo "Building: $module_dir"
        (cd "$module_dir" && bash build.sh) 2>&1
    fi
done
```

**If build errors are found:**
- Present all errors grouped by module
- Invoke `/fix-cycle.md` with the errors
- After fixes, re-run Step 2.3

### Step 2.4: Run Pre-Deploy Check Script

```bash
cd ${PROJECT_PATH}/ai-sec-infra
./scripts/pre-deploy-check.sh 2>&1
```

**If pre-deploy check fails:**
- Present all errors
- Invoke `/fix-cycle.md` with the errors
- After fixes, re-run Step 2.4

---

## Phase 3: Infrastructure Deployment (~4-5 min)

### Step 3.1: Deploy All Infrastructure

```bash
cd ${PROJECT_PATH}/ai-sec-infra
./scripts/deploy-all.sh dev 2>&1
```

### Step 3.2: Handle Deployment Errors

**If Terraform errors occur:**
- Present errors with context
- Invoke `/fix-cycle.md` with the errors
- After fixes, re-run Phase 3

**If deployment succeeds:**
- Capture API Gateway endpoint from output
- Continue to Phase 4

---

## Phase 4: Development Server (~1 min)

### Step 4.1: Start Dev Server

```bash
cd ${PROJECT_PATH}/ai-sec-stack
./scripts/start-dev.sh 2>&1
```

### Step 4.2: Handle Startup Errors

**If TypeScript/Next.js errors occur:**
- Present errors
- Invoke `/fix-cycle.md` with the errors
- After fixes, re-run Phase 4

---

## Phase 5: Environment Ready Signal

When all phases complete without errors, present the ready signal:

```markdown
## ✅ Test Environment Ready

**Project:** test-ws-${WS_NUMBER}
**Module:** ${MODULE_NAME}

**Paths:**
- Stack: ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-stack
- Infra: ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-infra

**Dev Server:** http://localhost:3000

**What was validated:**
- ✅ Project creation
- ✅ TypeScript compilation
- ✅ Lambda builds
- ✅ Infrastructure deployment
- ✅ Dev server startup

**Ready for user testing.** Report any issues you discover and I'll fix them.
```

---

## Error Handling Strategy

Throughout all phases:

1. **Collect all errors** before attempting fixes
2. **Categorize errors** by domain:
   - Frontend (TypeScript, React, Next.js)
   - Backend (Python, Lambda, API)
   - Infrastructure (Terraform, AWS)
   - Data (Database, Schema, RLS)
3. **Fix in batch** using `/fix-cycle.md`
4. **Re-validate** only the affected phase
5. **Loop until clean** before proceeding

---

## Module Testing Sequence

| Test Project | Modules Enabled | Config File |
|--------------|-----------------|-------------|
| test-ws-24 | ws, **kb** | setup.config.test-ws-24.yaml |
| test-ws-25 | ws, kb, **chat** | setup.config.test-ws-25.yaml |
| test-ws-26 | ws, kb, chat, **eval** | setup.config.test-ws-26.yaml |

**Rule:** Do not proceed to next module until current passes all validation.
