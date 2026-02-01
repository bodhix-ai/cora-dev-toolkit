# Creating CORA Modules

This comprehensive guide walks you through creating a complete CORA module from scratch, covering database schema, backend Lambda functions, frontend components, infrastructure, and integration.

## Overview

A **CORA module** is a self-contained package that provides:

- **Database schema** with Row-Level Security (RLS)
- **Backend Lambda functions** with API endpoints
- **Frontend React components**, hooks, and contexts
- **Terraform infrastructure** configuration
- **Integration points** for main infrastructure

This guide uses a **staffing-module** as a practical example for managing candidates and job positions.

## Prerequisites

Before creating a module, ensure you have:

- ✅ **Org-module deployed** (foundation for all modules)
- ✅ **Development environment** set up (Supabase, AWS credentials, Terraform)
- ✅ **Project cloned** (`sts-career-stack` repository)
- ✅ **Understanding of CORA principles** (read [CORA Principles](../architecture/cora-principles.md))

## Module Planning

### Step 1: Define Module Scope

Before writing code, clearly define:

1. **Purpose**: What business problem does this solve?
2. **Entities**: What data will be stored?
3. **API Endpoints**: What operations are needed?
4. **UI Components**: What user interfaces are needed?
5. **Dependencies**: What other modules does this depend on?

**Example: Staffing-Module**

- **Purpose**: Manage candidates and job positions for staffing operations
- **Entities**: Candidates, Positions, Applications
- **API Endpoints**: CRUD for candidates, positions, applications
- **UI Components**: CandidateList, PositionList, ApplicationForm
- **Dependencies**: org-module (authentication, multi-tenancy)

### Step 2: Design Data Model

Design your database schema with multi-tenancy in mind.

**Example ERD:**

```
org (from org-module)
  ↓
  ├── staffing_candidates
  │   ├── id (UUID, PK)
  │   ├── org_id (UUID, FK → org.id)
  │   ├── first_name
  │   ├── last_name
  │   ├── email
  │   ├── phone
  │   ├── resume_url
  │   ├── status (active/inactive/hired)
  │   └── audit fields
  │
  ├── staffing_positions
  │   ├── id (UUID, PK)
  │   ├── org_id (UUID, FK → org.id)
  │   ├── title
  │   ├── description
  │   ├── location
  │   ├── status (open/closed)
  │   └── audit fields
  │
  └── staffing_applications
      ├── id (UUID, PK)
      ├── org_id (UUID, FK → org.id)
      ├── candidate_id (UUID, FK → candidates.id)
      ├── position_id (UUID, FK → positions.id)
      ├── status (applied/interviewed/offered/accepted/rejected)
      └── audit fields
```

### Step 3: Plan API Endpoints

Map out your REST API endpoints.

**Example:**

| Method | Path                        | Purpose            |
| ------ | --------------------------- | ------------------ |
| GET    | `/staffing/candidates`      | List candidates    |
| POST   | `/staffing/candidates`      | Create candidate   |
| GET    | `/staffing/candidates/{id}` | Get candidate      |
| PUT    | `/staffing/candidates/{id}` | Update candidate   |
| DELETE | `/staffing/candidates/{id}` | Delete candidate   |
| GET    | `/staffing/positions`       | List positions     |
| POST   | `/staffing/positions`       | Create position    |
| GET    | `/staffing/applications`    | List applications  |
| POST   | `/staffing/applications`    | Submit application |

## Phase 1: Create Module Structure

### Step 1: Copy Module Template

```bash
cd sts-career-stack/packages/
cp -r _module-template/ staffing-module/
cd staffing-module/
```

### Step 2: Update module.json

```json
{
  "name": "staffing-module",
  "version": "1.0.0",
  "description": "Candidate and position management for staffing operations",
  "author": "Your Team",
  "dependencies": {
    "org-module": "^1.0.0"
  },
  "provides": {
    "database": [
      "staffing_candidates",
      "staffing_positions",
      "staffing_applications"
    ],
    "lambdas": ["candidates", "positions", "applications"],
    "components": ["CandidateList", "PositionList", "ApplicationForm"]
  }
}
```

### Step 3: Create Directory Structure

```bash
# Database
mkdir -p db/schema db/migrations db/seed-data

# Backend
mkdir -p backend/layers/staffing-common/python/staffing_common
mkdir -p backend/lambdas/candidates
mkdir -p backend/lambdas/positions
mkdir -p backend/lambdas/applications

# Frontend
mkdir -p frontend/components frontend/hooks frontend/contexts frontend/lib frontend/types frontend/__tests__

# Infrastructure
mkdir -p infrastructure

# Create placeholder files
touch backend/build.sh
touch frontend/index.ts
chmod +x backend/build.sh
```

## Phase 2: Database Schema

### Step 1: Create Schema Files

**db/schema/001-candidates.sql:**

