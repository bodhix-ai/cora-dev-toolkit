# Validator Improvements Plan

**Status**: 📋 PLANNED (Not started in this branch)  
**Priority**: MEDIUM (Quality improvement)  
**Scope**: Reduce false positives in validation tools  
**Estimated Duration**: 1-2 sessions (~3-4 hours)

---

## Executive Summary

During module-eval validation (Session 134), we identified significant false positive issues in three validators. This plan documents the required improvements to make validators more accurate and reduce noise in validation reports.

---

## Problem Statement

Validation run on `templates/_modules-functional/module-eval/` revealed:

| Validator | Reported Errors | Actual Issues | False Positives |
|-----------|-----------------|---------------|-----------------|
| Accessibility | 48 | 0 | 48 (100%) |
| DB Naming | 280 | ~20 | ~260 (93%) |
| CORA Compliance | 1 | 0 | 1 (100%) |

**Total false positives: ~309 errors that are validator limitations, not actual code issues.**

---

## Phase 1: DB Naming Validator - Skip SQL Keywords

**File:** `scripts/validate-db-naming.py`  
**Complexity:** Low (5-10 min)

### Current Issue

The `extract_column_name()` function uses a simple regex that matches the first word on lines, including SQL keywords in PL/pgSQL function definitions:

```python
def extract_column_name(line: str) -> Optional[str]:
    match = re.match(r'\s+([a-z_][a-z0-9_]*)\s+', line, re.IGNORECASE)
    return match.group(1) if match else None
```

This incorrectly identifies `RETURN`, `BEFORE`, `FOR`, `IF`, etc. as column names.

### Fix

Add SQL keyword skip list:

```python
# SQL keywords that appear at start of lines in PL/pgSQL
SQL_KEYWORDS = {
    'RETURN', 'RETURNS', 'BEGIN', 'END', 'IF', 'THEN', 'ELSE', 'ELSIF',
    'CASE', 'WHEN', 'LOOP', 'FOR', 'WHILE', 'BEFORE', 'AFTER', 'DECLARE',
    'NEW', 'OLD', 'EXECUTE', 'PERFORM', 'RAISE', 'EXCEPTION', 'INTO',
    'AS', 'LANGUAGE', 'FUNCTION', 'TRIGGER', 'PROCEDURE', 'OR', 'AND',
    'NOT', 'NULL', 'TRUE', 'FALSE', 'IN', 'OUT', 'INOUT', 'SELECT',
    'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'SET', 'VALUES',
    'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'GRANT',
    'REVOKE', 'ON', 'TO', 'WITH', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
    'OUTER', 'USING', 'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT',
    'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT', 'DISTINCT', 'ALL',
}

def extract_column_name(line: str) -> Optional[str]:
    # ... existing skip logic ...
    
    match = re.match(r'\s+([a-z_][a-z0-9_]*)\s+', line, re.IGNORECASE)
    if match:
        name = match.group(1)
        # Skip SQL keywords
        if name.upper() in SQL_KEYWORDS:
            return None
        return name
    return None
```

### Expected Impact
- Reduce DB naming errors from ~280 to ~20 (real issues only)
- `created_by` and `updated_by` fields will still be flagged (legitimate - should end with `_id`)

---

## Phase 2: CORA Compliance Validator - Reduce Raw SQL False Positives

**File:** `validation/cora-compliance-validator/validator.py`  
**Complexity:** Low-Medium (10-15 min)

### Current Issue

The `RAW_SQL_PATTERNS` regex matches strings containing SQL keywords even in comments, docstrings, or non-query contexts:

```python
RAW_SQL_PATTERNS = [
    re.compile(r'["\']SELECT\s+.*FROM', re.IGNORECASE),
    re.compile(r'["\']INSERT\s+INTO', re.IGNORECASE),
    re.compile(r'["\']UPDATE\s+.*SET', re.IGNORECASE),
    re.compile(r'["\']DELETE\s+FROM', re.IGNORECASE),
]
```

### Fix Options

