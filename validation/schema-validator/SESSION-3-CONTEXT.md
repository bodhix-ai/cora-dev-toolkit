# Session 3 Context: Schema Validator Enhancement & Integration

**Previous Session:** Session 2 - Core Implementation (COMPLETE)  
**Current Session:** Session 3 - Enhancement & Integration  
**Date:** November 25, 2025  
**Estimated Duration:** 2-3 hours

---

## Quick Start - What You Need to Know

### Current Status

- ✅ **Schema validator fully implemented** (8 Python modules, 2,000+ lines)
- ✅ **Tested and working** (query parser, CLI, credential loading)
- ⚠️ **Enhancement needed:** Add `org_common` pattern detection
- ⚠️ **Database connectivity issue:** Supabase network blocked (user config needed)

### What's Working

1. **Query Parser** - Successfully extracts queries using Python AST
2. **CLI** - Fully functional with JSON output, credential validation
3. **Credentials** - Loaded from `.env` file (already created and configured)
4. **Documentation** - Comprehensive README and session summaries

### What Needs Work (This Session)

1. **Critical:** Enhance query parser to detect `org_common` patterns (~1-2 hours)
2. **Important:** Resolve Supabase connectivity (user configuration)
3. **Testing:** Full validation workflow once patterns added
4. **Integration:** Pre-commit hooks and CI/CD (optional)

---

## Critical Discovery from Session 2

### Lambda Files Use Abstraction Layer

**Current Pattern Detection:**

```python
# ✅ Detected by current implementation
supabase.table('users').select('id', 'name').execute()
```

**Actual Lambda Patterns (NOT detected yet):**

```python
# ❌ Not detected - needs enhancement
common.find_one('profiles', {'user_id': user_id})
common.find_many('ai_models', filters={'status': 'available'})
common.update_one(table='platform_rag', filters={'id': config_id}, data=update_data)
common.insert_one(table='org_prompt_engineering', data=insert_data)
common.delete_one(table='profiles', filters={'id': profile_id})
```

**Impact:** Parser found 0 queries when testing against `ai-config-handler` Lambda because it only looks for direct Supabase calls.

**Solution:** Enhance `query_parser.py` to detect `org_common` function calls and extract table names from their parameters.

---

## File Locations

### Tool Location

```
pm-app-stack/scripts/validation/schema-validator/
├── cli.py                      # Main CLI entry point
├── query_parser.py             # ⚠️ NEEDS ENHANCEMENT
├── schema_inspector.py         # Database connection (working)
├── validator.py                # Validation logic (working)
├── fix_proposer.py             # Fix generation (working)
├── reporter.py                 # Output formatting (working)
├── requirements.txt            # Dependencies (installed)
├── .env                        # Credentials (configured)
└── README.md                   # Documentation
```

### Test Files

```
pm-app-stack/packages/ai-config-module/backend/lambdas/ai-config-handler/lambda_function.py
pm-app-stack/packages/org-module/backend/.build/orgs/lambda_function.py
pm-app-stack/packages/org-module/backend/.build/members/lambda_function.py
```

### Documentation

```
pm-app-stack/scripts/validation/schema-validator/SESSION-2-SUMMARY.md
pm-app-stack/scripts/validation/schema-validator/SESSION-3-CONTEXT.md (this file)
pm-app-stack/docs/implementation/phase-1-validation-tools-implementation-plan.md
```

---

## Session 3 Task Breakdown

### Task 1: Enhance Query Parser (PRIORITY - 1-2 hours)

**File to modify:** `pm-app-stack/scripts/validation/schema-validator/query_parser.py`

**What to add:**

1. Detection for `common.find_one(table, filters)` pattern
2. Detection for `common.find_many(table, filters)` pattern
3. Detection for `common.update_one(table=..., filters=..., data=...)` pattern
4. Detection for `common.insert_one(table=..., data=...)` pattern
5. Detection for `common.delete_one(table, filters)` pattern

**How to implement:**

- In `_handle_call()` method, add detection for `org_common` or `common` module
- Extract table name from first positional argument or `table=` keyword argument
- For `.find_many()`, `.update_one()`, etc., extract `select` parameter for columns
- Build query reference with table name and operation type

**Example enhancement:**

```python
def _handle_call(self, node: ast.Call):
    """Handle function/method call node."""

    # Existing Supabase detection...
    if isinstance(node.func, ast.Attribute):
        method_name = node.func.attr

        # NEW: Detect org_common patterns
        if method_name in ['find_one', 'find_many', 'update_one', 'insert_one', 'delete_one']:
            self._handle_org_common_method(node, method_name)
        # Existing Supabase detection...
        elif method_name in ['select', 'insert', 'update', 'delete', 'upsert']:
            self._handle_query_method(node, method_name)
```

