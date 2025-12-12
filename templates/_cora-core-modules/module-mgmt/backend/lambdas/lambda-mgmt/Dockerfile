# Lambda Management Module - Docker Image
# This Lambda function manages Lambda warming configurations and EventBridge rules

FROM public.ecr.aws/lambda/python:3.11

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy org_common layer (shared dependency from org-module)
COPY packages/org-module/backend/layers/org-common/python/ /opt/python/

# Copy lambda-mgmt-common layer (module-specific utilities)
COPY packages/lambda-mgmt-module/backend/layers/lambda-mgmt-common/python/ /opt/python/

# Copy Lambda function code (relative to pm-app-stack root)
COPY packages/lambda-mgmt-module/backend/lambdas/lambda-mgmt/lambda_function.py ${LAMBDA_TASK_ROOT}/

# Copy requirements and install dependencies (relative to pm-app-stack root)
COPY packages/lambda-mgmt-module/backend/lambdas/lambda-mgmt/requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements.txt

# Lambda runtime will execute lambda_function.lambda_handler
CMD ["lambda_function.lambda_handler"]
