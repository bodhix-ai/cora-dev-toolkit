# Modular API Gateway - Outputs

output "api_gateway_id" {
  description = "ID of the modular API Gateway"
  value       = aws_apigatewayv2_api.modular.id
}

output "api_gateway_url" {
  description = "URL of the modular API Gateway"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "api_gateway_arn" {
  description = "ARN of the modular API Gateway"
  value       = aws_apigatewayv2_api.modular.arn
}

output "api_gateway_execution_arn" {
  description = "Execution ARN of the modular API Gateway"
  value       = aws_apigatewayv2_api.modular.execution_arn
}

output "stage_name" {
  description = "Name of the API Gateway stage"
  value       = aws_apigatewayv2_stage.default.name
}

output "routes" {
  description = "Map of routes created in the API Gateway"
  value = {
    for key, route in aws_apigatewayv2_route.module_routes :
    key => {
      route_key = route.route_key
      route_id  = route.id
    }
  }
}
