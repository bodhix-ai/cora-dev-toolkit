# CORA Guide: Docker Container Local Testing

**Purpose:** Test containerized CORA applications locally before deploying to App Runner  
**Audience:** Developers testing Docker builds  
**Related:** [DOCKER-BUILD Standard](../standards/30_std_infra_DOCKER-BUILD.md)

---

## Quick Start

### Build and Run

```bash
cd ~/code/bodhix/testing/mono-s1/ai-mod-stack

# Build image
docker build -t ai-mod-web:latest .

# Run container
docker run -p 3000:3000 --env-file apps/web/.env.local ai-mod-web:latest
```

### Test

```bash
# Health check
curl http://localhost:3000/api/healthcheck

# Web app
open http://localhost:3000
```

---

## Step-by-Step Testing Workflow

### Step 1: Build the Image

```bash
cd ~/code/bodhix/testing/mono-s1/ai-mod-stack

# Build (takes 2-3 minutes)
docker build -t ai-mod-web:latest .

# Verify image exists
docker images | grep ai-mod-web
```

**Expected output:**
```
ai-mod-web   latest   f9a9c7a0779d   2 minutes ago   260MB
```

### Step 2: Run the Container

**Option A: Foreground (see logs in terminal)**
```bash
docker run -p 3000:3000 --env-file apps/web/.env.local ai-mod-web:latest
```

**Option B: Background (detached)**
```bash
docker run -d -p 3000:3000 --env-file apps/web/.env.local --name test ai-mod-web:latest

# View logs
docker logs test

# Follow logs in real-time
docker logs -f test
```

**Option C: Specific environment variables**
```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e AUTH_TRUST_HOST=true \
  -e NEXT_PUBLIC_AUTH_PROVIDER=okta \
  -e NEXT_PUBLIC_SUPABASE_URL=https://kxshyoaxjkwvcdmjrfxz.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  -e NEXT_PUBLIC_CORA_API_URL=https://lqu30jldc1.execute-api.us-east-1.amazonaws.com \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  -e OKTA_DOMAIN=simpletech.okta.com \
  -e OKTA_CLIENT_ID=0oax0eaf3bgW5NP73697 \
  -e OKTA_CLIENT_SECRET=OYZopGSsAchUlcW9XxYSVBVsfpcpbV7kJ6bytqZ4UeBILKA0kWU7irbyF5wTF-CX \
  -e OKTA_ISSUER=https://simpletech.okta.com/oauth2/default \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=Iu/OSUlrsqLNeUF14dSWtwMRpmjAXv//jaIH+jgQb2I= \
  -e AWS_REGION=us-east-1 \
  ai-mod-web:latest
```

**Note:** Variables prefixed with `NEXT_PUBLIC_*` are required for Next.js client-side access. Without these prefixes, the React app cannot access Supabase, API URLs, or other client-side configuration.

### Step 3: Test Health Check

```bash
# Basic test
curl http://localhost:3000/api/healthcheck

# Verbose test (see HTTP headers)
curl -v http://localhost:3000/api/healthcheck

# Pretty JSON output
curl http://localhost:3000/api/healthcheck | jq
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-11T12:11:32.123Z",
  "service": "web"
}
```

**Expected HTTP status:** `200 OK` (not `307 Redirect`, not `404 Not Found`)

### Step 4: Test Web Application

```bash
# Open in browser
open http://localhost:3000

# Or manually navigate to:
# http://localhost:3000
```

**What to verify:**
- [ ] Login page loads
- [ ] Authentication works (Okta)
- [ ] API calls succeed
- [ ] No console errors

### Step 5: Clean Up

```bash
# Stop container (if running in background)
docker stop test

# Remove container
docker rm test

# Remove image (if rebuilding)
docker rmi ai-mod-web:latest
```

---

## Debugging Commands

### View Container Logs

```bash
# Last 100 lines
docker logs --tail 100 test

# Follow logs in real-time
docker logs -f test

# All logs since start
docker logs test
```

### Check Running Containers

```bash
# Running containers
docker ps

# All containers (including stopped)
docker ps -a

# With size info
docker ps -s
```

### Execute Commands Inside Container

```bash
# Open shell
docker exec -it test sh

# Inside container:
ls -la /app/apps/web/.next/standalone
env | grep NEXT
ps aux
cat /app/apps/web/.next/standalone/apps/web/server.js
```

