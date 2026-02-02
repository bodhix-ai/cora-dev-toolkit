# Session Plan: Phase 12 - module-voice ADR-019c Implementation

**Status:** ✅ COMPLETE  
**Module:** module-voice (functional module)  
**Initial Errors:** 100 Layer 2 errors  
**Final Errors:** 0 Layer 2 errors  
**Estimated Time:** 8-10 hours  
**Actual Time:** ~4 hours  
**Created:** 2026-02-02  
**Updated:** 2026-02-02 16:41  
**Branch:** `auth-standardization-s3`

**Progress:**
- ✅ Part 1: Database Layer (schema + migration) - COMPLETE
- ✅ Part 2: Permission Layer (voice_common) - COMPLETE
- ✅ Part 3: Lambda Updates (4 Lambdas, 20 routes) - COMPLETE
- ✅ Part 4: Build & Deploy - COMPLETE
- ✅ Part 5: Validation - COMPLETE
- ✅ Part 6: Import Fix - COMPLETE

---

## Completion Summary

**Date Completed:** February 2, 2026  
**Time Spent:** ~4 hours  
**Result:** module-voice is now 100% ADR-019 compliant with zero import errors

**Final Validation Results:**
```
Auth Validation (ADR-019):
  Layer 1 (Admin Auth): 0 errors, 0 warnings ✅
  Layer 2 (Resource Permissions): 0 errors, 0 warnings ✅

Import Validation:
  ✅ All imports are valid!
```

**Critical Fix Applied:**
- **Issue:** voice_common/permissions.py used non-existent `common.execute_rpc()` function
- **Solution:** Changed to `from org_common.db import rpc` pattern (matching kb_common)
- **Result:** All 7 import errors resolved, full ADR-019 compliance achieved

---

## Objective

Implement ADR-019c two-step authorization pattern (org membership + resource permission) for all module-voice data routes to achieve 100% compliance with CORA authentication standards.

---

## Current State Analysis

### Lambda Functions Overview

| Lambda | Routes | Current Auth | Needs Layer 2 | Priority |
|--------|--------|--------------|---------------|----------|
| voice-sessions | 10 | Basic org_members | ✅ Yes | High |
| voice-configs | 10 (5 admin + 5 data) | Layer 1 on admin | ✅ Data only | High |
| voice-transcripts | 3 | Basic org_members | ✅ Yes | Medium |
| voice-analytics | 2 | Basic org_members | ✅ Yes | Low |
| voice-credentials | TBD | TBD | TBD | TBD |
| voice-websocket | Internal | Bot only | ❌ No | N/A |

### Existing Infrastructure

**✅ Available:**
- RPC functions: `is_voice_owner()`, `is_voice_assignee()` (but wrong naming pattern)
- Database schema files in place
- Build infrastructure working

**❌ Missing:**
- No `voice_common/permissions.py` layer
- No ADR-019c `can_*` permission RPCs
- No `common.can_access_org_resource()` calls in any Lambda
- No two-step authorization pattern

---

## Implementation Plan

### Part 1: Database Layer (1-2 hours)

#### Step 1.1: Add Permission RPCs to Schema

**File:** `templates/_modules-functional/module-voice/db/schema/006-voice-rpc-functions.sql`

Add the following ADR-019c compliant permission functions:

