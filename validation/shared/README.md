# CORA Validation Shared Components

**Shared utilities and parsers used across multiple validators.**

## Overview

This module provides common schema parsing infrastructure used by multiple CORA validators to ensure consistency and avoid code duplication.

## Architecture

```
validation/
├── shared/                     # Shared components (DRY principle)
│   ├── __init__.py            # Package exports
│   ├── schema_types.py        # Common dataclasses
│   ├── static_schema_parser.py # SQL schema parser
│   └── README.md              # This file
│
├── schema-validator/          # Uses shared parser
│   └── cli.py                 # Imports from ../shared/
│
└── audit-column-validator/    # Uses shared parser
    └── cli.py                 # Imports from ../shared/
```

## Components

### 1. schema_types.py

Common dataclasses for schema representation:

```python
from shared.schema_types import ColumnInfo, TableInfo

@dataclass
class ColumnInfo:
    """Information about a database column."""
    name: str
    data_type: str
    is_nullable: bool
    column_default: Optional[str]

@dataclass
class TableInfo:
    """Information about a database table."""
    name: str
    columns: Dict[str, ColumnInfo]
```

### 2. static_schema_parser.py

Robust SQL file parser for schema extraction:

**Features:**
- ✅ Handles multi-line CREATE TABLE statements
- ✅ Respects nested parentheses in constraints
- ✅ Removes comments before parsing
- ✅ Supports both simple and complex column syntax
- ✅ Proper comma splitting with parentheses depth tracking

**Usage:**

```python
from shared.static_schema_parser import StaticSchemaParser, find_schema_sql_files

# Parse SQL files
parser = StaticSchemaParser()
sql_files = find_schema_sql_files(Path("templates"))
schema = parser.parse_sql_files(sql_files)

# Access parsed tables
for table_name, table_info in schema.items():
    print(f"Table: {table_name}")
    for col_name, col_info in table_info.columns.items():
        print(f"  - {col_name}: {col_info.data_type}")
```

## Why Shared Components?

### Before (Duplicated Logic)

Each validator had its own SQL parsing:

❌ **audit-column-validator:** Basic regex, failed on complex tables  
❌ **schema-validator:** Sophisticated parser, but isolated  
❌ **Result:** Bugs in one, working in other (inconsistent behavior)

### After (Shared Components)

Both validators use the same robust parser:

✅ **Single source of truth** for SQL parsing  
✅ **Consistent behavior** across validators  
✅ **Bug fixes benefit all** validators simultaneously  
✅ **Easier maintenance** - update once, fix everywhere

## Validators Using Shared Components

### 1. schema-validator

**Purpose:** Validates Lambda queries against Supabase schema

**Import:**
```python
from shared.static_schema_parser import StaticSchemaParser, find_schema_sql_files
```

**Usage:** Template validation mode (`--static` flag)

### 2. audit-column-validator

**Purpose:** Validates ADR-015 audit column compliance

**Import:**
```python
from shared.static_schema_parser import StaticSchemaParser, find_schema_sql_files
from shared.schema_types import ColumnInfo, TableInfo
```

**Usage:** Parses SQL files to check for required audit columns

## Testing

Both validators have been tested and verified:

**Audit Column Validator:**
```bash
cd cora-dev-toolkit
python3 validation/audit-column-validator/cli.py templates

# Result: ✅ Correctly detects all columns (including is_deleted)
# Previously: ❌ False positive on voice_sessions (parsing bug)
```

**Schema Validator:**
```bash
cd cora-dev-toolkit
python3 validation/schema-validator/cli.py --path templates --static --output json

# Result: ✅ Parsed 59 tables from 71 SQL files
# Result: ✅ Validated 721 queries
```

## Adding New Validators

When creating a new validator that needs schema parsing:

1. **Import shared components:**
   ```python
   import sys
   from pathlib import Path
   sys.path.insert(0, str(Path(__file__).parent.parent))
   from shared.static_schema_parser import StaticSchemaParser
   from shared.schema_types import ColumnInfo, TableInfo
   ```

2. **Use the parser:**
   ```python
   parser = StaticSchemaParser()
   schema = parser.parse_sql_files(sql_files)
   ```

3. **Work with standard types:**
   ```python
   for table_name, table_info in schema.items():
       for col_name, col_info in table_info.columns.items():
           # col_info is ColumnInfo dataclass
           print(f"{col_name}: {col_info.data_type}")
   ```

## Benefits

### Code Quality
- **Single responsibility:** Each module has one job
- **Type safety:** Dataclasses provide clear contracts
- **Maintainability:** Fix once, benefit everywhere

### Developer Experience
- **Consistency:** Same parsing behavior across tools
- **Reliability:** Well-tested, production-ready parser
- **Extensibility:** Easy to add new validators

### Performance
- **Caching:** Parser caches schema for repeated queries
- **Efficiency:** Parse SQL once, use many times

## Version History

- **v1.0.0** (January 22, 2026) - Initial shared components
  - Created schema_types.py with common dataclasses
  - Moved static_schema_parser.py from schema-validator
  - Updated both validators to use shared components
  - Fixed SQL parsing bug in audit-column-validator

## Related Documentation

- **schema-validator:** `validation/schema-validator/README.md`
- **audit-column-validator:** Uses shared components for ADR-015 compliance
- **ADR-015:** `docs/arch decisions/ADR-015-MODULE-ENTITY-AUDIT-COLUMNS.md`

---

**Maintained as part of CORA Development Toolkit**
