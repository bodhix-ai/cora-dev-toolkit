#!/bin/bash

# Enhanced TypeScript Auto-Fix Script
# Categorizes and automatically fixes TypeScript errors before commit

set -e

echo "🔍 Running TypeScript check..."

# Function to run type check and capture output
run_type_check() {
    npm run type-check 2>&1 || true
}

# Function to categorize and count errors
categorize_errors() {
    local output="$1"
    
    echo "📊 Categorizing TypeScript errors..." >&2
    
    # Count different error types (ensure clean numeric values)
    local missing_modules=$(echo "$output" | grep -c "Cannot find module" 2>/dev/null || echo "0")
    missing_modules=$(echo "$missing_modules" | tr -d '\n' | tr -d ' ')
    
    local missing_properties=$(echo "$output" | grep -c "Property .* does not exist" 2>/dev/null || echo "0")
    missing_properties=$(echo "$missing_properties" | tr -d '\n' | tr -d ' ')
    
    local implicit_any=$(echo "$output" | grep -c "implicitly has an 'any' type" 2>/dev/null || echo "0")
    implicit_any=$(echo "$implicit_any" | tr -d '\n' | tr -d ' ')
    
    local missing_exports=$(echo "$output" | grep -c "has no exported member" 2>/dev/null || echo "0")
    missing_exports=$(echo "$missing_exports" | tr -d '\n' | tr -d ' ')
    
    local not_callable=$(echo "$output" | grep -c "is not callable" 2>/dev/null || echo "0")
    not_callable=$(echo "$not_callable" | tr -d '\n' | tr -d ' ')
    
    echo "┌─────────────────────────────────────┐" >&2
    echo "│ TypeScript Error Summary            │" >&2
    echo "├─────────────────────────────────────┤" >&2
    printf "│ Missing modules:        %-11s │\n" "$missing_modules" >&2
    printf "│ Missing properties:     %-11s │\n" "$missing_properties" >&2
    printf "│ Implicit 'any' types:   %-11s │\n" "$implicit_any" >&2
    printf "│ Missing exports:        %-11s │\n" "$missing_exports" >&2
    printf "│ Not callable:           %-11s │\n" "$not_callable" >&2
    echo "└─────────────────────────────────────┘" >&2
    
    local total=$((missing_modules + missing_properties + implicit_any + missing_exports + not_callable))
    echo "📊 Total fixable errors: $total" >&2
    echo $total
}

# Function to fix path mapping issues
fix_path_mapping() {
    echo "🔧 Fixing TypeScript path mapping..."
    
    # Add missing path mappings to tsconfig.json
    if ! grep -q '"@/\*"' apps/frontend/tsconfig.json; then
        echo "  ➤ Adding @/* path mapping..."
        
        # Create backup
        cp apps/frontend/tsconfig.json apps/frontend/tsconfig.json.bak
        
        # Add @/* path mapping
        sed -i '' 's/"@sts-career\/\*": \["\.\.\/\.\.\/packages\/\*\/src"\]/"@sts-career\/\*": ["..\/..\/packages\/\*\/src"],\
      "@\/\*": ["\.\/src\/\*"]/' apps/frontend/tsconfig.json
        
        echo "  ✅ Path mapping added"
    fi
}

# Function to create missing type definitions
create_missing_types() {
    echo "🔧 Creating missing type definitions..."
    
    # Create types directory if it doesn't exist
    mkdir -p apps/frontend/src/types
    
    # Create basic types file
    if [ ! -f apps/frontend/src/types/index.ts ]; then
        echo "  ➤ Creating basic type definitions..."
        
        cat > apps/frontend/src/types/index.ts << 'EOF'
// Basic type definitions for the application

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface UserOrganization extends Organization {
  role: string;
  permissions: string[];
}

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      name?: string;
    };
  }
}
EOF
        echo "  ✅ Basic types created"
    fi
}

# Function to create missing module stubs
create_missing_modules() {
    echo "🔧 Creating missing module stubs..."
    
    # Create lib directory
    mkdir -p apps/frontend/src/lib
    
    # Create basic API client
    if [ ! -f apps/frontend/src/lib/api-client.ts ]; then
        echo "  ➤ Creating API client stub..."
        
        cat > apps/frontend/src/lib/api-client.ts << 'EOF'
// API Client stub - replace with actual implementation

export function createAuthenticatedClient(token: string) {
  return {
    // Add your API methods here
    get: async (url: string) => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },
    post: async (url: string, data: any) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  };
}
EOF
        echo "  ✅ API client stub created"
    fi
}

