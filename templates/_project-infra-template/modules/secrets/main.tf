# Secrets Module
# Manages sensitive credentials in AWS Secrets Manager
# Used by CORA modules to access Supabase

resource "aws_secretsmanager_secret" "supabase" {
  name                    = "${var.name_prefix}-${var.environment}-supabase"
  description             = "Supabase credentials for CORA modules"
  recovery_window_in_days = 7  # Allow 7 days for recovery if accidentally deleted

  tags = var.common_tags
}

resource "aws_secretsmanager_secret_version" "supabase" {
  secret_id = aws_secretsmanager_secret.supabase.id
  secret_string = jsonencode({
    SUPABASE_URL              = var.supabase_url
    SUPABASE_ANON_KEY         = var.supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY = var.supabase_service_role_key
    SUPABASE_JWT_SECRET       = var.supabase_jwt_secret
  })
}