### Inspect Container Configuration

```bash
# Full configuration
docker inspect test

# Environment variables only
docker inspect test | jq '.[0].Config.Env'

# Port mappings
docker inspect test | jq '.[0].NetworkSettings.Ports'

# Image info
docker inspect test | jq '.[0].Image'
```

---

## Troubleshooting

### Container Exits Immediately

**Check logs:**
```bash
docker logs test
```

**Common causes:**
- Missing required environment variables
- Application crash on startup
- Port already in use (change to `-p 3001:3000`)

**Solution:**
```bash
# Check exit code
docker inspect test | jq '.[0].State.ExitCode'

# View full error
docker logs test
```

### Can't Access http://localhost:3000

**Verify port mapping:**
```bash
docker ps
# Look for: 0.0.0.0:3000->3000/tcp
```

**Check if port 3000 is in use:**
```bash
lsof -i :3000

# If dev server running, stop it:
# Or use different port: -p 3001:3000
```

**Test from inside container:**
```bash
docker exec test curl http://localhost:3000/api/healthcheck
```

### Health Check Returns 404

**Verify route file exists:**
```bash
docker exec test ls -la /app/apps/web/app/api/healthcheck/
```

**Check Next.js routing:**
```bash
docker exec test find /app -name "*healthcheck*"
```

### Authentication Middleware Blocks Health Check

**Verify middleware configuration:**
```bash
docker exec test cat /app/apps/web/middleware.js | grep healthcheck
```

**Expected:** Should see `/api/healthcheck` excluded from auth

### Application Errors

**Check server logs:**
```bash
docker logs -f test
```

**Check for missing dependencies:**
```bash
docker exec test ls -la /app/node_modules/@ai-mod/
```

---

## Testing Scenarios

### Scenario 1: Quick Smoke Test

```bash
# Build and run
docker build -t ai-mod-web:latest .
docker run -d -p 3000:3000 --env-file apps/web/.env.local --name test ai-mod-web:latest

# Wait for startup
sleep 5

# Test health check
curl http://localhost:3000/api/healthcheck

# Expected: {"status":"healthy",...}

# Clean up
docker stop test && docker rm test
```

### Scenario 2: Full Integration Test

```bash
# Run container
docker run -d -p 3000:3000 --env-file apps/web/.env.local --name test ai-mod-web:latest

# Test health check
curl http://localhost:3000/api/healthcheck

# Test web app
open http://localhost:3000

# Test login (manual)
# Test API calls (manual)

# Check logs for errors
docker logs test | grep -i error

# Clean up
docker stop test && docker rm test
```

### Scenario 3: Debug Session

```bash
# Run in foreground to see logs
docker run -p 3000:3000 --env-file apps/web/.env.local ai-mod-web:latest

# In another terminal:
curl -v http://localhost:3000/api/healthcheck
open http://localhost:3000

# Watch logs in first terminal
# Press Ctrl+C when done
```

---

## Comparison: Dev Server vs Container

| Aspect | Dev Server (`pnpm run dev`) | Container |
|--------|-------------------------------|-----------|
| **Build Type** | Development (hot reload) | Production (optimized) |
| **Start Time** | ~5 seconds | ~2 seconds |
| **Environment** | .env.local (auto-loaded) | Must pass via --env-file |
| **Source Maps** | Yes | No |
| **Debugging** | Easy | Harder |
| **Performance** | Slower | Faster |
| **Matches Production** | No | Yes (same as App Runner) |

**Key Point:** Container runs the same way as App Runner, so if it works locally, it should work in App Runner.

---

## Common Commands Reference

### Container Lifecycle

```bash
# Build
docker build -t IMAGE_NAME .

# Run foreground
docker run -p 3000:3000 IMAGE_NAME

# Run background
docker run -d -p 3000:3000 --name CONTAINER_NAME IMAGE_NAME

# Stop
docker stop CONTAINER_NAME

# Start stopped container
docker start CONTAINER_NAME

# Remove
docker rm CONTAINER_NAME

# Stop and remove
docker stop CONTAINER_NAME && docker rm CONTAINER_NAME
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi IMAGE_NAME

# Remove all unused images
docker image prune

# Tag image
docker tag SOURCE_IMAGE TARGET_IMAGE
```

### Inspection