```sql
-- staffing_candidates table
CREATE TABLE staffing_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,

    -- Candidate information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT,
    linkedin_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'hired')),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_staffing_candidates_org_id ON staffing_candidates(org_id);
CREATE INDEX idx_staffing_candidates_email ON staffing_candidates(org_id, email);
CREATE INDEX idx_staffing_candidates_status ON staffing_candidates(org_id, status);
CREATE INDEX idx_staffing_candidates_created_at ON staffing_candidates(org_id, created_at DESC);

-- Unique constraint: email per org
CREATE UNIQUE INDEX idx_staffing_candidates_org_email ON staffing_candidates(org_id, LOWER(email));

-- Comments
COMMENT ON TABLE staffing_candidates IS 'Candidates for staffing positions';
COMMENT ON COLUMN staffing_candidates.org_id IS 'Organization owning this candidate';
COMMENT ON COLUMN staffing_candidates.status IS 'Status: active, inactive, hired';
```

**db/schema/002-positions.sql:**

```sql
-- staffing_positions table
CREATE TABLE staffing_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,

    -- Position information
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'temporary')),
    salary_min INTEGER,
    salary_max INTEGER,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'on-hold')),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_staffing_positions_org_id ON staffing_positions(org_id);
CREATE INDEX idx_staffing_positions_status ON staffing_positions(org_id, status);
CREATE INDEX idx_staffing_positions_created_at ON staffing_positions(org_id, created_at DESC);

-- Comments
COMMENT ON TABLE staffing_positions IS 'Job positions for staffing';
COMMENT ON COLUMN staffing_positions.org_id IS 'Organization owning this position';
```

**db/schema/003-applications.sql:**

```sql
-- staffing_applications table
CREATE TABLE staffing_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES staffing_candidates(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES staffing_positions(id) ON DELETE CASCADE,

    -- Application information
    status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'interviewed', 'offered', 'accepted', 'rejected')),
    notes TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- Unique constraint: candidate can only apply once per position
    UNIQUE(candidate_id, position_id)
);

-- Indexes
CREATE INDEX idx_staffing_applications_org_id ON staffing_applications(org_id);
CREATE INDEX idx_staffing_applications_candidate ON staffing_applications(candidate_id);
CREATE INDEX idx_staffing_applications_position ON staffing_applications(position_id);
CREATE INDEX idx_staffing_applications_status ON staffing_applications(org_id, status);
CREATE INDEX idx_staffing_applications_created_at ON staffing_applications(org_id, created_at DESC);

-- Comments
COMMENT ON TABLE staffing_applications IS 'Applications linking candidates to positions';
```

### Step 2: Create RLS Policies

**db/schema/004-rls-policies.sql:**

```sql
-- Enable RLS on all tables
ALTER TABLE staffing_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_applications ENABLE ROW LEVEL SECURITY;

-- Candidates RLS Policies
CREATE POLICY "candidates_select_policy"
  ON staffing_candidates
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

CREATE POLICY "candidates_insert_policy"
  ON staffing_candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "candidates_update_policy"
  ON staffing_candidates
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id))
  WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "candidates_delete_policy"
  ON staffing_candidates
  FOR DELETE
  TO authenticated
  USING (can_modify_org_data(org_id));

-- Positions RLS Policies
CREATE POLICY "positions_select_policy"
  ON staffing_positions
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

CREATE POLICY "positions_insert_policy"
  ON staffing_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "positions_update_policy"
  ON staffing_positions
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id))
  WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "positions_delete_policy"
  ON staffing_positions
  FOR DELETE
  TO authenticated
  USING (can_modify_org_data(org_id));

-- Applications RLS Policies
CREATE POLICY "applications_select_policy"
  ON staffing_applications
  FOR SELECT
  TO authenticated
  USING (can_access_org_data(org_id));

CREATE POLICY "applications_insert_policy"
  ON staffing_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "applications_update_policy"
  ON staffing_applications
  FOR UPDATE
  TO authenticated
  USING (can_modify_org_data(org_id))
  WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "applications_delete_policy"
  ON staffing_applications
  FOR DELETE
  TO authenticated
  USING (can_modify_org_data(org_id));
```

### Step 3: Apply Audit Triggers

**db/schema/005-audit-triggers.sql:**

```sql
-- Apply audit triggers to all tables
SELECT apply_audit_trigger('staffing_candidates');
SELECT apply_audit_trigger('staffing_positions');
SELECT apply_audit_trigger('staffing_applications');
```

### Step 4: Apply Schema

```bash
# Apply schema files in order
psql $DATABASE_URL -f db/schema/001-candidates.sql
psql $DATABASE_URL -f db/schema/002-positions.sql
psql $DATABASE_URL -f db/schema/003-applications.sql
psql $DATABASE_URL -f db/schema/004-rls-policies.sql
psql $DATABASE_URL -f db/schema/005-audit-triggers.sql
```

## Phase 3: Backend Lambda Layer

Create shared utilities for all Lambda functions in this module.

### Step 1: Create Layer Files

