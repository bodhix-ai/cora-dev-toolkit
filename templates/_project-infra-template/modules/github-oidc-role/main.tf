terraform {
  required_version = ">= 1.4.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

# OIDC provider for GitHub (optionally created here)
resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = [var.oidc_audience]
  thumbprint_list = var.thumbprints
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_oidc_provider_arn
  role_name         = "${var.name_prefix}-${var.environment}"
}

# IAM role with inline trust policy (avoids data source evaluation issues)
resource "aws_iam_role" "this" {
  name = local.role_name
  
  # Inline trust policy to avoid null reference during plan
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = local.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = var.oidc_audience
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_owner}/${var.github_repo}:environment:${var.environment}"
        }
      }
    }]
  })
  
  tags = {
    app  = "policymind"
    env  = var.environment
    repo = "${var.github_owner}/${var.github_repo}"
  }
  
  # Explicit dependency to ensure OIDC provider exists first
  depends_on = [aws_iam_openid_connect_provider.github]
}

# Inline least-privilege policy (scoped to pm-app-* by default)
data "aws_iam_policy_document" "permissions" {
  statement {
    sid     = "S3StateAndArtifacts"
    effect  = "Allow"
    actions = [
      "s3:CreateBucket","s3:DeleteBucket","s3:PutBucketPolicy","s3:GetBucket*","s3:ListBucket*",
      "s3:PutBucketVersioning","s3:PutEncryptionConfiguration","s3:PutLifecycleConfiguration",
      "s3:PutBucketTagging","s3:GetEncryptionConfiguration",
      "s3:PutObject","s3:GetObject","s3:DeleteObject","s3:List*"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:s3:::${var.s3_bucket_prefix}*",
      "arn:${data.aws_partition.current.partition}:s3:::${var.s3_bucket_prefix}*/*"
    ]
  }

  statement {
    sid    = "LambdaManagePrefixed"
    effect = "Allow"
    actions = [
      "lambda:CreateFunction","lambda:UpdateFunctionCode","lambda:UpdateFunctionConfiguration",
      "lambda:PublishVersion","lambda:CreateAlias","lambda:UpdateAlias",
      "lambda:Get*","lambda:List*","lambda:TagResource","lambda:UntagResource",
      "lambda:InvokeFunction"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:lambda:*:*:function:${var.lambda_function_prefix}*",
      "arn:${data.aws_partition.current.partition}:lambda:*:*:layer:${var.lambda_function_prefix}*"
    ]
  }

  statement {
    sid     = "ApiGatewayManage"
    effect  = "Allow"
    actions = ["apigateway:*"]
    resources = ["*"]
  }

  statement {
    sid    = "CloudWatchLogsForLambda"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents",
      "logs:Describe*","logs:List*","logs:PutRetentionPolicy","logs:TagResource","logs:UntagResource"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:logs:*:*:log-group:/aws/lambda/${var.lambda_function_prefix}*",
      "arn:${data.aws_partition.current.partition}:logs:*:*:log-group:/aws/lambda/${var.lambda_function_prefix}*:log-stream:*"
    ]
  }

  statement {
    sid     = "AllowPassRolePrefixed"
    effect  = "Allow"
    actions = ["iam:PassRole"]
    resources = ["arn:${data.aws_partition.current.partition}:iam::*:role/${var.iam_role_prefix}*"]
  }
}

resource "aws_iam_role_policy" "inline" {
  name   = "${local.role_name}-inline"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.permissions.json
}

# Optional additional inline JSON policy
resource "aws_iam_policy" "extra" {
  count  = length(var.extra_policy_json) > 0 ? 1 : 0
  name   = "${local.role_name}-extra"
  policy = var.extra_policy_json
}

resource "aws_iam_role_policy_attachment" "extra_attach" {
  count      = length(var.extra_policy_json) > 0 ? 1 : 0
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.extra[0].arn
}

# Optional managed policy attachments
resource "aws_iam_role_policy_attachment" "managed" {
  for_each   = toset(var.additional_policy_arns)
  role       = aws_iam_role.this.name
  policy_arn = each.value
}