```sql
-- ========================================
-- ADR-019c Resource Permission Functions
-- Created: February 2, 2026
-- ========================================

-- Voice Session Permissions
CREATE OR REPLACE FUNCTION can_view_voice_session(
    p_user_id UUID,
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can view if:
    -- 1. They are a member of the session's org
    -- 2. They created the session OR are assigned to it
    RETURN EXISTS (
        SELECT 1 FROM public.voice_sessions vs
        INNER JOIN public.org_members om ON vs.org_id = om.org_id
        WHERE vs.id = p_session_id
        AND om.user_id = p_user_id
        AND (vs.created_by = p_user_id OR vs.assigned_to = p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_edit_voice_session(
    p_user_id UUID,
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can edit if they created the session
    RETURN EXISTS (
        SELECT 1 FROM public.voice_sessions
        WHERE id = p_session_id
        AND created_by = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_delete_voice_session(
    p_user_id UUID,
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can delete if they created the session
    RETURN EXISTS (
        SELECT 1 FROM public.voice_sessions
        WHERE id = p_session_id
        AND created_by = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Voice Config Permissions
CREATE OR REPLACE FUNCTION can_view_voice_config(
    p_user_id UUID,
    p_config_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can view if they are a member of the config's org
    RETURN EXISTS (
        SELECT 1 FROM public.voice_configs vc
        INNER JOIN public.org_members om ON vc.org_id = om.org_id
        WHERE vc.id = p_config_id
        AND om.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_edit_voice_config(
    p_user_id UUID,
    p_config_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can edit if they are org admin or created the config
    RETURN EXISTS (
        SELECT 1 FROM public.voice_configs vc
        INNER JOIN public.org_members om ON vc.org_id = om.org_id
        WHERE vc.id = p_config_id
        AND om.user_id = p_user_id
        AND (om.role IN ('admin', 'owner') OR vc.created_by = p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Voice Transcript Permissions
CREATE OR REPLACE FUNCTION can_view_voice_transcript(
    p_user_id UUID,
    p_transcript_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can view if they are a member of the transcript's org
    -- and have access to the associated session
    RETURN EXISTS (
        SELECT 1 FROM public.voice_transcripts vt
        INNER JOIN public.org_members om ON vt.org_id = om.org_id
        LEFT JOIN public.voice_sessions vs ON vt.session_id = vs.id
        WHERE vt.id = p_transcript_id
        AND om.user_id = p_user_id
        AND (vs.created_by = p_user_id OR vs.assigned_to = p_user_id OR vs.id IS NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Voice Analytics Permissions
CREATE OR REPLACE FUNCTION can_view_voice_analytics(
    p_user_id UUID,
    p_session_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- User can view analytics if they can view the session
    RETURN can_view_voice_session(p_user_id, p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION can_view_voice_session(UUID, UUID) IS 'ADR-019c: Check if user can view voice session';
COMMENT ON FUNCTION can_edit_voice_session(UUID, UUID) IS 'ADR-019c: Check if user can edit voice session';
COMMENT ON FUNCTION can_delete_voice_session(UUID, UUID) IS 'ADR-019c: Check if user can delete voice session';
COMMENT ON FUNCTION can_view_voice_config(UUID, UUID) IS 'ADR-019c: Check if user can view voice config';
COMMENT ON FUNCTION can_edit_voice_config(UUID, UUID) IS 'ADR-019c: Check if user can edit voice config';
COMMENT ON FUNCTION can_view_voice_transcript(UUID, UUID) IS 'ADR-019c: Check if user can view voice transcript';
COMMENT ON FUNCTION can_view_voice_analytics(UUID, UUID) IS 'ADR-019c: Check if user can view voice analytics';
```

#### Step 1.2: Create Migration File

**File:** `templates/_modules-functional/module-voice/db/migrations/20260202_adr019c_voice_permission_rpcs.sql`

```sql
-- Migration: Add ADR-019c Voice Permission RPCs
-- Created: 2026-02-02
-- Purpose: Add resource permission functions for voice module

-- Add permission functions (copy from schema file)
-- ... (same functions as above)
```

#### Step 1.3: Run Migration

Execute SQL against test database:
```bash
psql -h <host> -U <user> -d <database> -f templates/_modules-functional/module-voice/db/migrations/20260202_adr019c_voice_permission_rpcs.sql
```

---

### Part 2: Permission Layer (1 hour)

#### Step 2.1: Create Layer Directory Structure

Create:
```
templates/_modules-functional/module-voice/backend/layers/
└── voice_common/
    └── python/
        └── voice_common/
            ├── __init__.py
            └── permissions.py
```

#### Step 2.2: Create `__init__.py`

**File:** `backend/layers/voice_common/python/voice_common/__init__.py`