**backend/layers/staffing-common/python/staffing_common/**init**.py:**

```python
"""Staffing module common utilities"""

from .db import get_supabase_client
from .validators import validate_uuid, validate_required, validate_email
from .responses import success_response, error_response
from .auth import extract_user, is_admin

__all__ = [
    'get_supabase_client',
    'validate_uuid',
    'validate_required',
    'validate_email',
    'success_response',
    'error_response',
    'extract_user',
    'is_admin',
]
```

**backend/layers/staffing-common/python/staffing_common/db.py:**

```python
"""Database utilities"""

from supabase import create_client
import os

def get_supabase_client():
    """Initialize Supabase client with credentials from environment"""
    supabase_url = os.environ['SUPABASE_URL']
    supabase_key = os.environ['SUPABASE_ANON_KEY']
    return create_client(supabase_url, supabase_key)
```

**backend/layers/staffing-common/python/staffing_common/validators.py:**

```python
"""Input validation utilities"""

import re

def validate_uuid(value):
    """Validate UUID format"""
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(uuid_pattern, str(value).lower()))

def validate_required(data, fields):
    """Validate required fields are present"""
    missing = [f for f in fields if f not in data or data[f] is None or data[f] == '']
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
    return True

def validate_email(email):
    """Validate email format"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise ValueError('Invalid email format')
    return True
```

**backend/layers/staffing-common/python/staffing_common/responses.py:**

```python
"""Standard API response utilities"""

import json

def success_response(data, status_code=200):
    """Return success response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        'body': json.dumps({'success': True, 'data': data})
    }

def error_response(status_code, message):
    """Return error response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': False, 'error': message})
    }
```

**backend/layers/staffing-common/python/staffing_common/auth.py:**

```python
"""Authentication utilities"""

def extract_user(event):
    """Extract user info from JWT claims (set by authorizer)"""
    authorizer = event.get('requestContext', {}).get('authorizer', {})
    return {
        'user_id': authorizer.get('sub'),
        'email': authorizer.get('email'),
        'groups': authorizer.get('groups', [])
    }

def is_admin(user):
    """Check if user has admin group"""
    return 'admin' in user.get('groups', [])
```

### Step 2: Create requirements.txt

**backend/layers/staffing-common/requirements.txt:**

```
supabase==2.0.3
```

## Phase 4: Backend Lambda Functions

Create Lambda functions for each entity.

### Example: Candidates Lambda

**backend/lambdas/candidates/lambda_function.py:**

```python
"""Candidates Lambda - Handle candidate CRUD operations"""

import json
from staffing_common.db import get_supabase_client
from staffing_common.validators import validate_required, validate_email
from staffing_common.responses import success_response, error_response
from staffing_common.auth import extract_user

def lambda_handler(event, context):
    """Handle candidate API requests"""
    print(json.dumps(event, default=str))

    try:
        # Extract user info
        user = extract_user(event)
        user_id = user['user_id']

        # Initialize Supabase
        supabase = get_supabase_client()

        # Set session user_id for RLS
        supabase.rpc('set_session_user_id', {'user_id': user_id}).execute()

        # Route by method
        http_method = event['httpMethod']
        path_params = event.get('pathParameters', {})

        if http_method == 'GET' and not path_params:
            return handle_list_candidates(supabase, event)
        elif http_method == 'GET' and path_params:
            return handle_get_candidate(supabase, path_params['id'])
        elif http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_create_candidate(supabase, user_id, body)
        elif http_method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return handle_update_candidate(supabase, user_id, path_params['id'], body)
        elif http_method == 'DELETE':
            return handle_delete_candidate(supabase, path_params['id'])
        else:
            return error_response(405, 'Method not allowed')

    except ValueError as e:
        print(f'Validation error: {str(e)}')
        return error_response(400, str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        return error_response(500, 'Internal server error')

def handle_list_candidates(supabase, event):
    """List candidates with pagination and filtering"""
    query_params = event.get('queryStringParameters', {}) or {}

    # Build query
    query = supabase.table('staffing_candidates').select('*')

    # Filter by status if provided
    if 'status' in query_params:
        query = query.eq('status', query_params['status'])

    # Order by created_at descending
    query = query.order('created_at', desc=True)

    # Pagination (default: 50 items)
    limit = int(query_params.get('limit', 50))
    offset = int(query_params.get('offset', 0))
    query = query.limit(limit).offset(offset)

    # Execute query
    result = query.execute()

    return success_response({
        'candidates': result.data,
        'count': len(result.data),
        'limit': limit,
        'offset': offset
    })

def handle_get_candidate(supabase, candidate_id):
    """Get single candidate by ID"""
    result = supabase.table('staffing_candidates').select('*').eq('id', candidate_id).execute()

    if not result.data:
        return error_response(404, 'Candidate not found')

    return success_response(result.data[0])

def handle_create_candidate(supabase, user_id, data):
    """Create new candidate"""
    # Validate required fields
    validate_required(data, ['first_name', 'last_name', 'email', 'org_id'])
    validate_email(data['email'])

    # Insert candidate
    result = supabase.table('staffing_candidates').insert({
        'org_id': data['org_id'],
        'first_name': data['first_name'],
        'last_name': data['last_name'],
        'email': data['email'],
        'phone': data.get('phone'),
        'resume_url': data.get('resume_url'),
        'linkedin_url': data.get('linkedin_url'),
        'status': data.get('status', 'active'),
        'created_by': user_id,
        'updated_by': user_id
    }).execute()

    return success_response(result.data[0], status_code=201)

def handle_update_candidate(supabase, user_id, candidate_id, data):
    """Update existing candidate"""
    # Validate email if provided
    if 'email' in data:
        validate_email(data['email'])

    # Build update dict (only include provided fields)
    update_data = {
        'updated_by': user_id
    }

    allowed_fields = ['first_name', 'last_name', 'email', 'phone', 'resume_url', 'linkedin_url', 'status']
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]

    # Update candidate
    result = supabase.table('staffing_candidates').update(update_data).eq('id', candidate_id).execute()

    if not result.data:
        return error_response(404, 'Candidate not found')

    return success_response(result.data[0])

def handle_delete_candidate(supabase, candidate_id):
    """Delete candidate (hard delete)"""
    result = supabase.table('staffing_candidates').delete().eq('id', candidate_id).execute()

    return success_response({'message': 'Candidate deleted'})
```

**backend/lambdas/candidates/requirements.txt:**

```
# Layer provides: supabase, staffing_common
# No additional dependencies needed
```

### Build Script

The backend build process is standardized across all CORA modules to ensure consistency and reliability. Each module's `backend` directory must contain a `build.sh` script that automates the packaging of all Lambda functions.

**`backend/build.sh`:**

```bash
#!/usr/bin/env bash
# Build script for [your-module-name] Lambda functions
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building [your-module-name] backend...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDAS_DIR="${SCRIPT_DIR}/lambdas"
BUILD_DIR="${SCRIPT_DIR}/.build"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# ========================================
# Build Lambda Functions
# ========================================
for lambda_dir in "${LAMBDAS_DIR}"/*/; do
  lambda_name=$(basename "${lambda_dir}")
  echo -e "${GREEN}--- Building ${lambda_name} Lambda ---${NC}"

  LAMBDA_BUILD_DIR="${BUILD_DIR}/${lambda_name}"
  mkdir -p "${LAMBDA_BUILD_DIR}"

  # Copy source code
  cp "${lambda_dir}lambda_function.py" "${LAMBDA_BUILD_DIR}/"

  # Install dependencies if requirements.txt exists and is not empty
  if [ -f "${lambda_dir}requirements.txt" ] && grep -q -v '^#' "${lambda_dir}requirements.txt" | grep -q '[a-zA-Z]'; then
    echo "Installing dependencies..."
    pip install -r "${lambda_dir}requirements.txt" -t "${LAMBDA_BUILD_DIR}" --upgrade --quiet
  fi

  # Create Lambda ZIP
  (
    cd "${LAMBDA_BUILD_DIR}"
    zip -r "${BUILD_DIR}/${lambda_name}.zip" . -q
  )

  echo -e "${GREEN}✓ Lambda built: ${BUILD_DIR}/${lambda_name}.zip${NC}"