**Option A: Context-aware detection**
- Skip matches inside docstrings (triple-quoted strings)
- Skip matches inside comments (lines starting with `#`)
- Only match actual execution calls (`.execute(`, `cursor.`)

**Option B: Positive pattern matching (recommended)**
- Instead of detecting raw SQL, verify that DB operations use helpers
- If `common.find_one/many/insert_one/update_one/delete_one` are used, consider compliant
- Only flag if `.execute()` or `cursor.` patterns are found

```python
# Actual SQL execution patterns (true violations)
SQL_EXECUTION_PATTERNS = [
    re.compile(r'\.execute\s*\(["\']'),
    re.compile(r'cursor\.(execute|executemany)\s*\('),
    re.compile(r'conn\.(execute|cursor)\s*\('),
]
```

### Expected Impact
- Eliminate false positive in eval-config Lambda
- More accurate detection of actual raw SQL usage

---

## Phase 3: Accessibility Validator - Detect `<label htmlFor>`

**Files:**
- `validation/a11y-validator/validators/forms_validator.py`
- `validation/a11y-validator/parsers/component_parser.py`

**Complexity:** Medium (20-30 min)

### Current Issue

The `_has_label()` method only checks for:
- `aria-label` attribute
- `aria-labelledby` attribute
- MUI `label` prop
- `inputProps` with `aria-label`

It does NOT check for standard HTML `<label htmlFor>` associations.

### Fix

**Step 1: Update component parser to capture label elements**

```python
# In component_parser.py
def parse_file(self, file_path: str) -> Dict[str, Any]:
    # ... existing parsing ...
    
    # Also capture label elements
    labels = self._extract_labels(content)
    
    return {
        'file_path': file_path,
        'elements': elements,
        'labels': labels  # New: map of htmlFor -> label element
    }

def _extract_labels(self, content: str) -> Dict[str, Dict]:
    """Extract label elements with their htmlFor attributes."""
    labels = {}
    # Match <label htmlFor="..." or <label for="..."
    pattern = re.compile(r'<label[^>]*(?:htmlFor|for)=["\']([^"\']+)["\']')
    for match in pattern.finditer(content):
        label_id = match.group(1)
        labels[label_id] = {'line': content[:match.start()].count('\n') + 1}
    return labels
```

**Step 2: Update forms validator to use label context**

```python
# In forms_validator.py
def validate(self, elements: List[Dict], labels: Dict[str, Dict] = None) -> List[Dict]:
    """Validate form controls with label context."""
    self.labels = labels or {}
    # ... rest of validation
    
def _has_label(self, element: Dict) -> bool:
    # Existing checks...
    
    # NEW: Check for associated <label htmlFor>
    element_id = element['attributes'].get('id')
    if element_id and element_id in self.labels:
        return True
    
    return False
```

### Expected Impact
- Eliminate 48 false positives in module-eval
- Components with proper `<label htmlFor>` will pass validation

---

## Implementation Order

1. **DB Naming Validator** - Simplest fix, immediate impact
2. **CORA Compliance Validator** - Small fix, eliminates eval-config false positive
3. **Accessibility Validator** - More complex, requires parser changes

---

## Testing Plan

After implementing fixes, re-run validation on module-eval:

```bash
python3 validation/cora-validate.py module templates/_modules-functional/module-eval
```

**Expected Results:**

| Validator | Before | After |
|-----------|--------|-------|
| Accessibility | 48 errors | 0 errors |
| DB Naming | 280 errors | ~20 errors |
| CORA Compliance | 1 error | 0 errors |
| **Total** | **~329 errors** | **~20 errors** |

---

## Notes

- This work was identified during module-eval validation but NOT implemented in `feature/module-eval-implementation` branch
- May have been implemented in a different branch (check `main` or other feature branches)
- Validator improvements benefit all CORA modules, not just module-eval

---

## Change Log

| Date | Session | Changes |
|------|---------|---------|
| Jan 16, 2026 | 135 | Plan created based on module-eval validation analysis |