```python
"""
Voice Common Layer - Shared utilities for voice module

This layer provides permission checking functions that wrap
database RPC calls following ADR-019c standards.
"""

from .permissions import (
    can_view_voice_session,
    can_edit_voice_session,
    can_delete_voice_session,
    can_view_voice_config,
    can_edit_voice_config,
    can_view_voice_transcript,
    can_view_voice_analytics,
)

__all__ = [
    'can_view_voice_session',
    'can_edit_voice_session',
    'can_delete_voice_session',
    'can_view_voice_config',
    'can_edit_voice_config',
    'can_view_voice_transcript',
    'can_view_voice_analytics',
]
```

#### Step 2.3: Create Permission Helpers

**File:** `backend/layers/voice_common/python/voice_common/permissions.py`

```python
"""
Voice Permission Helpers (ADR-019c)

Module-specific permission functions for voice resources.
All functions wrap database RPC calls with Python-friendly interface.
"""

import org_common as common
from typing import Optional


def can_view_voice_session(user_id: str, session_id: str) -> bool:
    """
    Check if user can view voice session.
    
    Args:
        user_id: User's Supabase UUID
        session_id: Voice session UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        result = common.execute_rpc(
            'can_view_voice_session',
            {'p_user_id': user_id, 'p_session_id': session_id}
        )
        return bool(result)
    except Exception as e:
        print(f'Error checking can_view_voice_session: {e}')
        return False


def can_edit_voice_session(user_id: str, session_id: str) -> bool:
    """
    Check if user can edit voice session.
    
    Args:
        user_id: User's Supabase UUID
        session_id: Voice session UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        result = common.execute_rpc(
            'can_edit_voice_session',
            {'p_user_id': user_id, 'p_session_id': session_id}
        )
        return bool(result)
    except Exception as e:
        print(f'Error checking can_edit_voice_session: {e}')
        return False


def can_delete_voice_session(user_id: str, session_id: str) -> bool:
    """
    Check if user can delete voice session.
    
    Args:
        user_id: User's Supabase UUID
        session_id: Voice session UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        result = common.execute_rpc(
            'can_delete_voice_session',
            {'p_user_id': user_id, 'p_session_id': session_id}
        )
        return bool(result)
    except Exception as e:
        print(f'Error checking can_delete_voice_session: {e}')
        return False


def can_view_voice_config(user_id: str, config_id: str) -> bool:
    """
    Check if user can view voice config.
    
    Args:
        user_id: User's Supabase UUID
        config_id: Voice config UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        result = common.execute_rpc(
            'can_view_voice_config',
            {'p_user_id': user_id, 'p_config_id': config_id}
        )
        return bool(result)
    except Exception as e:
        print(f'Error checking can_view_voice_config: {e}')
        return False


def can_edit_voice_config(user_id: str, config_id: str) -> bool:
    """
    Check if user can edit voice config.
    
    Args:
        user_id: User's Supabase UUID
        config_id: Voice config UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        result = common.execute_rpc(
            'can_edit_voice_config',
            {'p_user_id': user_id, 'p_config_id': config_id}
        )
        return bool(result)
    except Exception as e:
        print(f'Error checking can_edit_voice_config: {e}')
        return False


def can_view_voice_transcript(user_id: str, transcript_id: str) -> bool:
    """
    Check if user can view voice transcript.
    
    Args:
        user_id: User's Supabase UUID
        transcript_id: Voice transcript UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        result = common.execute_rpc(
            'can_view_voice_transcript',
            {'p_user_id': user_id, 'p_transcript_id': transcript_id}
        )
        return bool(result)
    except Exception as e:
        print(f'Error checking can_view_voice_transcript: {e}')
        return False


def can_view_voice_analytics(user_id: str, session_id: str) -> bool:
    """
    Check if user can view voice analytics.
    
    Args:
        user_id: User's Supabase UUID
        session_id: Voice session UUID
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        result = common.execute_rpc(
            'can_view_voice_analytics',
            {'p_user_id': user_id, 'p_session_id': session_id}
        )
        return bool(result)
    except Exception as e:
        print(f'Error checking can_view_voice_analytics: {e}')
        return False
```

---

### Part 3: Lambda Updates (5-6 hours)

#### Step 3.1: voice-sessions Lambda (10 routes)

**File:** `backend/lambdas/voice-sessions/lambda_function.py`