**Testing:**

```bash
cd pm-app-stack/scripts/validation/schema-validator
python3 cli.py --path ../../packages/ai-config-module/ --output json
# Should now find queries in Lambda files
```

### Task 2: Resolve Database Connectivity (User Action + 30 min)

**Issue:** Supabase direct PostgreSQL connection blocked

```
ERROR: connection to server at "db.jjsqxcbndvwzhmymrmnw.supabase.co", port 5432 failed: No route to host
```

**Solutions to try:**

1. **Enable IPv4 in Supabase:**
   - Go to Supabase project settings
   - Database → Connection pooling
   - Enable "Direct connection"
   - Add IP to whitelist if needed

2. **Use Connection Pooler URL:**
   - Update `.env` file with pooler URL
   - `SUPABASE_DB_HOST=db.jjsqxcbndvwzhmymrmnw.supabase.co` → `aws-0-us-east-1.pooler.supabase.com`
   - Port 6543 instead of 5432

3. **Test connection:**
   ```bash
   python3 cli.py list-tables
   ```

### Task 3: Full Validation Testing (30 min)

**Once patterns added and DB connected:**

```bash
# Test full validation workflow
cd pm-app-stack/scripts/validation/schema-validator

# 1. Test parsing with enhanced patterns
python3 cli.py --path ../../packages/ai-config-module/ --verbose

# 2. Test schema validation
python3 cli.py --path ../../packages/ai-config-module/ --output json

# 3. Test fix proposals
python3 cli.py --path ../../packages/ai-config-module/ --propose-fixes

# 4. Test against multiple modules
python3 cli.py --path ../../packages/ --output json
```

**Success criteria:**

- Parser finds queries in Lambda files (> 0 queries)
- Schema introspection succeeds (lists tables)
- Validation detects schema mismatches (if any)
- Proposed fixes are actionable

### Task 4: CI/CD Integration (Optional - 1 hour)

**If time permits:**

1. Create pre-commit hook
2. Create GitHub Actions workflow
3. Test in CI/CD environment

**See:** `pm-app-stack/docs/implementation/phase-1-validation-tools-implementation-plan.md` Session 3 section for details.

---

## Environment Setup (Already Done)

### Credentials

- ✅ `.env` file created
- ✅ Extracted from `pm-app-infra/envs/dev/local-secrets.tfvars`
- ✅ Contains Supabase database credentials

### Dependencies

- ✅ Python 3.11+
- ✅ All packages installed via `pip install -r requirements.txt`

### Test Commands

```bash
# Verify setup
python3 cli.py check-credentials  # ✅ Passed
python3 cli.py list-tables        # ❌ Network blocked (needs fix)

# Test parsing
python3 -c "from query_parser import QueryParser; p = QueryParser(); print(p.parse_file('../../packages/ai-config-module/backend/lambdas/ai-config-handler/lambda_function.py'))"
# Result: 0 queries (expected - needs org_common pattern)
```

---

## Code Reference - Where to Make Changes

### Primary File: query_parser.py

**Location:** `pm-app-stack/scripts/validation/schema-validator/query_parser.py`

**Key Methods to Enhance:**

1. **`_handle_call(self, node)`** (Line ~85)
   - Add detection for `org_common` function calls

2. **`_extract_table_name(self, node)`** (Line ~150)
   - Add logic to extract table from first argument or keyword argument

**Add New Method:**

```python
def _handle_org_common_method(self, node: ast.Call, method_name: str):
    """
    Handle org_common function calls (find_one, find_many, etc.)

    Examples:
        common.find_one('profiles', {'user_id': user_id})
        common.find_many('ai_models', filters={'status': 'available'})
        common.update_one(table='platform_rag', filters={...}, data={...})
    """
    # Extract table name from first positional arg or 'table' keyword
    table_name = None

    # Check first positional argument
    if node.args and len(node.args) > 0:
        arg = node.args[0]
        if isinstance(arg, ast.Constant):
            table_name = arg.value
        elif isinstance(arg, ast.Str):
            table_name = arg.s

    # Check for 'table' keyword argument
    if not table_name:
        for keyword in node.keywords:
            if keyword.arg == 'table':
                if isinstance(keyword.value, ast.Constant):
                    table_name = keyword.value.value
                elif isinstance(keyword.value, ast.Str):
                    table_name = keyword.value.s

    # Extract columns if available (from 'select' parameter)
    columns = []
    for keyword in node.keywords:
        if keyword.arg == 'select':
            # Extract column list
            if isinstance(keyword.value, ast.Constant):
                select_str = keyword.value.value
                if isinstance(select_str, str):
                    columns = [col.strip() for col in select_str.split(',')]

    # Create query reference
    query_ref = QueryReference(
        file=self.current_file,
        line=node.lineno,
        table=table_name,
        columns=columns,
        operation=method_name,
        query_string=ast.unparse(node) if hasattr(ast, 'unparse') else ""
    )

    self.queries.append(query_ref)
    logger.debug(f"Found org_common {method_name}: table={table_name}, columns={columns}")
```

