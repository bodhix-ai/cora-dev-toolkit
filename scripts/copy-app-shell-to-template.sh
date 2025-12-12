#!/bin/bash
# Copy apps/web from pm-app-stack to template with parameterization

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLKIT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_WEB="${TOOLKIT_ROOT}/../pm-app-stack/apps/web"
TARGET_DIR="${TOOLKIT_ROOT}/templates/_project-stack-template/apps/web"

echo "Copying app shell from pm-app-stack to template..."

# Create target directory
mkdir -p "$TARGET_DIR"

# Essential files to copy
ESSENTIAL_FILES=(
  "middleware.ts"
  "next.config.mjs"
  "tsconfig.json"
  "package.json"
  ".eslintrc.json"
  ".env.example"
)

# Essential directories
ESSENTIAL_DIRS=(
  "app/(dashboard)"
  "app/sign-in"
  "app/sign-up"
  "app/api/auth"
)

# Copy essential files
for file in "${ESSENTIAL_FILES[@]}"; do
  if [[ -f "$SOURCE_WEB/$file" ]]; then
    cp "$SOURCE_WEB/$file" "$TARGET_DIR/"
    echo "  Copied: $file"
  fi
done

# Copy layout.tsx and page.tsx
cp "$SOURCE_WEB/app/layout.tsx" "$TARGET_DIR/app/" 2>/dev/null || mkdir -p "$TARGET_DIR/app" && cp "$SOURCE_WEB/app/layout.tsx" "$TARGET_DIR/app/"
cp "$SOURCE_WEB/app/page.tsx" "$TARGET_DIR/app/"
echo "  Copied: app/layout.tsx, app/page.tsx"

# Copy lib directory (auth utilities)
cp -r "$SOURCE_WEB/lib" "$TARGET_DIR/"
echo "  Copied: lib/"

# Copy hooks directory
cp -r "$SOURCE_WEB/hooks" "$TARGET_DIR/"
echo "  Copied: hooks/"

# Copy store directory
cp -r "$SOURCE_WEB/store" "$TARGET_DIR/"
echo "  Copied: store/"

# Copy types directory
cp -r "$SOURCE_WEB/types" "$TARGET_DIR/"
echo "  Copied: types/"

# Parameterize - replace pm-app specific values
find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" \) | while read -r file; do
  sed -i '' "s/pm-app/\${project}/g" "$file" 2>/dev/null || sed -i "s/pm-app/\${project}/g" "$file"
  sed -i '' "s/PolicyMind/\${project_display_name}/g" "$file" 2>/dev/null || sed -i "s/PolicyMind/\${project_display_name}/g" "$file"
done

echo ""
echo "App shell template created at: $TARGET_DIR"
echo "Note: You may need to review and customize for specific project needs."