**Routes to update:**
1. GET /voice/sessions - List sessions
2. GET /voice/sessions/{id} - Get session
3. POST /voice/sessions - Create session
4. PUT /voice/sessions/{id} - Update session
5. DELETE /voice/sessions/{id} - Delete session
6. POST /voice/sessions/{id}/start - Start session
7. GET /voice/sessions/{id}/kbs - List KBs
8. POST /voice/sessions/{id}/kbs - Add KB
9. PUT /voice/sessions/{id}/kbs/{kbId} - Toggle KB
10. DELETE /voice/sessions/{id}/kbs/{kbId} - Remove KB

**Pattern for each route:**
```python
import voice_common.permissions as voice_permissions

def handle_get_session(event, user_id, session_id):
    # Step 1: Fetch resource
    session = common.find_one('voice_sessions', {'id': session_id})
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_view_voice_session(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to view this session')
    
    # Continue with handler logic...
```

#### Step 3.2: voice-configs Lambda (5 data routes)

**File:** `backend/lambdas/voice-configs/lambda_function.py`

**Data API routes to update:**
1. GET /voice/configs - List configs
2. GET /voice/configs/{id} - Get config
3. POST /voice/configs - Create config
4. PUT /voice/configs/{id} - Update config
5. DELETE /voice/configs/{id} - Delete config

**Admin routes (`/admin/org/voice/configs/*`) remain Layer 1 only - DO NOT change these.**

**Pattern:**
```python
import voice_common.permissions as voice_permissions

def handle_get_config(event, user_id, config_id):
    # Step 1: Fetch resource
    config = common.find_one('voice_configs', {'id': config_id})
    if not config:
        raise common.NotFoundError('Config not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, config['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_view_voice_config(user_id, config_id):
        raise common.ForbiddenError('You do not have permission to view this config')
    
    # Continue with handler logic...
```

#### Step 3.3: voice-transcripts Lambda (3 routes)

**File:** `backend/lambdas/voice-transcripts/lambda_function.py`

**Routes to update:**
1. GET /voice/transcripts - List transcripts
2. GET /voice/transcripts/{id} - Get transcript
3. DELETE /voice/transcripts/{id} - Delete transcript

**Pattern:**
```python
import voice_common.permissions as voice_permissions

def handle_get_transcript(event, user_id, transcript_id):
    # Step 1: Fetch resource
    transcript = common.find_one('voice_transcripts', {'id': transcript_id})
    if not transcript:
        raise common.NotFoundError('Transcript not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, transcript['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission
    if not voice_permissions.can_view_voice_transcript(user_id, transcript_id):
        raise common.ForbiddenError('You do not have permission to view this transcript')
    
    # Continue with handler logic...
```

#### Step 3.4: voice-analytics Lambda (2 routes)

**File:** `backend/lambdas/voice-analytics/lambda_function.py`

**Routes to update:**
1. GET /voice/analytics - List analytics
2. GET /voice/analytics/{id} - Get analytics by session ID

**Pattern:**
```python
import voice_common.permissions as voice_permissions

def handle_get_analytics(event, user_id, session_id):
    # Step 1: Fetch session (analytics are tied to sessions)
    session = common.find_one('voice_sessions', {'id': session_id})
    if not session:
        raise common.NotFoundError('Session not found')
    
    # Step 2: Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        raise common.ForbiddenError('Not a member of this organization')
    
    # Step 3: Check resource permission (analytics permission = session permission)
    if not voice_permissions.can_view_voice_analytics(user_id, session_id):
        raise common.ForbiddenError('You do not have permission to view analytics for this session')
    
    # Continue with handler logic...
```

---

### Part 4: Build & Deploy (1 hour)

#### Step 4.1: Update build.sh

**File:** `backend/build.sh`

Add voice_common layer to build process:
```bash
# Build voice_common layer
echo "Building voice_common layer..."
mkdir -p "$BUILD_DIR/voice_common"
cd "$SCRIPT_DIR/layers/voice_common/python"
zip -r "$BUILD_DIR/voice_common/voice_common.zip" voice_common/ -x "*.pyc" -x "__pycache__/*"

# Build Lambdas with layer reference...
```

