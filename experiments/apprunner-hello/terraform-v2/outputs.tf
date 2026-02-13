output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_arn" {
  description = "ECR repository ARN"
  value       = aws_ecr_repository.app.arn
}

output "apprunner_service_url" {
  description = "App Runner service URL"
  value       = aws_apprunner_service.app.service_url
}

output "apprunner_service_arn" {
  description = "App Runner service ARN"
  value       = aws_apprunner_service.app.arn
}

output "apprunner_service_id" {
  description = "App Runner service ID"
  value       = aws_apprunner_service.app.service_id
}

output "apprunner_status" {
  description = "App Runner service status"
  value       = aws_apprunner_service.app.status
}

output "ecr_access_role_arn" {
  description = "IAM role ARN for ECR access"
  value       = aws_iam_role.apprunner_ecr_access.arn
}

output "instance_role_arn" {
  description = "IAM role ARN for App Runner instance"
  value       = aws_iam_role.apprunner_instance.arn
}