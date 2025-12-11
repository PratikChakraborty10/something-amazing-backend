# Environment Variables Deployment Guide

## How Environment Variables Work During Deployment

### TL;DR - Quick Answer

**Which .env file is used?**
- Development: `.env` (default) or `.env.dev`
- Staging: `.env.staging`
- Production: `.env.prod`

**How to deploy:**
```bash
# Development (uses .env by default)
npm run deploy:dev

# Staging (uses .env.staging)
npm run deploy:staging

# Production (uses .env.prod)
npm run deploy:prod
```

---

## Detailed Explanation

### How Serverless Framework Loads Environment Variables

The `serverless.yml` configuration includes:

```yaml
# This tells Serverless to automatically load .env files
useDotenv: true
```

This enables **automatic .env file loading** based on the deployment stage:

1. **Development** (`--stage dev`):
   - First tries: `.env.dev`
   - Falls back to: `.env`

2. **Staging** (`--stage staging`):
   - First tries: `.env.staging`
   - Falls back to: `.env`

3. **Production** (`--stage prod`):
   - First tries: `.env.prod`
   - Falls back to: `.env`

### File Priority & Loading Order

Serverless Framework loads environment variables in this order (later ones override earlier):

```
1. .env (base/default)
2. .env.[stage] (stage-specific, e.g., .env.dev)
3. System environment variables (highest priority)
```

### Example Deployment Flow

#### Deploying to Development

```bash
npm run deploy:dev
```

What happens:
1. Serverless Framework starts deployment with `--stage dev`
2. Looks for `.env.dev` file
3. If not found, falls back to `.env`
4. Loads all variables from the file
5. Variables are set in Lambda function configuration
6. Deployment proceeds

#### Deploying to Production

```bash
npm run deploy:prod
```

What happens:
1. Serverless Framework starts deployment with `--stage prod`
2. Looks for `.env.prod` file
3. Loads all variables from `.env.prod`
4. Variables are set in Lambda function configuration
5. Deployment to production stack

---

## Setup Instructions

### Step 1: Create Your Environment Files

```bash
# For development
cp .env .env.dev
# Edit .env.dev with your development values

# For production (when ready)
cp .env.prod.example .env.prod
# Edit .env.prod with your production values
```

### Step 2: Verify Environment Files

Your directory should have:
```
.env                 # Base environment (for local dev)
.env.dev            # Development Lambda deployment
.env.staging        # Staging Lambda deployment (optional)
.env.prod           # Production Lambda deployment
.env.dev.example    # Template (committed to git)
.env.prod.example   # Template (committed to git)
```

### Step 3: Update DATABASE_URL

> [!IMPORTANT]
> **CRITICAL**: Update `DATABASE_URL` in all `.env.*` files to use session pooler (port 6543)

```bash
# In .env.dev, .env.staging, .env.prod
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
```

### Step 4: Deploy

```bash
# Verify configuration before deploying
npm run predeploy:check:dev

# Deploy to development
npm run deploy:dev
```

---

## How Variables Are Deployed

### During Build Time

When you run `npm run deploy:dev`, here's what happens:

1. **Build Phase**:
   ```bash
   npm run build  # Compiles TypeScript to JavaScript
   ```

2. **Environment Loading**:
   ```bash
   serverless deploy --stage dev
   # → Loads .env.dev automatically
   ```

3. **Variable Injection**:
   The `serverless.yml` reads variables like:
   ```yaml
   environment:
     SUPABASE_URL: ${env:SUPABASE_URL}
     DATABASE_URL: ${env:DATABASE_URL}
   ```
   
   These `${env:VARIABLE}` references are replaced with actual values from `.env.dev`

4. **Lambda Configuration**:
   Variables are set as **Lambda environment variables** in AWS:
   ```
   AWS Lambda → Function → Configuration → Environment variables
   ```

5. **Deployment**:
   - Code is packaged
   - Uploaded to S3
   - Lambda function created/updated with environment variables
   - API Gateway configured

### After Deployment

The environment variables are **stored in AWS Lambda configuration**, not in your code:

- Variables are encrypted at rest in AWS
- Accessible to your Lambda function at runtime
- Can be viewed/edited in AWS Console (Lambda → Configuration)
- Not visible in the deployed code package

---

## Deployment Commands Explained

### Development Deployment

```bash
npm run deploy:dev
```

Expands to:
```bash
npm run build && serverless deploy --stage dev
```

1. Builds the NestJS application
2. Serverless loads `.env.dev`
3. Deploys to `something-amazing-backend-dev` stack
4. Function named: `something-amazing-backend-dev-api`
5. Environment: Development

### Production Deployment

```bash
npm run deploy:prod
```

Expands to:
```bash
npm run build && serverless deploy --stage prod
```

1. Builds the NestJS application
2. Serverless loads `.env.prod`
3. Deploys to `something-amazing-backend-prod` stack
4. Function named: `something-amazing-backend-prod-api`
5. Environment: Production

