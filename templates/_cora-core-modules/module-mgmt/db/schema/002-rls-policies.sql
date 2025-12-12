-- Lambda Management Module - Row Level Security Policies
-- Created: December 8, 2025
-- Purpose: Restrict platform_lambda_config access to super admins only

-- Enable RLS on platform_lambda_config table
ALTER TABLE platform_lambda_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for development)
DROP POLICY IF EXISTS "Super admins can view all platform configs" ON platform_lambda_config;
DROP POLICY IF EXISTS "Super admins can insert platform configs" ON platform_lambda_config;
DROP POLICY IF EXISTS "Super admins can update platform configs" ON platform_lambda_config;
DROP POLICY IF EXISTS "Super admins can delete platform configs" ON platform_lambda_config;

-- Policy: Super admins can view all platform configs
CREATE POLICY "Super admins can view all platform configs"
ON platform_lambda_config
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.global_role = 'super_admin'
    )
);

-- Policy: Super admins can insert platform configs
CREATE POLICY "Super admins can insert platform configs"
ON platform_lambda_config
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.global_role = 'super_admin'
    )
);

-- Policy: Super admins can update platform configs
CREATE POLICY "Super admins can update platform configs"
ON platform_lambda_config
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.global_role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.global_role = 'super_admin'
    )
);

-- Policy: Super admins can delete platform configs
CREATE POLICY "Super admins can delete platform configs"
ON platform_lambda_config
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.global_role = 'super_admin'
    )
);

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON platform_lambda_config TO authenticated;

COMMENT ON POLICY "Super admins can view all platform configs" ON platform_lambda_config IS 'Only users with global_role=super_admin can view platform Lambda configurations';
COMMENT ON POLICY "Super admins can insert platform configs" ON platform_lambda_config IS 'Only users with global_role=super_admin can create platform Lambda configurations';
COMMENT ON POLICY "Super admins can update platform configs" ON platform_lambda_config IS 'Only users with global_role=super_admin can update platform Lambda configurations';
COMMENT ON POLICY "Super admins can delete platform configs" ON platform_lambda_config IS 'Only users with global_role=super_admin can delete platform Lambda configurations';
