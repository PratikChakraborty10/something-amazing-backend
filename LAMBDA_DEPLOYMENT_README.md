# 🚀 AWS Lambda Deployment Guide - Quick Access

This directory contains comprehensive documentation for deploying your NestJS backend to AWS Lambda.

## 📚 Documentation Index

### 🎯 Start Here

1. **[QUICK_START_LAMBDA.md](./QUICK_START_LAMBDA.md)** ⭐
   - **Deploy in 5 minutes**
   - Essential steps only
   - Perfect for getting started quickly
   - **Start here if you want to deploy NOW**

2. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** ✅
   - Complete deployment checklist
   - Track your progress through 13 phases
   - Don't miss any critical steps
   - **Use this to ensure nothing is forgotten**

### 📖 Comprehensive Guides

3. **[AWS_LAMBDA_DEPLOYMENT.md](./AWS_LAMBDA_DEPLOYMENT.md)** 📘
   - **Complete deployment documentation** (30+ pages)
   - Detailed explanations for every step
   - Architecture diagrams
   - Troubleshooting guides
   - Cost optimization
   - CI/CD setup
   - Monitoring and debugging
   - **Reference this when you need detailed information**

### ⚙️ Configuration Files

4. **[serverless.yml](./serverless.yml)**
   - Serverless Framework configuration
   - Lambda function settings
   - API Gateway configuration
   - IAM permissions
   - Environment variables

5. **[src/lambda.ts](./src/lambda.ts)**
   - Lambda handler implementation
   - NestJS adapter for serverless
   - Connection caching

6. **[.github/workflows/deploy.yml](./.github/workflows/deploy.yml)**
   - GitHub Actions CI/CD workflow
   - Automatic deployment on push
   - Separate dev/staging/prod environments

### 📋 Environment Templates

7. **[ENV_VISUAL_GUIDE.md](./ENV_VISUAL_GUIDE.md)** 🎯 **NEW!**
   - **Which .env file is used during deployment?**
   - Visual diagrams and tables
   - Step-by-step environment setup
   - **Read this first if confused about environment variables**

8. **[ENV_DEPLOYMENT_GUIDE.md](./ENV_DEPLOYMENT_GUIDE.md)** 📖 **NEW!**
   - Complete environment variables deployment guide
   - How variables are loaded and deployed
   - Security best practices
   - Troubleshooting environment issues

9. **[.env.dev.example](./.env.dev.example)**
   - Development environment template
   - Use for dev/staging deployments

10. **[.env.prod.example](./.env.prod.example)**
    - Production environment template
    - Security best practices included

## 🏃 Quick Commands

```bash
# Install dependencies (already done!)
npm install

# Local testing
npm run offline              # Test locally with serverless-offline

# Build
npm run build                # Build the NestJS application

# Deploy
npm run deploy:dev           # Deploy to development
npm run deploy:staging       # Deploy to staging
npm run deploy:prod          # Deploy to production

# Monitor
npm run logs:dev             # View development logs
npm run logs:staging         # View staging logs
npm run logs:prod            # View production logs

# Info
serverless info --stage dev  # Get deployment information

# Remove
npm run remove:dev           # Remove development deployment
```

## 📊 Deployment Flow

```mermaid
graph LR
    A[Prerequisites] --> B[Install Dependencies]
    B --> C[Configure Environment]
    C --> D[Test Locally]
    D --> E[Deploy to Dev]
    E --> F[Test Deployed API]
    F --> G[Update Frontend]
    G --> H[Deploy to Production]
    H --> I[Monitor & Optimize]
    
    style A fill:#ff6b6b
    style E fill:#4ecdc4
    style H fill:#95e1d3
    style I fill:#f38181
```

## ✨ What's Included

### Already Set Up For You ✅

- [x] Lambda handler (`src/lambda.ts`)
- [x] Serverless configuration (`serverless.yml`)
- [x] TypeScript support
- [x] Connection caching for optimal performance
- [x] CORS configuration
- [x] Validation pipes
- [x] Environment variable management
- [x] Deployment scripts in `package.json`
- [x] GitHub Actions workflow
- [x] Development dependencies installed

### You Need to Provide ⚠️

