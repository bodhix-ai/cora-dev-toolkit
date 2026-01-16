# CORA Backend Validation

Run backend-specific validators only.

## 1. Run Backend Validators

```bash
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ ! -f "./validation/cora-validate.py" ]; then
    echo "ERROR: Validation script not found. Are you in the project root?"
    exit 1
fi

# Run project validation with backend-related validators
# Use --include to select specific validators
python3 ./validation/cora-validate.py project . --include api-tracer,cora-compliance,role-naming 2>&1 || {
    echo "ERROR: Validation failed. Check Python 3 and dependencies."
    exit 1
}
```

## 2. Analyze Results

Focus on:
- Lambda deployment issues (source_code_hash, runtime, layers)
- API Gateway routing (route docstrings, method matching)
- Authorization configuration (authorizer attachment)
- Role naming compliance (CORA role standards)

## 3. Present Results with Dual-Path Guidance

Show errors categorized by type, then provide guidance:

**Option A: Natural Language (Skill Activation)**
- "Fix the Lambda errors" - for deployment/configuration issues
- "Fix the API routing" - for Gateway/route issues
- "Fix the authorizer" - for authorization problems

**Option B: Direct Workflow (Guaranteed)**
- `/fix-backend.md` - loads backend expertise directly

## 4. Remediation

When you request a fix, the `cora-toolkit-validation-backend` skill will activate 
and guide you through the Template-First workflow using `/fix-and-sync.md`.

If the skill doesn't activate, use `/fix-backend.md` as a guaranteed fallback.
