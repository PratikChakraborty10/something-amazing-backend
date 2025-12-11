# AWS Lambda Deployment Guide for NestJS Backend

This comprehensive guide will walk you through deploying your NestJS backend application to AWS Lambda using the Serverless Framework. This approach provides automatic scaling, pay-per-use pricing, and seamless integration with other AWS services.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Installation & Setup](#installation--setup)
4. [Project Configuration](#project-configuration)
5. [Environment Variables](#environment-variables)
6. [Database Considerations](#database-considerations)
7. [Deployment Steps](#deployment-steps)
8. [Post-Deployment](#post-deployment)
9. [Monitoring & Debugging](#monitoring--debugging)
10. [CI/CD Integration](#cicd-integration)
11. [Cost Optimization](#cost-optimization)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following:

### Required Tools
- **Node.js** (v18.x or v20.x recommended for AWS Lambda)
- **npm** or **yarn** package manager
- **AWS CLI** configured with appropriate credentials
- **Serverless Framework** CLI

### AWS Account Requirements
- AWS Account with appropriate permissions
- IAM user with the following permissions:
  - Lambda (create, update, invoke)
  - API Gateway (create, update)
  - CloudFormation (create, update, delete stacks)
  - S3 (create buckets, upload objects)
  - CloudWatch Logs (create log groups)
  - IAM (create roles for Lambda execution)

### Install Serverless Framework

```bash
npm install -g serverless
```

Verify installation:

```bash
serverless --version
```

---

## Architecture Overview

```mermaid
graph TB
    Client[Client/Frontend] --> APIGW[API Gateway]
    APIGW --> Lambda[AWS Lambda<br/>NestJS App]
    Lambda --> Supabase[Supabase PostgreSQL]
    Lambda --> SES[AWS SES]
    Lambda --> Resend[Resend API]
    Lambda --> CW[CloudWatch Logs]
    
    style Lambda fill:#ff9900
    style APIGW fill:#ff4f8b
    style Supabase fill:#3ecf8e
    style SES fill:#ff9900
```

### Key Components

1. **API Gateway**: HTTP API endpoint that routes requests to Lambda
2. **AWS Lambda**: Serverless compute running your NestJS application
3. **Supabase**: PostgreSQL database (external, managed)
4. **AWS SES**: Email sending service for domain verification
5. **Resend**: Email marketing service
6. **CloudWatch**: Logging and monitoring

---

## Installation & Setup

### Step 1: Install Required Dependencies

```bash
# Navigate to your project directory
cd /Users/pratikchakraborty/Documents/something-amazing-backend

# Install Serverless Framework dependencies
npm install --save-dev serverless serverless-offline

# Install AWS Lambda adapter for NestJS
npm install --save aws-serverless-express @vendia/serverless-express

# Install type definitions
npm install --save-dev @types/aws-lambda
```

### Step 2: Configure AWS CLI

If you haven't configured AWS CLI yet:

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`, `ap-south-1`)
- Default output format (e.g., `json`)

Verify configuration:

```bash
aws sts get-caller-identity
```

---

## Project Configuration

### Step 3: Create Lambda Handler

Create a new file `src/lambda.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import serverlessExpress from '@vendia/serverless-express';
import { Handler, Context } from 'aws-lambda';
import express from 'express';

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  if (!cachedServer) {
    const expressApp = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn', 'log'] }
    );

    // Enable CORS
    nestApp.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    });

    // Global API prefix
    nestApp.setGlobalPrefix('api');

    // Global validation pipe
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await nestApp.init();

    cachedServer = serverlessExpress({ app: expressApp });
  }

  return cachedServer;
}

export const handler: Handler = async (event: any, context: Context) => {
  // Set callbackWaitsForEmptyEventLoop to false to allow connections to be reused
  context.callbackWaitsForEmptyEventLoop = false;

  const server = await bootstrapServer();
  return server(event, context);
};
```

### Step 4: Create Serverless Configuration

Create `serverless.yml` in your project root:

```yaml
service: something-amazing-backend

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'us-east-1'}
  memorySize: 512
  timeout: 30
  
  # Environment variables for all functions
  environment:
    NODE_ENV: production
    SUPABASE_URL: ${env:SUPABASE_URL}
    SUPABASE_ANON_KEY: ${env:SUPABASE_ANON_KEY}
    SUPABASE_SERVICE_ROLE_KEY: ${env:SUPABASE_SERVICE_ROLE_KEY}
    SUPABASE_JWT_SECRET: ${env:SUPABASE_JWT_SECRET}
    DATABASE_URL: ${env:DATABASE_URL}
    FRONTEND_URL: ${env:FRONTEND_URL}
    AWS_SES_REGION: ${env:AWS_SES_REGION, 'us-east-1'}
    RESEND_API_KEY: ${env:RESEND_API_KEY}
  
  # IAM Role Statements
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - ses:SendEmail
            - ses:SendRawEmail
            - ses:VerifyDomainIdentity
            - ses:GetIdentityVerificationAttributes
            - ses:DeleteIdentity
          Resource: '*'
        - Effect: Allow
          Action:
            - logs:CreateLogGroup
            - logs:CreateLogStream
            - logs:PutLogEvents
          Resource: '*'

  # API Gateway configuration
  httpApi:
    cors:
      allowedOrigins:
        - ${env:FRONTEND_URL, '*'}
      allowedHeaders:
        - Content-Type
        - Authorization
        - X-Amz-Date
        - X-Api-Key
        - X-Amz-Security-Token
      allowedMethods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      allowCredentials: true

functions:
  api:
    handler: dist/lambda.handler
    events:
      - httpApi:
          path: /{proxy+}
          method: ANY
      - httpApi:
          path: /
          method: ANY
    # VPC configuration (uncomment if your database is in VPC)
    # vpc:
    #   securityGroupIds:
    #     - sg-xxxxxxxxx
    #   subnetIds:
    #     - subnet-xxxxxxxxx
    #     - subnet-yyyyyyyyy

plugins:
  - serverless-offline

# Package configuration
package:
  individually: false
  excludeDevDependencies: true
  patterns:
    - '!node_modules/@types/**'
    - '!node_modules/typescript/**'
    - '!node_modules/ts-node/**'
    - '!node_modules/@typescript-eslint/**'
    - '!node_modules/eslint/**'
    - '!node_modules/prettier/**'
    - '!node_modules/jest/**'
    - '!src/**'
    - '!test/**'
    - '!.git/**'
    - '!.env*'
    - '!*.md'
    - 'dist/**'
    - 'node_modules/**'

# Custom configuration
custom:
  serverless-offline:
    httpPort: 3001
    noPrependStageInUrl: true
```

### Step 5: Update package.json Scripts

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "nest build",
    "build:lambda": "nest build && npm prune --production",
    "deploy": "npm run build && serverless deploy",
    "deploy:dev": "npm run build && serverless deploy --stage dev",
    "deploy:staging": "npm run build && serverless deploy --stage staging",
    "deploy:prod": "npm run build && serverless deploy --stage prod",
    "remove": "serverless remove",
    "logs": "serverless logs -f api -t",
    "info": "serverless info",
    "offline": "serverless offline"
  }
}
```

### Step 6: Update TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "esModuleInterop": true
  }
}
```

---

## Environment Variables

### Step 7: Configure Environment Variables

> [!IMPORTANT]
> **NEVER commit `.env` files to version control**. Use AWS Systems Manager Parameter Store or AWS Secrets Manager for production.

#### Development/Staging Environment

Create a `.env.dev` or `.env.staging` file with:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database (Supabase PostgreSQL with Session Pooler)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# AWS SES
AWS_SES_REGION=us-east-1

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Port (only for local development)
PORT=3001
```

#### Production Environment

For production, use AWS Systems Manager Parameter Store:

```bash
# Store sensitive values in Parameter Store
aws ssm put-parameter \
  --name "/something-amazing/prod/DATABASE_URL" \
  --value "postgresql://..." \
  --type "SecureString" \
  --region us-east-1

aws ssm put-parameter \
  --name "/something-amazing/prod/SUPABASE_SERVICE_ROLE_KEY" \
  --value "your-key" \
  --type "SecureString" \
  --region us-east-1

# Repeat for all sensitive variables
```

Update `serverless.yml` to fetch from Parameter Store:

```yaml
provider:
  environment:
    DATABASE_URL: ${ssm:/something-amazing/${self:provider.stage}/DATABASE_URL}
    SUPABASE_SERVICE_ROLE_KEY: ${ssm:/something-amazing/${self:provider.stage}/SUPABASE_SERVICE_ROLE_KEY~true}
    # Add other variables
```

---

## Database Considerations

### Connection Pooling

> [!WARNING]
> Lambda functions are stateless and can spawn many concurrent instances. Without proper connection pooling, you'll exhaust your database connections.

#### Supabase Session Pooler (Recommended)

Use Supabase's session pooler for Lambda:

1. Go to Supabase Dashboard → Settings → Database
2. Find "Session Pooler" connection string
3. Use port `6543` instead of `5432`

```bash
# Use this format
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

#### TypeORM Configuration for Lambda

Update your `app.module.ts` TypeORM configuration:

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    url: configService.get('DATABASE_URL'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false, // NEVER use true in production
    logging: process.env.NODE_ENV === 'development',
    ssl: {
      rejectUnauthorized: false, // Required for Supabase
    },
    // Lambda-specific settings
    extra: {
      max: 2, // Maximum 2 connections per Lambda instance
      min: 0, // No minimum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    },
  }),
  inject: [ConfigService],
}),
```

### Alternative: RDS Proxy

For Amazon RDS, consider using RDS Proxy:

1. Creates a connection pool
2. Handles authentication via IAM
3. Reduces database load

---

## Deployment Steps

### Step 8: Build and Deploy

#### First-Time Deployment

```bash
# 1. Install all dependencies
npm install

# 2. Build the project
npm run build

# 3. Test locally with serverless-offline (optional)
npm run offline

# 4. Deploy to AWS (development stage)
npm run deploy:dev
```

#### Deploy to Specific Stages

```bash
# Development
npm run deploy:dev

# Staging
npm run deploy:staging

# Production
npm run deploy:prod
```

#### Manual Deployment

```bash
# Build
nest build

# Deploy with specific region and stage
serverless deploy --stage prod --region us-east-1 --verbose
```

### Step 9: Verify Deployment

After deployment completes, you'll see output like:

```
✔ Service deployed to stack something-amazing-backend-dev (92s)

endpoints:
  ANY - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/{proxy+}
  ANY - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
functions:
  api: something-amazing-backend-dev-api (45 MB)
```

Test your API:

```bash
# Health check
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/api

# Test an endpoint (example)
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/api/health
```

---

## Post-Deployment

### Step 10: Update Frontend Configuration

Update your frontend's API endpoint to point to the Lambda URL:

```javascript
// In your frontend .env
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

### Step 11: Configure Custom Domain (Optional but Recommended)

#### Using API Gateway Custom Domain

1. **Certificate Manager**: Create or import SSL certificate in ACM
   ```bash
   # Request certificate
   aws acm request-certificate \
     --domain-name api.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Add to serverless.yml**:
   ```yaml
   provider:
     httpApi:
       domain:
         domainName: api.yourdomain.com
         certificateArn: arn:aws:acm:region:account:certificate/xxxxx
   ```

3. **Configure DNS**: Add CNAME record pointing to API Gateway domain

### Step 12: Set Up CloudWatch Alarms

Create alarms for monitoring:

```bash
# Example: Lambda errors alarm
aws cloudwatch put-metric-alarm \
  --alarm-name something-amazing-lambda-errors \
  --alarm-description "Alert on Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=something-amazing-backend-prod-api
```

---

## Monitoring & Debugging

### View Logs

```bash
# View real-time logs
serverless logs -f api -t

# View logs for specific stage
serverless logs -f api --stage prod -t

# Using AWS CLI
aws logs tail /aws/lambda/something-amazing-backend-prod-api --follow
```

### CloudWatch Insights Queries

Navigate to CloudWatch → Logs Insights and use:

```
# Find errors
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

# Find slow requests (>3 seconds)
fields @timestamp, @message, @duration
| filter @duration > 3000
| sort @duration desc
| limit 50
```

### Enable X-Ray Tracing

Update `serverless.yml`:

```yaml
provider:
  tracing:
    lambda: true
    apiGateway: true
```

Install X-Ray SDK:

```bash
npm install aws-xray-sdk-core
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS Lambda

on:
  push:
    branches:
      - main
      - develop
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: npm run deploy:staging
      
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: npm run deploy:prod
```

### Required GitHub Secrets

Add to your repository settings → Secrets and variables → Actions:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- All environment variables from `.env`

---

## Cost Optimization

### Lambda Pricing Breakdown

AWS Lambda pricing (as of 2024):
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second
- **Free Tier**: 1M requests + 400,000 GB-seconds per month

### Optimization Strategies

1. **Right-size Memory**:
   ```yaml
   # Test different memory sizes
   provider:
     memorySize: 512  # Start here, adjust based on CloudWatch metrics
   ```

2. **Enable Code Minification**:
   ```bash
   npm install --save-dev terser-webpack-plugin
   ```

3. **Use Provisioned Concurrency** (if needed):
   ```yaml
   functions:
     api:
       provisionedConcurrency: 2  # Keep 2 instances warm
   ```

4. **Optimize Cold Starts**:
   - Keep dependencies minimal
   - Use Lambda layers for shared dependencies
   - Implement connection caching (already done in `lambda.ts`)

### Estimated Monthly Costs

For reference (adjust based on your usage):

| Metric | Amount | Cost |
|--------|--------|------|
| Requests | 1M/month | Free Tier |
| Duration (512MB, 500ms avg) | 250,000 GB-seconds | Free Tier |
| Additional 9M requests | 9M | ~$1.80 |
| API Gateway | 10M requests | ~$10.00 |
| **Total** | | **~$11.80/month** |

---

## Troubleshooting

### Common Issues

#### 1. **Lambda Timeout**

**Error**: Task timed out after 30.00 seconds

**Solution**: Increase timeout in `serverless.yml`:
```yaml
provider:
  timeout: 60  # Increase to 60 seconds
```

#### 2. **Database Connection Errors**

**Error**: `error: remaining connection slots reserved for non-replication superuser connections`

**Solution**: Use Supabase session pooler (port 6543)

#### 3. **Cold Start Performance**

**Issue**: First request is very slow

**Solutions**:
- Enable provisioned concurrency
- Reduce package size
- Optimize imports (use tree-shaking)

#### 4. **Environment Variables Not Found**

**Error**: `Cannot find environment variable`

**Solution**: Ensure all variables are set in `serverless.yml` or Parameter Store

#### 5. **CORS Errors**

**Error**: `Access-Control-Allow-Origin header`

**Solution**: Verify `FRONTEND_URL` in environment variables and CORS configuration in both `serverless.yml` and `lambda.ts`

### Debug Mode Deployment

```bash
# Deploy with verbose logging
serverless deploy --verbose --debug

# Check function configuration
serverless info --verbose

# Invoke function directly for testing
serverless invoke -f api --log
```

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Local development
npm run start:dev

# Build for Lambda
npm run build

# Test locally with serverless-offline
npm run offline

# Deploy to dev
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# View logs (real-time)
serverless logs -f api -t --stage prod

# Get deployment info
serverless info --stage prod

# Remove deployment
serverless remove --stage dev

# Invoke function directly
serverless invoke -f api --stage prod --log

# Check package size
du -sh .serverless/*.zip
```

---

## Security Checklist

- [ ] **Environment Variables**: Never commit secrets to version control
- [ ] **IAM Roles**: Use least-privilege principle
- [ ] **Database**: Use connection pooling, SSL enabled
- [ ] **API Gateway**: Enable throttling and request validation
- [ ] **CORS**: Configure specific origins, not `*` in production
- [ ] **Dependencies**: Regularly update and audit (`npm audit`)
- [ ] **Logging**: Don't log sensitive information
- [ ] **Secrets**: Use AWS Secrets Manager or Parameter Store
- [ ] **VPC**: Consider VPC for enhanced security (if needed)
- [ ] **Rate Limiting**: Implement application-level rate limiting

---

## Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

---

## Next Steps

1. ✅ Complete Prerequisites
2. ✅ Install Dependencies
3. ✅ Configure `serverless.yml`
4. ✅ Create Lambda Handler
5. ✅ Set Environment Variables
6. ✅ Test Locally
7. ✅ Deploy to Dev
8. ✅ Test Deployed API
9. ✅ Configure Custom Domain
10. ✅ Set Up Monitoring
11. ✅ Deploy to Production

---

## Support

If you encounter any issues during deployment:

1. Check CloudWatch Logs for detailed error messages
2. Review the Troubleshooting section
3. Verify all environment variables are correctly set
4. Test locally with `serverless offline` first
5. Use `--verbose` flag for detailed deployment logs

Good luck with your deployment! 🚀