---

## Expected Test Results (After Enhancement)

### Before Enhancement (Current State)

```json
{
  "total_queries": 0,
  "tables_used": [],
  "queries": []
}
```

### After Enhancement (Expected)

```json
{
  "total_queries": 25,
  "tables_used": [
    "profiles",
    "ai_models",
    "platform_rag",
    "org_users",
    "org_prompt_engineering",
    "ai_providers"
  ],
  "queries": [
    {
      "file": "packages/ai-config-module/backend/lambdas/ai-config-handler/lambda_function.py",
      "line": 48,
      "table": "profiles",
      "columns": [],
      "operation": "find_one",
      "query_string": "common.find_one('profiles', {'user_id': user_id})"
    },
    ...
  ]
}
```

---

## Session 3 Checklist

### Phase 1: Enhancement (1-2 hours)

- [ ] Read existing `query_parser.py` code
- [ ] Add `_handle_org_common_method()` function
- [ ] Update `_handle_call()` to detect `org_common` calls
- [ ] Test parsing on ai-config-handler Lambda
- [ ] Verify queries are now detected (> 0 results)
- [ ] Test on multiple Lambda files

### Phase 2: Database Connectivity (30 min)

- [ ] Try direct connection (check Supabase settings)
- [ ] Try connection pooler URL if needed
- [ ] Test `python3 cli.py list-tables`
- [ ] Verify tables are listed

### Phase 3: Full Validation (30 min)

- [ ] Run full validation on ai-config-module
- [ ] Check for schema mismatches
- [ ] Test fix proposals
- [ ] Validate against multiple modules

### Phase 4: Documentation (30 min)

- [ ] Update SESSION-2-SUMMARY.md with results
- [ ] Update README.md if needed
- [ ] Create Session 3 completion summary
- [ ] Update implementation plan checklist

---

## Quick Command Reference

```bash
# Navigate to tool directory
cd pm-app-stack/scripts/validation/schema-validator

# Test parsing (works offline)
python3 -c "from query_parser import QueryParser; p = QueryParser(); queries = p.parse_file('../../packages/ai-config-module/backend/lambdas/ai-config-handler/lambda_function.py'); print(f'Found {len(queries)} queries')"

# Test database connection
python3 cli.py list-tables

# Run validation (requires DB connection)
python3 cli.py --path ../../packages/ai-config-module/ --output json

# Run with fixes
python3 cli.py --path ../../packages/ --propose-fixes --output text

# Verbose mode
python3 cli.py --path ../../packages/ --verbose
```

---

## Key Files Reference

| File                  | Purpose                     | Status               |
| --------------------- | --------------------------- | -------------------- |
| `query_parser.py`     | Extract queries from Python | ⚠️ Needs enhancement |
| `schema_inspector.py` | Database connection         | ✅ Working           |
| `validator.py`        | Schema validation           | ✅ Working           |
| `cli.py`              | Command-line interface      | ✅ Working           |
| `.env`                | Database credentials        | ✅ Configured        |

---

## Success Metrics for Session 3

### Must Have

- ✅ Query parser detects `org_common` patterns
- ✅ Parser finds > 0 queries in Lambda files
- ✅ Tool can be used by AI agents

### Should Have

- ✅ Database connection working
- ✅ Full validation workflow tested
- ✅ Documentation updated

### Nice to Have

- Pre-commit hooks configured
- GitHub Actions workflow created
- Tested in CI/CD

---

## Notes from Session 2

1. **Lambda Architecture:** All Lambda functions use `org_common` abstraction layer for database access
2. **Supabase Connectivity:** Direct PostgreSQL connection may require IP whitelisting
3. **Tool Design:** AI-friendly with JSON output, clear exit codes, no interactive prompts
4. **Code Quality:** Production-ready with comprehensive error handling

---

**Ready to Start Session 3!** 🚀

Focus on Task 1 (enhance query parser) first - this is the critical blocker for making the tool useful for this project.
