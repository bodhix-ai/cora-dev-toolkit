output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.app.dns_name
}

output "alb_url" {
  description = "URL of the application"
  value       = "http://${aws_lb.app.dns_name}"
}

output "health_check_url" {
  description = "Health check endpoint"
  value       = "http://${aws_lb.app.dns_name}/api/health"
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.app.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.app.name
}
