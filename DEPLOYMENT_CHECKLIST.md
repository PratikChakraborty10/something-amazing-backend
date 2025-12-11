# AWS Lambda Deployment Checklist

Use this checklist to track your deployment progress.

## Phase 1: Prerequisites ✅

- [ ] AWS Account created and verified
- [ ] AWS CLI installed
  ```bash
  aws --version
  ```
- [ ] AWS credentials configured
  ```bash
  aws configure
  aws sts get-caller-identity
  ```
- [ ] Node.js 18+ installed
  ```bash
  node --version
  ```
- [ ] Serverless Framework CLI installed globally
  ```bash
  npm install -g serverless
  serverless --version
  ```

## Phase 2: Project Setup ✅

- [x] Lambda handler created (`src/lambda.ts`)
- [x] Serverless configuration created (`serverless.yml`)
- [x] Package.json updated with deployment scripts
- [x] Lambda dependencies installed
  - [x] `@vendia/serverless-express`
  - [x] `aws-lambda`
  - [x] `serverless`
  - [x] `serverless-offline`
  - [x] `@types/aws-lambda`
- [x] `.gitignore` updated for Serverless files

## Phase 3: Environment Configuration

- [ ] `.env.dev` created from `.env.dev.example`
- [ ] Database URL updated to use session pooler (port 6543)
  ```bash
  # Verify format:
  # postgresql://postgres.xxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
  ```
- [ ] All required environment variables set:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_JWT_SECRET`
  - [ ] `DATABASE_URL` (with session pooler!)
  - [ ] `FRONTEND_URL`
  - [ ] `AWS_SES_REGION`
  - [ ] `RESEND_API_KEY`

## Phase 4: Local Testing (Optional but Recommended)

- [ ] Build project successfully
  ```bash
  npm run build
  ```
- [ ] Test with serverless-offline
  ```bash
  npm run offline
  ```
- [ ] Verify API responds at `http://localhost:3001/api`
- [ ] Test a few endpoints locally

## Phase 5: Initial Deployment to Dev

- [ ] Deploy to AWS
  ```bash
  npm run deploy:dev
  ```
- [ ] Deployment completed without errors
- [ ] API Gateway endpoint URL received
- [ ] Save endpoint URL: `_______________________________________`

## Phase 6: Testing Deployed API

- [ ] Test health/root endpoint
  ```bash
  curl https://[YOUR-ENDPOINT].execute-api.us-east-1.amazonaws.com/api
  ```
- [ ] Test authentication endpoints
- [ ] Test domain endpoints
- [ ] Test campaigns endpoints
- [ ] Test contacts endpoints
- [ ] Verify database connectivity
- [ ] Check CloudWatch logs for errors
  ```bash
  npm run logs:dev
  ```

## Phase 7: Frontend Integration

- [ ] Update frontend environment variables with Lambda URL
  ```javascript
  NEXT_PUBLIC_API_URL=https://[YOUR-ENDPOINT].execute-api.region.amazonaws.com
  ```
- [ ] CORS working correctly
- [ ] All API calls functioning
- [ ] Authentication flow working
- [ ] File uploads working (if applicable)

## Phase 8: Custom Domain (Optional)

- [ ] SSL certificate requested/imported in ACM
- [ ] Certificate validated
- [ ] Custom domain configured in `serverless.yml`
- [ ] Redeploy with custom domain
- [ ] DNS CNAME record added
- [ ] Custom domain accessible
- [ ] Frontend updated with custom domain URL

## Phase 9: Production Setup

- [ ] `.env.prod` created with production values
- [ ] Production Supabase instance configured
- [ ] Production database verified
- [ ] AWS Parameter Store configured (recommended)
  ```bash
  # Store secrets in Parameter Store
  aws ssm put-parameter --name "/something-amazing/prod/DATABASE_URL" --value "..." --type "SecureString"
  ```
- [ ] `serverless.yml` updated to use Parameter Store (if using)
- [ ] Deploy to production
  ```bash
  npm run deploy:prod
  ```
- [ ] Production endpoint saved: `_______________________________________`
- [ ] Production thoroughly tested

## Phase 10: Monitoring & Alerts

- [ ] CloudWatch logs verified
  ```bash
  npm run logs:prod
  ```
- [ ] CloudWatch alarms created
  - [ ] Lambda errors alarm
  - [ ] Lambda duration alarm
  - [ ] API Gateway 4xx/5xx alarms
- [ ] X-Ray tracing enabled (optional)
- [ ] SNS topic for alerts created
- [ ] Email notifications configured

## Phase 11: CI/CD Setup (Optional)

- [ ] GitHub Actions workflow file reviewed (`.github/workflows/deploy.yml`)
- [ ] GitHub Secrets configured:
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] All staging environment variables (prefixed with `STAGING_`)
  - [ ] All production environment variables (prefixed with `PROD_`)
- [ ] Test workflow with push to `develop` branch
- [ ] Verify automatic deployment to staging
- [ ] Test workflow with push to `main` branch
- [ ] Verify automatic deployment to production

## Phase 12: Documentation & Handoff

- [ ] Document API Gateway endpoints
- [ ] Document deployment process for team
- [ ] Share CloudWatch dashboard (if created)
- [ ] Document rollback procedure
- [ ] Create incident response plan
- [ ] Train team on monitoring and troubleshooting

## Phase 13: Cost Optimization

- [ ] Review CloudWatch metrics for optimal memory size
- [ ] Adjust `memorySize` in `serverless.yml` if needed
- [ ] Consider provisioned concurrency for high-traffic endpoints
- [ ] Set up AWS Budget alerts
- [ ] Review and optimize package size
  ```bash
  # Check deployment package size
  du -sh .serverless/*.zip
  ```
- [ ] Enable CloudWatch Logs retention policies

## Common Commands Reference

```bash
# Development
npm run deploy:dev          # Deploy to dev
npm run logs:dev           # View dev logs
npm run remove:dev         # Remove dev deployment

# Staging
npm run deploy:staging     # Deploy to staging
npm run logs:staging       # View staging logs
npm run remove:staging     # Remove staging deployment

# Production
npm run deploy:prod        # Deploy to production
npm run logs:prod          # View production logs
npm run remove:prod        # Remove production deployment

# General
npm run offline            # Test locally
npm run info               # Get deployment info
serverless invoke -f api   # Invoke function directly
```

## Troubleshooting Checklist

If something goes wrong:

- [ ] Check CloudWatch logs: `npm run logs:dev`
- [ ] Verify environment variables in Lambda console
- [ ] Check database connection (session pooler URL?)
- [ ] Verify IAM permissions for Lambda role
- [ ] Check CORS configuration
- [ ] Review API Gateway settings
- [ ] Test with verbose logging: `serverless deploy --verbose`
- [ ] Check AWS service quotas/limits
- [ ] Verify Node.js runtime version compatibility

## Rollback Procedure

If you need to rollback:

```bash
# List previous deployments
serverless deploy list --stage prod

# Rollback to previous version
serverless rollback --timestamp [TIMESTAMP] --stage prod
```

## Success Criteria

Deployment is successful when:

- ✅ All API endpoints respond correctly
- ✅ Database connections work without errors
- ✅ Frontend can communicate with backend
- ✅ Authentication flow works end-to-end
- ✅ Email sending (SES/Resend) works
- ✅ No errors in CloudWatch logs
- ✅ Response times are acceptable (< 3s)
- ✅ Monitoring and alerts are active

---

**Note**: Check off items as you complete them. Feel free to add custom items specific to your deployment needs.

Last Updated: 2025-12-10
