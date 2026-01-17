#!/bin/bash

# Make Schema Files Idempotent
# Adds IF NOT EXISTS clauses and DROP statements to ensure schemas can be run multiple times
#
# Usage: ./make-schemas-idempotent.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLKIT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATES_DIR="${TOOLKIT_ROOT}/templates/_modules-core"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

echo "========================================="
echo "  Make CORA Schemas Idempotent"
echo "========================================="
echo ""

# Find all schema SQL files
schema_files=$(find "$TEMPLATES_DIR" -path "*/db/schema/*.sql" -type f | sort)
file_count=$(echo "$schema_files" | wc -l | tr -d ' ')

log_info "Found $file_count schema files to process"
echo ""

log_step "Processing schema files..."
echo ""

for file in $schema_files; do
    filename=$(basename "$file")
    module=$(basename "$(dirname "$(dirname "$(dirname "$file")")")")
    
    log_info "Processing $module/$filename"
    
    # Create backup
    cp "$file" "${file}.bak"
    
    # 1. Fix CREATE TABLE - add IF NOT EXISTS
    sed -i.tmp 's/CREATE TABLE public\./CREATE TABLE IF NOT EXISTS public./g' "$file"
    
    # 2. Fix CREATE INDEX - add IF NOT EXISTS (if not already present)
    sed -i.tmp 's/CREATE INDEX \([^I]\)/CREATE INDEX IF NOT EXISTS \1/g' "$file"
    sed -i.tmp 's/CREATE UNIQUE INDEX \([^I]\)/CREATE UNIQUE INDEX IF NOT EXISTS \1/g' "$file"
    
    # 3. Fix CREATE POLICY - add DROP before CREATE
    # Extract table name from the ON clause
    if grep -q "CREATE POLICY" "$file"; then
        # Use Python for more reliable parsing
        SCHEMA_FILE="$file" python3 << 'PYEOF'
import os
import re

file_path = os.environ['SCHEMA_FILE']
with open(file_path, 'r') as f:
    content = f.read()

# Pattern: CREATE POLICY "name" ON table_name
# Replace with: DROP POLICY IF EXISTS "name" ON table_name;\nCREATE POLICY "name" ON table_name
pattern = r'CREATE POLICY "([^"]+)"\s+ON\s+([\w.]+)'
replacement = r'DROP POLICY IF EXISTS "\1" ON \2;\nCREATE POLICY "\1" ON \2'
content = re.sub(pattern, replacement, content)

with open(file_path, 'w') as f:
    f.write(content)
PYEOF
    fi
    
    # 4. Fix CREATE TRIGGER - add DROP before CREATE
    # Extract table name from BEFORE/AFTER ... ON clause
    if grep -q "CREATE TRIGGER" "$file"; then
        SCHEMA_FILE="$file" python3 << 'PYEOF'
import os
import re

file_path = os.environ['SCHEMA_FILE']
with open(file_path, 'r') as f:
    content = f.read()

# Pattern: CREATE TRIGGER name ... ON table_name
# Replace with: DROP TRIGGER IF EXISTS name ON table_name;\nCREATE TRIGGER name ... ON table_name
pattern = r'CREATE TRIGGER\s+(\w+)\s+(BEFORE|AFTER)\s+(INSERT|UPDATE|DELETE|UPDATE\s+OF[^O]+)\s+ON\s+([\w.]+)'
replacement = r'DROP TRIGGER IF EXISTS \1 ON \4;\nCREATE TRIGGER \1 \2 \3 ON \4'
content = re.sub(pattern, replacement, content)

with open(file_path, 'w') as f:
    f.write(content)
PYEOF
    fi
    
    # Clean up temp files
    rm -f "${file}.tmp"
    
    echo "   ✓ Updated $module/$filename"
done

echo ""
log_info "✅ All schema files processed!"
echo ""
log_info "Backups created with .bak extension"
log_info "Review changes and test with: ./run-database-migrations.sh"
echo ""
