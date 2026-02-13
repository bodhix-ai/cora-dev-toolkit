terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = var.ecr_repo_name
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = false
  }
  
  tags = {
    Name        = var.ecr_repo_name
    Environment = "experiment"
    Purpose     = "apprunner-hello-world"
  }
}

# ECR Lifecycle Policy (keep last 5 images)
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus     = "any"
        countType     = "imageCountMoreThan"
        countNumber   = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# IAM Role for App Runner to access ECR
resource "aws_iam_role" "apprunner_ecr_access" {
  name = "${var.app_name}-ecr-access-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "build.apprunner.amazonaws.com"
      }
    }]
  })
  
  tags = {
    Name        = "${var.app_name}-ecr-access-role"
    Environment = "experiment"
  }
}

# Attach ECR access policy
resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# IAM Role for App Runner instance (for CloudWatch Logs)
resource "aws_iam_role" "apprunner_instance" {
  name = "${var.app_name}-instance-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "tasks.apprunner.amazonaws.com"
      }
    }]
  })
  
  tags = {
    Name        = "${var.app_name}-instance-role"
    Environment = "experiment"
  }
}

# Attach CloudWatch Logs policy
resource "aws_iam_role_policy_attachment" "apprunner_instance_logs" {
  role       = aws_iam_role.apprunner_instance.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

# App Runner Service
resource "aws_apprunner_service" "app" {
  service_name = var.app_name
  
  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }
    
    image_repository {
      image_identifier      = "${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"
      
      image_configuration {
        port = "3000"
        
        runtime_environment_variables = {
          NODE_ENV = "production"
          HOSTNAME = "0.0.0.0"
        }
      }
    }
    
    auto_deployments_enabled = false
  }
  
  instance_configuration {
    cpu               = "1 vCPU"
    memory            = "2 GB"
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }
  
  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }
  
  tags = {
    Name        = var.app_name
    Environment = "experiment"
  }
  
  depends_on = [
    aws_iam_role_policy_attachment.apprunner_ecr_access,
    aws_iam_role_policy_attachment.apprunner_instance_logs
  ]
}