```bash
# Running containers
docker ps

# All containers
docker ps -a

# Container logs
docker logs CONTAINER_NAME
docker logs -f CONTAINER_NAME  # Follow
docker logs --tail 100 CONTAINER_NAME  # Last 100 lines

# Container details
docker inspect CONTAINER_NAME

# Execute command
docker exec CONTAINER_NAME COMMAND
docker exec -it CONTAINER_NAME sh  # Interactive shell
```

---

## Environment Variables Reference

**Required for CORA:**

```bash
# Runtime Configuration
NODE_ENV=production
AUTH_TRUST_HOST=true
HOSTNAME=0.0.0.0  # Set in Dockerfile, not needed as env var

# Next.js Public Variables (Client-side access - MUST have NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_AUTH_PROVIDER=okta
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_CORA_API_URL=https://[api-id].execute-api.us-east-1.amazonaws.com

# Server-side Variables
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OKTA_DOMAIN=simpletech.okta.com
OKTA_CLIENT_ID=0oax0eaf3bgW5NP73697
OKTA_CLIENT_SECRET=<secret>
OKTA_ISSUER=https://simpletech.okta.com/oauth2/default
NEXTAUTH_URL=http://localhost:3000  # Or App Runner URL
NEXTAUTH_SECRET=<secret>
AWS_REGION=us-east-1
```

**Critical:** Variables with `NEXT_PUBLIC_*` prefix are embedded in the client-side JavaScript bundle at build time and are accessible in React components. Variables without this prefix are only available on the server-side (API routes, getServerSideProps, etc.).

**Using .env.local:**
```bash
docker run -p 3000:3000 --env-file apps/web/.env.local IMAGE_NAME
```

**Using individual -e flags:**
```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=... \
  IMAGE_NAME
```

---

## Best Practices

### Before Testing

1. **Ensure app builds locally:**
   ```bash
   pnpm run build
   ```

2. **Check .env.local has all variables:**
   ```bash
   cat apps/web/.env.local
   ```

3. **Clean Docker state (if having issues):**
   ```bash
   docker system prune
   ```

### During Testing

1. **Test health check first** - Simplest endpoint to verify container works
2. **Check logs continuously** - Use `docker logs -f` to see errors
3. **Test incrementally** - Health check → Home page → Login → Features

### After Testing

1. **Clean up containers:**
   ```bash
   docker stop $(docker ps -aq) && docker rm $(docker ps -aq)
   ```

2. **Keep successful images tagged:**
   ```bash
   docker tag ai-mod-web:latest ai-mod-web:working-2026-02-11
   ```

---

## Preparing for App Runner Deployment

### Step 1: Verify Container Works Locally

```bash
docker run -d -p 3000:3000 --env-file apps/web/.env.local --name test ai-mod-web:latest
curl http://localhost:3000/api/healthcheck  # Must return 200 OK
docker stop test && docker rm test
```

### Step 2: Tag for ECR

```bash
docker tag ai-mod-web:latest 887559014095.dkr.ecr.us-east-1.amazonaws.com/ai-mod-dev-web:latest
```

### Step 3: Push to ECR

```bash
# Login
AWS_PROFILE=ai-sec-nonprod aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 887559014095.dkr.ecr.us-east-1.amazonaws.com

# Push
docker push 887559014095.dkr.ecr.us-east-1.amazonaws.com/ai-mod-dev-web:latest
```

### Step 4: Deploy to App Runner

App Runner will automatically pull the image and deploy. Monitor via:
```bash
AWS_PROFILE=ai-sec-nonprod aws apprunner describe-service \
  --service-arn arn:aws:apprunner:us-east-1:887559014095:service/ai-mod-dev-web/[id]
```

---

## Checklist: Ready for App Runner?

- [ ] Container builds successfully
- [ ] Container runs locally without errors
- [ ] Health check returns 200 OK (not 307, not 404)
- [ ] Web app loads in browser
- [ ] Authentication works
- [ ] API calls succeed
- [ ] No errors in logs
- [ ] Environment variables correct
- [ ] HOSTNAME set to 0.0.0.0 in Dockerfile

---

**Document Status:** ✅ Active  
**Last Updated:** February 11, 2026  
**Related:** [DOCKER-BUILD Standard](../standards/30_std_infra_DOCKER-BUILD.md)