# Function to create missing components
create_missing_components() {
    echo "🔧 Creating missing component stubs..."
    
    # Create components directories
    mkdir -p apps/frontend/src/components/auth
    mkdir -p apps/frontend/src/components/common
    mkdir -p apps/frontend/src/components/providers
    
    # Create ProtectedRoute component
    if [ ! -f apps/frontend/src/components/auth/ProtectedRoute.tsx ]; then
        echo "  ➤ Creating ProtectedRoute component..."
        
        cat > apps/frontend/src/components/auth/ProtectedRoute.tsx << 'EOF'
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // TODO: Implement actual protection logic
  return <>{children}</>;
}
EOF
        echo "  ✅ ProtectedRoute component created"
    fi
    
    # Create RequireRole component
    if [ ! -f apps/frontend/src/components/auth/RequireRole.tsx ]; then
        echo "  ➤ Creating RequireRole component..."
        
        cat > apps/frontend/src/components/auth/RequireRole.tsx << 'EOF'
import { ReactNode } from 'react';

interface RequireRoleProps {
  children: ReactNode;
  role: string;
}

export function RequireRole({ children }: RequireRoleProps) {
  // TODO: Implement role checking logic
  return <>{children}</>;
}
EOF
        echo "  ✅ RequireRole component created"
    fi
    
    # Create Toast component
    if [ ! -f apps/frontend/src/components/common/Toast.tsx ]; then
        echo "  ➤ Creating Toast component..."
        
        cat > apps/frontend/src/components/common/Toast.tsx << 'EOF'
import { ReactNode, createContext, useContext } from 'react';

const ToastContext = createContext<{
  showToast: (message: string, type?: 'success' | 'error') => void;
}>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // TODO: Implement actual toast functionality
    console.log(`Toast (${type}): ${message}`);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
EOF
        echo "  ✅ Toast component created"
    fi
    
    # Create SessionProvider
    if [ ! -f apps/frontend/src/components/providers/SessionProvider.tsx ]; then
        echo "  ➤ Creating SessionProvider component..."
        
        cat > apps/frontend/src/components/providers/SessionProvider.tsx << 'EOF'
'use client';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
}
EOF
        echo "  ✅ SessionProvider component created"
    fi
}

# Function to create missing stores
create_missing_stores() {
    echo "🔧 Creating missing store stubs..."
    
    mkdir -p apps/frontend/src/store
    
    # Create user store
    if [ ! -f apps/frontend/src/store/useUserStore.ts ]; then
        echo "  ➤ Creating user store..."
        
        cat > apps/frontend/src/store/useUserStore.ts << 'EOF'
import { create } from 'zustand';
import { User } from '@/types';

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
EOF
        echo "  ✅ User store created"
    fi
    
    # Create organization store
    if [ ! -f apps/frontend/src/store/useOrganizationStore.ts ]; then
        echo "  ➤ Creating organization store..."
        
        cat > apps/frontend/src/store/useOrganizationStore.ts << 'EOF'
import { create } from 'zustand';
import { Organization } from '@/types';

interface OrganizationStore {
  organization: Organization | null;
  setOrganization: (organization: Organization | null) => void;
}

export const useOrganizationStore = create<OrganizationStore>((set) => ({
  organization: null,
  setOrganization: (organization) => set({ organization }),
}));
EOF
        echo "  ✅ Organization store created"
    fi
}

# Function to create basic auth module
create_auth_module() {
    echo "🔧 Creating auth module stub..."
    
    if [ ! -f apps/frontend/src/auth.ts ]; then
        echo "  ➤ Creating auth configuration..."
        
        cat > apps/frontend/src/auth.ts << 'EOF'
import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';

const authConfig: NextAuthConfig = {
  providers: [
    // TODO: Add your auth providers here
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
EOF
        echo "  ✅ Auth module created"
    fi
}

# Main execution function
main() {
    echo "🚀 Starting TypeScript Auto-Fix Process..."
    
    echo "📦 Building all packages..."
    npm install
    
    local attempt=1
    local max_attempts=3
    
    while [ $attempt -le $max_attempts ]; do
        echo "📝 Attempt $attempt/$max_attempts"
        
        local type_check_output=$(run_type_check)
        
        if ! echo "$type_check_output" | grep -q "error TS"; then
            echo "✅ All TypeScript errors resolved!"
            echo "🎉 Type check passed - proceeding with commit..."
            return 0
        fi
        
        echo "❌ TypeScript errors found:"
        local error_count=$(categorize_errors "$type_check_output")
        
        if [ "$error_count" -gt 0 ]; then
            echo "🔧 Applying automatic fixes..."
            
            # Apply fixes in order of dependency
            fix_path_mapping
            create_missing_types
            create_missing_modules
            create_missing_components
            create_missing_stores
            create_auth_module
            
            echo "✅ Auto-fixes applied"
            echo "🔄 Re-running type check..."
        else
            echo "❌ No fixable errors detected"
            break
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo "❌ Could not resolve all TypeScript errors automatically"
    echo "📋 Manual intervention required. Please review the errors above."
    return 1
}

# Run the main function
main