- [ ] AWS credentials (`aws configure`)
- [ ] Environment variables (`.env.dev`, `.env.prod`)
- [ ] Supabase session pooler URL (port 6543)

## 🎓 Recommended Path

### For First-Time Deployment

1. Read **[QUICK_START_LAMBDA.md](./QUICK_START_LAMBDA.md)** (5 min)
2. Follow the quick start steps
3. Use **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** to track progress
4. Refer to **[AWS_LAMBDA_DEPLOYMENT.md](./AWS_LAMBDA_DEPLOYMENT.md)** for details when needed

### For Production Deployment

1. Complete development deployment first
2. Read sections 7-10 in **[AWS_LAMBDA_DEPLOYMENT.md](./AWS_LAMBDA_DEPLOYMENT.md)**:
   - Environment Variables (secure secrets management)
   - Database Considerations (connection pooling)
   - Post-Deployment (custom domains, monitoring)
3. Follow **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** Phase 9-12
4. Set up CI/CD with GitHub Actions

### For Team Onboarding

1. Overview from this README
2. **[AWS_LAMBDA_DEPLOYMENT.md](./AWS_LAMBDA_DEPLOYMENT.md)** sections 1-2 (Prerequisites, Architecture)
3. Quick Commands reference (above)
4. Monitoring section in main guide

## 🔧 Key Configuration Points

### Database Connection - CRITICAL ⚠️

```bash
# ✅ CORRECT - Session Pooler (port 6543)
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres

# ❌ WRONG - Direct Connection (port 5432) - will cause issues
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### CORS Configuration

```yaml
# In serverless.yml
httpApi:
  cors:
    allowedOrigins:
      - ${env:FRONTEND_URL}
```

### Memory & Timeout

```yaml
# In serverless.yml
provider:
  memorySize: 512   # Start here, optimize later
  timeout: 30       # Increase if needed
```

## 📈 Monitoring

After deployment:

```bash
# View logs in real-time
npm run logs:prod

# Get deployment info
serverless info --stage prod

# CloudWatch Logs
# Navigate to: AWS Console -> CloudWatch -> Log Groups -> /aws/lambda/something-amazing-backend-prod-api
```

## 💰 Cost Estimate

| Service | Free Tier | Small App Cost |
|---------|-----------|----------------|
| Lambda Requests | 1M/month | ~$2/month |
| Lambda Compute | 400k GB-seconds | ~$0 |
| API Gateway | - | ~$10/month |
| **Total** | **First 1M requests free** | **~$12/month** |

## 🆘 Troubleshooting

### Quick fixes for common issues:

1. **Deployment fails**: `serverless deploy --verbose --stage dev`
2. **Database errors**: Check session pooler URL (port 6543)
3. **CORS errors**: Verify `FRONTEND_URL` environment variable
4. **Timeout errors**: Increase timeout in `serverless.yml`
5. **Logs**: `npm run logs:dev` or check CloudWatch Console

See **[AWS_LAMBDA_DEPLOYMENT.md](./AWS_LAMBDA_DEPLOYMENT.md)** section 12 for detailed troubleshooting.

## 🔐 Security Checklist

- [ ] Never commit `.env` files
- [ ] Use AWS Parameter Store/Secrets Manager for production
- [ ] Configure specific CORS origins (not `*`)
- [ ] Enable CloudWatch logging
- [ ] Set up IAM with least privilege
- [ ] Enable API throttling
- [ ] Regular dependency updates (`npm audit`)

## 📞 Support Resources

- **AWS Lambda Docs**: https://docs.aws.amazon.com/lambda/
- **Serverless Framework**: https://www.serverless.com/framework/docs
- **NestJS Docs**: https://docs.nestjs.com/
- **Supabase Pooling**: https://supabase.com/docs/guides/database/connecting-to-postgres

## 🎯 Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Update frontend with Lambda URL
3. ✅ Set up CloudWatch alarms
4. ✅ Configure custom domain (optional)
5. ✅ Set up CI/CD
6. ✅ Monitor costs and optimize
7. ✅ Document for your team

---

## 🚀 Ready to Deploy?

```bash
# Quick deployment command
npm run deploy:dev
```

**Good luck with your deployment!** 🎉

If you run into issues, check the documentation or review CloudWatch logs.

---

*Last Updated: December 10, 2025*
*Version: 1.0.0*