done

# ========================================
# Summary
# ========================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Build artifacts created in: ${BUILD_DIR}"
du -h "${BUILD_DIR}"/*.zip
echo ""
echo -e "${YELLOW}Next step:${NC} Deploy using the Terraform script in the sts-career-infra repository."
echo ""
echo -e "${GREEN}Build completed successfully!${NC}"
```

**How the Script Works:**

1.  **Initialization**: Sets up variables for directories and colored output.
2.  **Clean Build**: Deletes the `.build` directory to ensure a fresh build.
3.  **Lambda Iteration**: Iterates through each subdirectory in the `lambdas` directory. This means you no longer need to hardcode the names of your functions.
4.  **Dependency Installation**: If a `requirements.txt` file exists and contains dependencies, `pip` is used to install them into the build directory.
5.  **Packaging**: Creates a `.zip` archive for each Lambda function, containing the source code and its dependencies.
6.  **Summary**: Displays a summary of the created build artifacts and their sizes.

To use this script, simply copy it into your module's `backend` directory and make it executable:

```bash
chmod +x backend/build.sh
```

## Phase 4b: Authorization Implementation

**See:** [ADR-019: CORA Authorization Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md)

CORA modules must implement authorization following the 2-layer architecture.

### Layer 1: Admin Authorization (If Module Has Admin Routes)

If your module has admin configuration pages (e.g., `/admin/sys/{module}`, `/admin/org/{module}`), implement centralized router-level authorization.

**Update Lambda handler to add centralized auth:**

```python
from org_common.auth_helpers import check_sys_admin, check_org_admin, get_org_context_from_event

def lambda_handler(event, context):
    """Handle staffing admin API requests"""
    try:
        user_info = extract_user(event)
        user_id = user_info['user_id']
        
        supabase = get_supabase_client()
        supabase.rpc('set_session_user_id', {'user_id': user_id}).execute()
        
        path = event.get('rawPath', '')
        
        # Centralized admin authorization
        if path.startswith('/admin/sys/staffing/'):
            if not check_sys_admin(user_id):
                return error_response(403, 'System admin role required')
        
        elif path.startswith('/admin/org/staffing/'):
            org_id = get_org_context_from_event(event)
            if not check_org_admin(org_id, user_id):
                return error_response(403, 'Organization admin role required')
        
        # Route to handlers (auth already verified)
        return route_by_method(event)
    
    except Exception as e:
        print(f'Error: {str(e)}')
        return error_response(500, 'Internal server error')
```

**Key Points:**
- Auth check happens ONCE at router level
- Use standard helpers from org_common (no inline role checks)
- Handlers don't need auth checks (already verified)

### Layer 2: Resource Permissions (For User Data Routes)

If your module has user data routes (e.g., `/staffing/candidates`), implement 3-step permission checks.

**Step 1: Create Database RPC Functions**

**db/schema/006-permissions.sql:**

```sql
-- Ownership check for candidates
CREATE OR REPLACE FUNCTION is_candidate_owner(p_user_id UUID, p_candidate_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staffing_candidates
    WHERE id = p_candidate_id AND created_by = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Membership check (already exists in org-common)
-- is_org_member(p_org_id UUID, p_user_id UUID)
```

**Step 2: Create Module Permission Layer**

**backend/layers/staffing-common/python/staffing_common/permissions.py:**

```python
"""
Module-specific resource permissions.

CRITICAL: These functions live in the MODULE's layer,
NOT in org-common (avoids dependencies on optional modules).
"""

from org_common.db import call_rpc

def can_access_candidate(user_id: str, candidate_id: str) -> bool:
    """
    Check if user can access candidate.
    
    Access granted if:
    - User owns the candidate
    - Candidate is shared with user (future)
    
    NOTE: Admin roles do NOT grant automatic access.
    """
    # Check ownership
    if call_rpc('is_candidate_owner', {
        'p_user_id': user_id,
        'p_candidate_id': candidate_id
    }):
        return True
    
    # TODO: Check sharing when implemented
    return False

def can_edit_candidate(user_id: str, candidate_id: str) -> bool:
    """Check if user can edit candidate (requires ownership)"""
    return call_rpc('is_candidate_owner', {
        'p_user_id': user_id,
        'p_candidate_id': candidate_id
    })
```

**Step 3: Update Lambda Handlers with 3-Step Permission Check**

```python
from org_common.resource_permissions import can_access_org_resource
from staffing_common.permissions import can_access_candidate, can_edit_candidate

def handle_get_candidate(supabase, user_id, candidate_id):
    """Get single candidate with permission check"""
    
    # Step 1: Fetch resource
    result = supabase.table('staffing_candidates').select('*').eq('id', candidate_id).execute()
    if not result.data:
        return error_response(404, 'Candidate not found')
    
    candidate = result.data[0]
    
    # Step 2: Verify org membership (prevent cross-org access)
    if not can_access_org_resource(user_id, candidate['org_id']):
        return error_response(403, 'Not a member of this organization')
    
    # Step 3: Check resource permission (ownership/sharing)
    if not can_access_candidate(user_id, candidate_id):
        return error_response(403, 'Access denied')
    
    return success_response(candidate)


def handle_update_candidate(supabase, user_id, candidate_id, data):
    """Update candidate (requires edit permission)"""
    
    # Fetch and verify
    result = supabase.table('staffing_candidates').select('org_id').eq('id', candidate_id).execute()
    if not result.data:
        return error_response(404, 'Candidate not found')
    
    candidate = result.data[0]
    
    # Verify org membership
    if not can_access_org_resource(user_id, candidate['org_id']):
        return error_response(403, 'Not a member of this organization')
    
    # Check edit permission (may be stricter than view)
    if not can_edit_candidate(user_id, candidate_id):
        return error_response(403, 'Edit permission required')
    
    # Update
    update_result = supabase.table('staffing_candidates').update(data).eq('id', candidate_id).execute()
    return success_response(update_result.data[0])
```

**CRITICAL:** Admin roles do NOT automatically grant access to user resources (least privilege principle).

### Authorization Checklist

**For Admin Routes:**
- [ ] Lambda uses centralized router-level auth
- [ ] Uses `check_sys_admin()`, `check_org_admin()`, or `check_ws_admin()`
- [ ] Uses `get_org_context_from_event()` for org admin routes
- [ ] NO inline role checks (no `['sys_owner', 'sys_admin']`)
- [ ] Handlers assume auth already verified

**For Data Routes:**
- [ ] Database RPC functions created (`is_*_owner`)
- [ ] Module-specific permissions in module's own layer (not org-common)
- [ ] Lambda implements 3-step permission check:
  - [ ] Step 1: Fetch resource
  - [ ] Step 2: Verify org membership with `can_access_org_resource()`
  - [ ] Step 3: Check resource permission with module-specific `can_access_*()`
- [ ] NO admin role override in resource permissions

---

## Phase 5: Frontend TypeScript Types

**frontend/types/index.ts:**

```typescript
export interface Candidate {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  linkedin_url?: string;
  status: "active" | "inactive" | "hired";
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Position {
  id: string;
  org_id: string;
  title: string;
  description?: string;
  location?: string;
  employment_type?: "full-time" | "part-time" | "contract" | "temporary";
  salary_min?: number;
  salary_max?: number;
  status: "open" | "closed" | "on-hold";
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Application {
  id: string;
  org_id: string;
  candidate_id: string;
  position_id: string;
  status:
    | "applied"
    | "screening"
    | "interviewed"
    | "offered"
    | "accepted"
    | "rejected";
  notes?: string;
  applied_at: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Populated fields
  candidate?: Candidate;
  position?: Position;
}
```

## Phase 6: Frontend API Client

**frontend/lib/api.ts:**

```typescript
import { Candidate, Position, Application } from "../types";

export interface StaffingModuleApiClient {
  // Candidates
  listCandidates: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => Promise<{ candidates: Candidate[]; count: number }>;
  getCandidate: (id: string) => Promise<Candidate>;
  createCandidate: (
    data: Omit<Candidate, "id" | "created_at" | "updated_at">
  ) => Promise<Candidate>;
  updateCandidate: (id: string, data: Partial<Candidate>) => Promise<Candidate>;
  deleteCandidate: (id: string) => Promise<void>;

  // Positions
  listPositions: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => Promise<{ positions: Position[]; count: number }>;
  getPosition: (id: string) => Promise<Position>;
  createPosition: (
    data: Omit<Position, "id" | "created_at" | "updated_at">
  ) => Promise<Position>;
  updatePosition: (id: string, data: Partial<Position>) => Promise<Position>;
  deletePosition: (id: string) => Promise<void>;

  // Applications
  listApplications: (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => Promise<{ applications: Application[]; count: number }>;
  submitApplication: (data: {
    candidate_id: string;
    position_id: string;
    notes?: string;
  }) => Promise<Application>;
}

export function createStaffingModuleClient(
  authenticatedClient: any
): StaffingModuleApiClient {
  return {
    // Candidates
    listCandidates: async (params = {}) => {
      const queryString = new URLSearchParams(params as any).toString();
      const response = await authenticatedClient.get(
        `/staffing/candidates${queryString ? `?${queryString}` : ""}`
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    getCandidate: async (id) => {
      const response = await authenticatedClient.get(
        `/staffing/candidates/${id}`
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    createCandidate: async (data) => {
      const response = await authenticatedClient.post(
        "/staffing/candidates",
        data
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    updateCandidate: async (id, data) => {
      const response = await authenticatedClient.put(
        `/staffing/candidates/${id}`,
        data
      );
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    deleteCandidate: async (id) => {
      const response = await authenticatedClient.delete(
        `/staffing/candidates/${id}`
      );
      if (!response.success) throw new Error(response.error);
    },

    // ... implement positions and applications similarly
  };
}
```

## Phase 7: Frontend React Hooks

**frontend/hooks/useCandidates.ts:**

```typescript
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { createAuthenticatedClient } from "@/lib/api-client";
import { createStaffingModuleClient } from "../lib/api";
import { Candidate } from "../types";
import { useCurrentOrg } from "@org-module/frontend";

export function useCandidates(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { data: session } = useSession();
  const { currentOrg } = useCurrentOrg();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = session?.accessToken
    ? createStaffingModuleClient(createAuthenticatedClient(session.accessToken))
    : null;

  const fetchCandidates = useCallback(async () => {
    if (!api || !currentOrg) return;

    setLoading(true);
    setError(null);
    try {
      const result = await api.listCandidates(params);
      setCandidates(result.candidates);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch candidates"
      );
    } finally {
      setLoading(false);
    }
  }, [api, currentOrg, params]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const createCandidate = useCallback(
    async (data: Omit<Candidate, "id" | "created_at" | "updated_at">) => {
      if (!api || !currentOrg) return;
      try {
        const newCandidate = await api.createCandidate({
          ...data,
          org_id: currentOrg.id,
        });
        setCandidates((prev) => [newCandidate, ...prev]);
        return newCandidate;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create candidate"
        );
        throw err;
      }
    },
    [api, currentOrg]
  );

  return {
    candidates,
    loading,
    error,
    refetch: fetchCandidates,
    createCandidate,
  };
}
```

## Phase 8: Frontend React Components

**frontend/components/CandidateList.tsx:**

```typescript
import React from "react";
import { useCandidates } from "../hooks/useCandidates";
import { Candidate } from "../types";

export interface CandidateListProps {
  status?: "active" | "inactive" | "hired";
  onSelectCandidate?: (candidate: Candidate) => void;
  limit?: number;
}

export function CandidateList({
  status,
  onSelectCandidate,
  limit = 50,
}: CandidateListProps) {
  const { candidates, loading, error, refetch } = useCandidates({
    status,
    limit,
  });

  if (loading) return <div>Loading candidates...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!candidates.length) return <div>No candidates found</div>;

  return (
    <div className="candidate-list">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Candidates ({candidates.length})</h2>
        <button onClick={refetch} className="btn-secondary">
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="border p-4 rounded cursor-pointer hover:bg-gray-50"
            onClick={() => onSelectCandidate?.(candidate)}
          >
            <h3 className="font-semibold">
              {candidate.first_name} {candidate.last_name}
            </h3>
            <p className="text-sm text-gray-600">{candidate.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs rounded ${
                  candidate.status === "active"
                    ? "bg-green-100 text-green-800"
                    : candidate.status === "hired"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {candidate.status}
              </span>
              {candidate.resume_url && (
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-xs"
                >
                  Resume
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Phase 9: Frontend Barrel Export

**frontend/index.ts:**

```typescript
// Components
export { CandidateList } from "./components/CandidateList";
export { PositionList } from "./components/PositionList";
export { ApplicationForm } from "./components/ApplicationForm";

// Hooks
export { useCandidates } from "./hooks/useCandidates";
export { usePositions } from "./hooks/usePositions";
export { useApplications } from "./hooks/useApplications";

// Types
export type { Candidate, Position, Application } from "./types";

// API Client
export { createStaffingModuleClient } from "./lib/api";
export type { StaffingModuleApiClient } from "./lib/api";
```

## Phase 10: Infrastructure (Terraform)

**infrastructure/main.tf:**

```hcl
# Staffing Module Infrastructure

variable "environment" {
  type = string
}

variable "module_name" {
  type    = string
  default = "staffing-module"
}

variable "aws_region" {
  type = string
}

variable "supabase_secret_arn" {
  type = string
}

variable "sns_topic_arn" {
  type = string
}

variable "common_tags" {
  type = map(string)
}

# Lambda Layer: staffing-common
resource "aws_lambda_layer_version" "staffing_common" {
  filename            = "../backend/dist/staffing-common-layer.zip"
  layer_name          = "${var.environment}-${var.module_name}-common"
  compatible_runtimes = ["python3.11"]

  source_code_hash = filebase64sha256("../backend/dist/staffing-common-layer.zip")
}

# Lambda Function: Candidates
resource "aws_lambda_function" "candidates" {
  filename         = "../backend/dist/candidates.zip"
  function_name    = "${var.environment}-${var.module_name}-candidates"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  layers           = [aws_lambda_layer_version.staffing_common.arn]

  source_code_hash = filebase64sha256("../backend/dist/candidates.zip")

  environment {
    variables = {
      REGION              = var.aws_region
      ENVIRONMENT         = var.environment
      SUPABASE_URL        = data.aws_secretsmanager_secret_version.supabase.secret_string["url"]
      SUPABASE_ANON_KEY   = data.aws_secretsmanager_secret_version.supabase.secret_string["anon_key"]
      LOG_LEVEL           = "INFO"
    }
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-${var.module_name}-candidates"
  })
}

# ... similar resources for positions and applications Lambdas

# IAM Role for Lambda Execution
resource "aws_iam_role" "lambda_exec" {
  name = "${var.environment}-${var.module_name}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = var.common_tags
}

# IAM Policy for Lambda
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_secrets" {
  name = "${var.environment}-${var.module_name}-secrets"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        var.supabase_secret_arn
      ]
    }]
  })
}

# Data source for Supabase secrets
data "aws_secretsmanager_secret" "supabase" {
  arn = var.supabase_secret_arn
}

data "aws_secretsmanager_secret_version" "supabase" {
  secret_id = data.aws_secretsmanager_secret.supabase.id
}
```

**infrastructure/outputs.tf:**

```hcl
# API Routes Export
output "api_routes" {
  value = [
    # Candidates endpoints
    {
      method      = "GET"
      path        = "/staffing/candidates"
      integration = aws_lambda_function.candidates.invoke_arn
    },
    {
      method      = "POST"
      path        = "/staffing/candidates"
      integration = aws_lambda_function.candidates.invoke_arn
    },
    {
      method      = "GET"
      path        = "/staffing/candidates/{id}"
      integration = aws_lambda_function.candidates.invoke_arn
    },
    {
      method      = "PUT"
      path        = "/staffing/candidates/{id}"
      integration = aws_lambda_function.candidates.invoke_arn
    },
    {
      method      = "DELETE"
      path        = "/staffing/candidates/{id}"
      integration = aws_lambda_function.candidates.invoke_arn
    },
    # ... positions and applications endpoints
  ]
}

output "lambda_arns" {
  value = {
    candidates   = aws_lambda_function.candidates.arn
    positions    = aws_lambda_function.positions.arn
    applications = aws_lambda_function.applications.arn
  }
}

output "layer_arn" {
  value = aws_lambda_layer_version.staffing_common.arn
}
```

## Phase 11: Integration with Main Infrastructure

### Step 1: Add Module to Main Terraform

**sts-career-infra/terraform/environments/dev/main.tf:**

```hcl
# Import staffing-module
module "staffing_module" {
  source = "../../../sts-career-stack/packages/staffing-module/infrastructure"

  environment         = var.environment
  aws_region          = var.aws_region
  supabase_secret_arn = module.secrets.supabase_secret_arn
  sns_topic_arn       = module.monitoring.sns_topic_arn

  common_tags = {
    Environment = var.environment
    Project     = "sts-career"
    Module      = "staffing-module"
  }
}

# Create API Gateway integrations
resource "aws_apigatewayv2_integration" "staffing_module" {
  for_each = { for route in module.staffing_module.api_routes : "${route.method}-${route.path}" => route }

  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = each.value.integration
}

# Create API Gateway routes
resource "aws_apigatewayv2_route" "staffing_module" {
  for_each = { for route in module.staffing_module.api_routes : "${route.method}-${route.path}\" => route }

  api_id    = aws_apigatewayv2_api.main.id
  route_key = "${each.value.method} ${each.value.path}"
  target    = "integrations/${aws_apigatewayv2_integration.staffing_module[each.key].id}"

  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.okta.id
}

# Grant API Gateway permission to invoke Lambdas
resource "aws_lambda_permission" "staffing_module" {
  for_each = module.staffing_module.lambda_arns

  statement_id  = "AllowAPIGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

### Step 2: Deploy Infrastructure

```bash
cd sts-career-infra/terraform/environments/dev

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply deployment
terraform apply
```

## Phase 12: Use Module in App

**apps/frontend/app/staffing/page.tsx:**

```typescript
import { CandidateList, PositionList } from "@staffing-module/frontend";

export default function StaffingPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Staffing Management</h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Candidates</h2>
          <CandidateList />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Open Positions</h2>
          <PositionList status="open" />
        </div>
      </div>
    </div>
  );
}
```

## Testing

### Database Testing

```sql
-- Test RLS policies
BEGIN;

-- Set test user
SELECT set_config('request.jwt.claims', '{"sub": "test-user-1"}', true);

-- Test SELECT (should only return user's org data)
SELECT COUNT(*) FROM staffing_candidates WHERE org_id = 'org-1';  -- Should work
SELECT COUNT(*) FROM staffing_candidates WHERE org_id = 'org-2';  -- Should return 0

-- Test INSERT
INSERT INTO staffing_candidates (org_id, first_name, last_name, email)
VALUES ('org-1', 'John', 'Doe', 'john@example.com');  -- Should work

INSERT INTO staffing_candidates (org_id, first_name, last_name, email)
VALUES ('org-2', 'Jane', 'Doe', 'jane@example.com');  -- Should fail

ROLLBACK;
```

### Backend Testing

```bash
# Test Lambda locally
cd backend/lambdas/candidates

# Create test event
cat > test-event.json <<EOF
{
  "httpMethod": "GET",
  "requestContext": {
    "authorizer": {
      "sub": "test-user-1",
      "email": "test@example.com"
    }
  }
}
EOF

# Run Lambda locally (if using SAM)
sam local invoke CandidatesFunction --event test-event.json
```

### Frontend Testing

```bash
cd frontend

# Run tests
npm test

# Run specific test
npm test -- CandidateList.test.tsx
```

## Documentation

Create comprehensive module documentation:

**README.md:**

````markdown
# Staffing Module

Candidate and position management for staffing operations.

## Features

- ✅ Candidate management (CRUD operations)
- ✅ Position management (CRUD operations)
- ✅ Application tracking (candidate → position)
- ✅ Multi-tenant data isolation (RLS)
- ✅ Audit logging (all changes tracked)

## Database Tables

- `staffing_candidates` - Candidate information
- `staffing_positions` - Job positions
- `staffing_applications` - Applications linking candidates to positions

## API Endpoints

### Candidates

- `GET /staffing/candidates` - List candidates
- `POST /staffing/candidates` - Create candidate
- `GET /staffing/candidates/{id}` - Get candidate
- `PUT /staffing/candidates/{id}` - Update candidate
- `DELETE /staffing/candidates/{id}` - Delete candidate

### Positions

- `GET /staffing/positions` - List positions
- `POST /staffing/positions` - Create position
- ... (similar CRUD operations)

## Frontend Components

- `CandidateList` - List candidates with filtering
- `PositionList` - List positions
- `ApplicationForm` - Submit application

## Usage

```typescript
import { CandidateList, useCandidates } from "@staffing-module/frontend";

function MyComponent() {
  return <CandidateList status="active" />;
}
```
````

## Development

### Build Backend

```bash
cd backend
./build.sh
```

### Deploy Infrastructure

```bash
cd infrastructure
terraform init
terraform apply
```

### Run Tests

```bash
cd frontend
npm test
```

```

## Checklist

Use this checklist to track module creation progress:

- [ ] **Planning**
  - [ ] Define module scope
  - [ ] Design data model
  - [ ] Plan API endpoints
  - [ ] Design UI components

- [ ] **Database**
  - [ ] Create schema files
  - [ ] Apply RLS policies
  - [ ] Apply audit triggers
  - [ ] Test schema

- [ ] **Backend**
  - [ ] Create Lambda layer
  - [ ] Implement Lambda functions
  - [ ] Write unit tests
  - [ ] Build packages

- [ ] **Frontend**
  - [ ] Define TypeScript types
  - [ ] Create API client
  - [ ] Implement hooks
  - [ ] Build components
  - [ ] Write tests
  - [ ] Create barrel export

- [ ] **Infrastructure**
  - [ ] Write Terraform configuration
  - [ ] Define outputs
  - [ ] Test deployment

- [ ] **Integration**
  - [ ] Add to main infrastructure
  - [ ] Deploy to dev
  - [ ] Integration testing

- [ ] **Documentation**
  - [ ] README.md
  - [ ] API documentation
  - [ ] Usage examples

- [ ] **Deployment**
  - [ ] Deploy to test
  - [ ] Deploy to staging
  - [ ] Deploy to production

## Related Documentation

- **[CORA Principles](../architecture/cora-principles.md)** - Architecture philosophy
- **[Backend Architecture](../architecture/backend.md)** - Module backend patterns
- **[Frontend Architecture](../architecture/frontend.md)** - Module frontend patterns
- **[Database Architecture](../architecture/database.md)** - Multi-tenant schema design
- **[Module Integration Spec](../architecture/module-integration-spec.md)** - Technical specification

---

**Last Updated**: November 4, 2025
```
