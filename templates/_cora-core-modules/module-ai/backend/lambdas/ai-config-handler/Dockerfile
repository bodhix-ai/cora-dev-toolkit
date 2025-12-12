FROM public.ecr.aws/lambda/python:3.11

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy handler code
COPY packages/ai-config-module/backend/lambdas/ai-config-handler/lambda_function.py ${LAMBDA_TASK_ROOT}/

# Copy org-common module from org-module (CORA pattern)
COPY packages/org-module/backend/layers/org-common/python/org_common ${LAMBDA_TASK_ROOT}/org_common/

# Copy ai_config module (shared models and validators)
COPY packages/ai-config-module/backend/layers/ai-config-common/python/ai_config ${LAMBDA_TASK_ROOT}/ai_config/

# Install dependencies
COPY packages/ai-config-module/backend/lambdas/ai-config-handler/requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    cp -r /var/lang/lib/python3.11/site-packages/* ${LAMBDA_TASK_ROOT}/

# Fix file permissions for Lambda runtime
RUN chmod -R 755 ${LAMBDA_TASK_ROOT} && \
    find ${LAMBDA_TASK_ROOT} -type f -exec chmod 644 {} \;

# Set the CMD to your handler
CMD ["lambda_function.lambda_handler"]
