# 🚀 Environment Variables During Deployment - Visual Guide

## Quick Answer

```mermaid
graph TB
    A[npm run deploy:dev] --> B{Serverless Framework}
    B --> C[Loads .env.dev]
    C --> D[Reads Variables]
    D --> E[Injects into serverless.yml]
    E --> F[Deploys to AWS Lambda]
    F --> G[Variables stored in Lambda config]
    
    H[npm run deploy:staging] --> I{Serverless Framework}
    I --> J[Loads .env.staging]
    J --> D
    
    K[npm run deploy:prod] --> L{Serverless Framework}
    L --> M[Loads .env.prod]
    M --> D
    
    style C fill:#4ecdc4
    style J fill:#ffe66d
    style M fill:#ff6b6b
```

## Which File is Loaded?

| Deployment Command | Environment File Loaded | AWS Stack Name | Lambda Function Name |
|-------------------|------------------------|----------------|---------------------|
| `npm run deploy:dev` | `.env.dev` → `.env` | `something-amazing-backend-dev` | `something-amazing-backend-dev-api` |
| `npm run deploy:staging` | `.env.staging` → `.env` | `something-amazing-backend-staging` | `something-amazing-backend-staging-api` |
| `npm run deploy:prod` | `.env.prod` → `.env` | `something-amazing-backend-prod` | `something-amazing-backend-prod-api` |

> **Note**: The `→` means "falls back to" if the first file doesn't exist.

## File Structure

```
something-amazing-backend/
├── .env                    # ← Local development only (NOT used in Lambda)
├── .env.dev               # ← Used when: npm run deploy:dev
├── .env.staging           # ← Used when: npm run deploy:staging
├── .env.prod              # ← Used when: npm run deploy:prod
├── .env.dev.example       # ← Template (committed to git)
├── .env.prod.example      # ← Template (committed to git)
└── serverless.yml         # ← Has: useDotenv: true (auto-loads .env files)
```

## Setup Steps

### 1️⃣ Create Development Environment File

```bash
# Copy your existing .env to .env.dev
cp .env .env.dev

# ⚠️ IMPORTANT: Update DATABASE_URL to use session pooler (port 6543)
nano .env.dev  # or use your text editor
```

In `.env.dev`, change:
```diff
- DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
+ DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

### 2️⃣ Verify Environment File

```bash
# Run pre-deployment check
npm run predeploy:check:dev
```

This checks:
- ✓ `.env.dev` exists
- ✓ All required variables are set
- ✓ DATABASE_URL uses port 6543 (session pooler)

### 3️⃣ Deploy

```bash
# This will automatically load .env.dev
npm run deploy:dev
```

## How It Works

### Serverless.yml Configuration

```yaml
# In serverless.yml
useDotenv: true  # ← This enables automatic .env file loading

provider:
  stage: ${opt:stage, 'dev'}
  environment:
    SUPABASE_URL: ${env:SUPABASE_URL}        # ← Read from .env.dev
    DATABASE_URL: ${env:DATABASE_URL}        # ← Read from .env.dev
    FRONTEND_URL: ${env:FRONTEND_URL}        # ← Read from .env.dev
```

### Deployment Flow

```
1. You run: npm run deploy:dev
   ↓
2. Serverless sees: --stage dev
   ↓
3. Serverless looks for: .env.dev
   ↓
4. Loads all variables from .env.dev
   ↓
5. Replaces ${env:VARIABLE} in serverless.yml
   ↓
6. Deploys Lambda with environment variables
   ↓
7. Variables are stored in AWS Lambda configuration
   ↓
8. Your NestJS app accesses them via process.env.VARIABLE
```

## Production Deployment

### 1️⃣ Create Production Environment File

```bash
# Copy from template
cp .env.prod.example .env.prod

# Edit with production values
nano .env.prod
```

### 2️⃣ Update with Production Values

```bash
# .env.prod should have:
SUPABASE_URL=https://your-production-project.supabase.co
DATABASE_URL=postgresql://...@aws-0-region.pooler.supabase.com:6543/postgres
FRONTEND_URL=https://yourdomain.com  # ← Your production frontend
```

### 3️⃣ Deploy to Production

```bash
# Check production configuration
npm run predeploy:check:prod

# Deploy to production
npm run deploy:prod
```

## Verification

### Check Which Environment is Used

```bash
# After deployment, get info
serverless info --stage dev

# Output shows:
# Service: something-amazing-backend
# Stage: dev                    # ← This is the stage
# Stack: something-amazing-backend-dev
```

### Check Lambda Environment Variables

1. Go to AWS Console
2. Navigate to: Lambda → Functions
3. Select: `something-amazing-backend-dev-api`
4. Click: Configuration → Environment variables
5. Verify your variables are there

### Test Environment Variables

```bash
# View logs to see if variables are loaded correctly
npm run logs:dev

# You should see successful database connections
```

## Common Questions

### Q: Can I use .env instead of .env.dev?

**A**: Yes! If `.env.dev` doesn't exist, Serverless falls back to `.env`. However, it's better to use `.env.dev` to separate local development from Lambda deployment.

### Q: What if I have both .env and .env.dev?

**A**: `.env.dev` takes priority when deploying with `--stage dev`.

### Q: Do I need to redeploy after changing .env.dev?

**A**: Yes! Environment variables are loaded during deployment. If you change `.env.dev`, run `npm run deploy:dev` again.

### Q: Are .env files deployed to AWS?

**A**: No! Only the **values** are deployed. The `.env` files stay on your machine. Values are stored in AWS Lambda configuration.

### Q: How do I change variables in production?

**Option 1**: Update `.env.prod` and redeploy
```bash
npm run deploy:prod
```

**Option 2**: Update directly in AWS Console (quick fix)
```
Lambda → Configuration → Environment variables → Edit
```

Then redeploy later to keep `.env.prod` in sync.

## Security Best Practices

### ✅ DO

- ✅ Keep `.env.dev` and `.env.prod` on your local machine only
- ✅ Use different values for dev and prod
- ✅ Store production secrets in AWS Secrets Manager (advanced)
- ✅ Use session pooler (port 6543) for database

### ❌ DON'T

- ❌ Commit `.env.dev` or `.env.prod` to Git
- ❌ Share `.env` files via email or Slack
- ❌ Use the same database for dev and prod
- ❌ Use direct connection (port 5432) for Lambda

## Troubleshooting

### Problem: "Environment variable not found"

```bash
# Check if variable exists in .env.dev
cat .env.dev | grep VARIABLE_NAME

# Check if it matches serverless.yml
# Look for: ${env:VARIABLE_NAME}
```

### Problem: "Wrong database connection"

```bash
# Verify which .env file is being used
npm run predeploy:check:dev

# Check DATABASE_URL in .env.dev
cat .env.dev | grep DATABASE_URL

# Should have port 6543, not 5432
```

### Problem: "Variables not updated after change"

```bash
# Redeploy after changing .env files
npm run deploy:dev
```

## Summary

```bash
# 📝 Create environment file
cp .env .env.dev

# ⚙️ Update DATABASE_URL to port 6543

# ✅ Verify setup
npm run predeploy:check:dev

# 🚀 Deploy (automatically loads .env.dev)
npm run deploy:dev

# 📊 Check logs
npm run logs:dev
```

---

For more details, see: **[ENV_DEPLOYMENT_GUIDE.md](./ENV_DEPLOYMENT_GUIDE.md)**
