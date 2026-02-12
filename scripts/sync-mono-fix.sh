#!/bin/bash

# Sync fixed file to monorepo test project with placeholder replacement
# Usage: ./scripts/sync-mono-fix.sh <template-file> <test-project-path>

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <template-file> <test-project-path>"
  echo "Example: $0 templates/_project-monorepo-template/apps/web/app/admin/sys/SystemAdminClientPage.tsx /Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack"
  exit 1
fi

TEMPLATE_FILE="$1"
TEST_PROJECT_PATH="$2"

# Extract project name from test project path
# e.g., /Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack → ai-mod
PROJECT_NAME=$(basename "$TEST_PROJECT_PATH" | sed 's/-stack$//')

echo "Template file: $TEMPLATE_FILE"
echo "Test project: $TEST_PROJECT_PATH"
echo "Project name: $PROJECT_NAME"

# Determine relative path within template
if [[ "$TEMPLATE_FILE" == *"_project-monorepo-template/"* ]]; then
  # Extract path after templates/_project-monorepo-template/
  RELATIVE_PATH="${TEMPLATE_FILE##*templates/_project-monorepo-template/}"
  TARGET_FILE="$TEST_PROJECT_PATH/$RELATIVE_PATH"
elif [[ "$TEMPLATE_FILE" == *"_modules-core/"* ]]; then
  # Extract module name and path
  AFTER_MODULES="${TEMPLATE_FILE##*templates/_modules-core/}"
  MODULE_NAME="${AFTER_MODULES%%/*}"
  FILE_PATH="${AFTER_MODULES#*/}"
  TARGET_FILE="$TEST_PROJECT_PATH/packages/$MODULE_NAME/$FILE_PATH"
elif [[ "$TEMPLATE_FILE" == *"_modules-functional/"* ]]; then
  # Extract module name and path
  AFTER_MODULES="${TEMPLATE_FILE##*templates/_modules-functional/}"
  MODULE_NAME="${AFTER_MODULES%%/*}"
  FILE_PATH="${AFTER_MODULES#*/}"
  TARGET_FILE="$TEST_PROJECT_PATH/packages/$MODULE_NAME/$FILE_PATH"
else
  echo "Error: Template file must be in _project-monorepo-template/, _modules-core/, or _modules-functional/"
  exit 1
fi

echo "Target file: $TARGET_FILE"

# Create target directory if needed
TARGET_DIR=$(dirname "$TARGET_FILE")
mkdir -p "$TARGET_DIR"

# Copy file and replace placeholders
sed "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$TEMPLATE_FILE" > "$TARGET_FILE"

echo "✅ File synced with placeholders replaced"
echo "   {{PROJECT_NAME}} → $PROJECT_NAME"