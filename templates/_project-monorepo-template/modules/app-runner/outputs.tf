# App Runner Module - Outputs

output "app_runner_service_url" {
  description = "URL of the App Runner service"
  value       = "https://${aws_apprunner_service.app.service_url}"
}

output "app_runner_service_arn" {
  description = "ARN of the App Runner service"
  value       = aws_apprunner_service.app.arn
}

output "app_runner_service_id" {
  description = "ID of the App Runner service"
  value       = aws_apprunner_service.app.service_id
}

output "app_runner_service_status" {
  description = "Status of the App Runner service"
  value       = aws_apprunner_service.app.status
}
