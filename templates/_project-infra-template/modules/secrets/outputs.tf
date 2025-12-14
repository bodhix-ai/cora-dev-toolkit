output "supabase_secret_arn" {
  description = "ARN of the Supabase secret in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.supabase.arn
}

output "supabase_secret_name" {
  description = "Name of the Supabase secret in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.supabase.name
}
