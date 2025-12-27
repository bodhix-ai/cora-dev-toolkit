#!/bin/bash
# Script to copy updated templates to test9 project

TEMPLATE_ROOT="templates"
TEST9_ROOT=~/code/sts/test9/ai-sec-stack

echo "Copying files from templates to test9..."

# Helper function
copy_file() {
    src=$1
    dest=$2
    if [ -f "$src" ]; then
        mkdir -p $(dirname "$dest")
        cp "$src" "$dest"
        echo "✅ Copied $src to $dest"
    else
        echo "❌ Source file not found: $src"
    fi
}

# Module Access
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-access/frontend/components/AuthProvider.tsx" "$TEST9_ROOT/packages/module-access/frontend/components/AuthProvider.tsx"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-access/frontend/components/admin/OrgsTab.tsx" "$TEST9_ROOT/packages/module-access/frontend/components/admin/OrgsTab.tsx"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-access/frontend/hooks/useOrgMembers.ts" "$TEST9_ROOT/packages/module-access/frontend/hooks/useOrgMembers.ts"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-access/frontend/lib/api.ts" "$TEST9_ROOT/packages/module-access/frontend/lib/api.ts"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-access/frontend/components/admin/OrgMgmt.tsx" "$TEST9_ROOT/packages/module-access/frontend/components/admin/OrgMgmt.tsx"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-access/frontend/components/admin/IdpConfigCard.tsx" "$TEST9_ROOT/packages/module-access/frontend/components/admin/IdpConfigCard.tsx"

# Module AI
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-ai/frontend/hooks/useAIConfig.ts" "$TEST9_ROOT/packages/module-ai/frontend/hooks/useAIConfig.ts"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-ai/frontend/components/models/ViewModelsModal.tsx" "$TEST9_ROOT/packages/module-ai/frontend/components/models/ViewModelsModal.tsx"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-ai/frontend/types/index.ts" "$TEST9_ROOT/packages/module-ai/frontend/types/index.ts"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-ai/frontend/lib/api.ts" "$TEST9_ROOT/packages/module-ai/frontend/lib/api.ts"

# Module Mgmt
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-mgmt/frontend/types/index.ts" "$TEST9_ROOT/packages/module-mgmt/frontend/types/index.ts"
copy_file "$TEMPLATE_ROOT/_cora-core-modules/module-mgmt/frontend/lib/api.ts" "$TEST9_ROOT/packages/module-mgmt/frontend/lib/api.ts"

# Apps/Web
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/lib/api-client.ts" "$TEST9_ROOT/apps/web/lib/api-client.ts"
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/lib/api-cache.ts" "$TEST9_ROOT/apps/web/lib/api-cache.ts"
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/hooks/useDashboardData.ts" "$TEST9_ROOT/apps/web/hooks/useDashboardData.ts"
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/lib/api.ts" "$TEST9_ROOT/apps/web/lib/api.ts"
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/app/page.tsx" "$TEST9_ROOT/apps/web/app/page.tsx"
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/hooks/useChatProjectAssociation.ts" "$TEST9_ROOT/apps/web/hooks/useChatProjectAssociation.ts"
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/hooks/useChatFavorites.ts" "$TEST9_ROOT/apps/web/hooks/useChatFavorites.ts"
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/lib/kb-api.ts" "$TEST9_ROOT/apps/web/lib/kb-api.ts"
copy_file "$TEMPLATE_ROOT/_project-stack-template/apps/web/lib/rag-providers-api.ts" "$TEST9_ROOT/apps/web/lib/rag-providers-api.ts"

echo "Copy complete."