#### Step 4.2: Sync to Test Project

Use the fix-and-sync workflow for each file:
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit

# Sync Lambda files
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/perm/ai-mod-stack \
  "module-voice/backend/lambdas/voice-sessions/lambda_function.py"

# ... repeat for other Lambdas
```

#### Step 4.3: Build Module

```bash
cd ~/code/bodhix/testing/perm/ai-mod-stack/packages/module-voice/backend
bash build.sh
```

Expected output: All Lambdas + voice_common layer built successfully.

#### Step 4.4: Copy Zips to Infra Repo

```bash
cp ~/code/bodhix/testing/perm/ai-mod-stack/packages/module-voice/backend/.build/*.zip \
   ~/code/bodhix/testing/perm/ai-mod-infra/build/module-voice/
```

#### Step 4.5: Deploy via Terraform

```bash
cd ~/code/bodhix/testing/perm/ai-mod-infra
./scripts/deploy-terraform.sh dev
```

Terraform will detect changed Lambda zips and deploy them with zero-downtime blue-green deployment.

---

### Part 5: Validation (30 min)

#### Step 5.1: Run Validator

```bash
python3 validation/api-tracer/cli.py validate \
  --path ~/code/bodhix/testing/perm/ai-mod-stack \
  --module module-voice \
  --prefer-terraform
```

**Expected Result:**
- Layer 1 (Admin Auth): 0 errors, 0 warnings ✅
- Layer 2 (Resource Permissions): 0 errors, X warnings ✅ (warnings are acceptable)
- Code Quality: TBD errors (NOT auth-related)

#### Step 5.2: Test Module Functionality

Manual testing:
1. Create a voice session via UI
2. Verify you can view your session
3. Verify you CANNOT view another user's session (without permission)
4. Test config CRUD operations
5. Test transcript viewing

---

## Files to Create/Modify

### New Files (Templates)
1. `backend/layers/voice_common/python/voice_common/__init__.py`
2. `backend/layers/voice_common/python/voice_common/permissions.py`
3. `db/migrations/20260202_adr019c_voice_permission_rpcs.sql`

### Modified Files (Templates)
1. `db/schema/006-voice-rpc-functions.sql` - Add permission RPCs
2. `backend/build.sh` - Add voice_common layer build
3. `backend/lambdas/voice-sessions/lambda_function.py` - 10 handlers
4. `backend/lambdas/voice-configs/lambda_function.py` - 5 data handlers
5. `backend/lambdas/voice-transcripts/lambda_function.py` - 3 handlers
6. `backend/lambdas/voice-analytics/lambda_function.py` - 2 handlers

---

## Success Criteria

- [x] Database permission RPCs created and migrated
- [x] voice_common permission layer created with 7 functions
- [x] voice-sessions Lambda updated with two-step pattern (10 handlers)
- [x] voice-configs Lambda updated with two-step pattern (5 data handlers)
- [x] voice-transcripts Lambda updated with two-step pattern (3 handlers)
- [x] voice-analytics Lambda updated with two-step pattern (2 handlers)
- [x] Module built successfully with voice_common layer
- [x] All Lambdas deployed via Terraform
- [x] Validator shows 0 Layer 2 errors
- [x] Import validation shows all imports valid
- [x] All changes synced to test project
- [x] Zero-downtime deployment completed

---

## Rollback Plan

If something goes wrong:
1. Revert Lambda changes: `git checkout HEAD~1 templates/_modules-functional/module-voice/backend/lambdas/`
2. Rebuild and redeploy with previous version
3. Or use Terraform to point to previous Lambda versions

---

## Related Documents

- [ADR-019c: Resource Permission Authorization](../../arch%20decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md)
- [Sprint S3 Plan](../plan_s3-auth-standardization.md)
- [Context: Auth Standardization](../../../memory-bank/context-auth-standardization.md)
- [fix-and-sync.md Workflow](../../../.cline/workflows/fix-and-sync.md)
- [deploy-lambda.md Workflow](../../../.cline/workflows/deploy-lambda.md)

---

**Document Status:** ✅ COMPLETE  
**Created:** 2026-02-02  
**Completed:** 2026-02-02 16:41