---

## Environment Variable Security

### Local Development (.env files)

✅ **Safe for local development**:
- `.env.dev` on your machine
- `.env.staging` on your machine
- `.env.prod` on your machine

❌ **Never commit to Git**:
- All `.env.*` files are in `.gitignore`
- Only `.env.*.example` templates are tracked

### Production Deployment (AWS)

For enhanced security in production, consider:

#### Option 1: AWS Systems Manager Parameter Store (Recommended)

```bash
# Store secrets in Parameter Store
aws ssm put-parameter \
  --name "/something-amazing/prod/DATABASE_URL" \
  --value "postgresql://..." \
  --type "SecureString"

# Update serverless.yml
environment:
  DATABASE_URL: ${ssm:/something-amazing/${self:provider.stage}/DATABASE_URL}
```

#### Option 2: AWS Secrets Manager

```yaml
environment:
  DATABASE_URL: ${secretsmanager:prod/database}
```

#### Option 3: CI/CD Environment Variables

In GitHub Actions:
```yaml
- name: Set environment variables
  run: |
    echo "DATABASE_URL=${{ secrets.PROD_DATABASE_URL }}" >> $GITHUB_ENV
```

---

## Verification

### Before Deployment

```bash
# Check which env file will be loaded
npm run predeploy:check:dev      # Checks .env.dev
npm run predeploy:check:staging  # Checks .env.staging
npm run predeploy:check:prod     # Checks .env.prod
```

### After Deployment

1. **Check Lambda Configuration** (AWS Console):
   ```
   AWS Lambda → Functions → something-amazing-backend-dev-api
   → Configuration → Environment variables
   ```

2. **Test Environment Variables**:
   ```bash
   # View logs to see if variables are loaded
   npm run logs:dev
   ```

3. **Invoke Function**:
   ```bash
   serverless invoke -f api --stage dev
   ```

---

## Troubleshooting

### Issue: "Environment variable not found"

**Cause**: Variable not in `.env.[stage]` file or misnamed

**Solution**:
```bash
# Check your .env.dev file
cat .env.dev | grep VARIABLE_NAME

# Ensure it matches serverless.yml
# serverless.yml: ${env:SUPABASE_URL}
# .env.dev:       SUPABASE_URL=https://...
```

### Issue: "Using wrong environment values"

**Cause**: Deploying with different stage than intended

**Solution**:
```bash
# Verify the stage in deployment command
npm run deploy:dev    # Uses .env.dev
npm run deploy:prod   # Uses .env.prod

# Check deployed environment
serverless info --stage dev
```

### Issue: "Variables not updating after change"

**Cause**: Need to redeploy after changing `.env` files

**Solution**:
```bash
# After editing .env.dev
npm run deploy:dev  # Redeploy to update Lambda config
```

---

## Best Practices

### 1. Environment File Structure

```bash
# development values
.env.dev

# Production values (create when ready to deploy to prod)
.env.prod

# Keep .env for local development only
.env
```

### 2. Never Mix Environments

```bash
# ❌ DON'T: Deploy dev with prod env file
serverless deploy --stage dev  # But .env.prod exists

# ✅ DO: Use matching env files
npm run deploy:dev   # Uses .env.dev
npm run deploy:prod  # Uses .env.prod
```

### 3. Validate Before Deployment

```bash
# Always run pre-deployment check
npm run predeploy:check:dev

# Review the output to ensure all variables are set
```

### 4. Stage-Specific Values

Keep different values for different stages:

```bash
# .env.dev
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://...dev...

# .env.prod
FRONTEND_URL=https://yourdomain.com
DATABASE_URL=postgresql://...prod...
```

---

## Summary

### Environment File Usage by Stage

| Stage | Command | Env File Used | Stack Name |
|-------|---------|---------------|------------|
| Development | `npm run deploy:dev` | `.env.dev` (fallback: `.env`) | `something-amazing-backend-dev` |
| Staging | `npm run deploy:staging` | `.env.staging` (fallback: `.env`) | `something-amazing-backend-staging` |
| Production | `npm run deploy:prod` | `.env.prod` (fallback: `.env`) | `something-amazing-backend-prod` |

### How Deployment Works

1. Run deployment command: `npm run deploy:dev`
2. Serverless Framework loads: `.env.dev`
3. Variables from `.env.dev` are read
4. `${env:VARIABLE}` in `serverless.yml` are replaced
5. Lambda function is deployed with environment variables
6. Variables are stored in AWS Lambda configuration
7. Your application can access them via `process.env.VARIABLE`

### Quick Reference

```bash
# Create env files
cp .env .env.dev
cp .env.prod.example .env.prod

# Update DATABASE_URL to port 6543

# Verify
npm run predeploy:check:dev

# Deploy
npm run deploy:dev
```

---

**Key Takeaway**: Environment variables are loaded from `.env.[stage]` files during deployment and stored in AWS Lambda configuration, not in your deployed code.
