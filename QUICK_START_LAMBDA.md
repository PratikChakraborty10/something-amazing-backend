# Quick Start: Deploy to AWS Lambda in 5 Minutes

This is a condensed guide to get you up and running quickly. For comprehensive documentation, see [AWS_LAMBDA_DEPLOYMENT.md](./AWS_LAMBDA_DEPLOYMENT.md).

## Prerequisites Checklist

- [ ] AWS Account created
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Node.js 18+ installed
- [ ] Serverless Framework CLI installed globally (`npm install -g serverless`)

## Quick Deployment Steps

### 1. Verify AWS Configuration

```bash
aws sts get-caller-identity
```

If this fails, run `aws configure` and enter your AWS credentials.

### 2. Install Dependencies

```bash
npm install
```

All required Lambda dependencies are already installed!

### 3. Configure Environment Variables

> [!IMPORTANT]
> **Which .env file is used during deployment?**
> - Development: `.env.dev` (or falls back to `.env`)
> - Staging: `.env.staging`
> - Production: `.env.prod`
>
> See **[ENV_DEPLOYMENT_GUIDE.md](./ENV_DEPLOYMENT_GUIDE.md)** for complete details on how environment variables are loaded and deployed.

> [!IMPORTANT]
> **NEVER commit `.env` files to version control**. Use AWS Systems Manager Parameter Store or AWS Secrets Manager for production.

### 4. Create Environment File

Create a `.env.dev` file in your project root:

```bash
# Copy from example and fill in your values
cp .env .env.dev
```

Make sure your `.env.dev` contains:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL` (use Supabase session pooler URL with port 6543)
- `FRONTEND_URL`
- `AWS_SES_REGION`
- `RESEND_API_KEY`

### 4. Test Locally (Optional)

```bash
# Start serverless-offline
npm run offline
```

Visit `http://localhost:3001/api` to test your API locally.

### 5. Deploy to AWS

```bash
# Deploy to development
npm run deploy:dev
```

Wait for deployment to complete (usually 1-2 minutes).

### 6. Test Your Deployed API

After deployment, you'll see output like:

```
endpoints:
  ANY - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/{proxy+}
```

Test it:

```bash
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/api
```

## Common Commands

```bash
# Deploy to different stages
npm run deploy:dev        # Development
npm run deploy:staging    # Staging
npm run deploy:prod       # Production

# View real-time logs
npm run logs:dev          # Dev logs
npm run logs:prod         # Prod logs

# Get deployment info
serverless info --stage dev

# Remove deployment (careful!)
npm run remove:dev
```

## Important Notes

### Database Connection

> **CRITICAL**: Use Supabase's **session pooler** (port 6543) instead of direct connection (port 5432) to avoid connection exhaustion.

```bash
# Good (Session Pooler)
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres

# Bad (Direct Connection - will cause issues)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### CORS Configuration

Update your frontend's API URL to the Lambda endpoint:

```javascript
// Frontend .env
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

## Troubleshooting

### Deployment fails

```bash
# Deploy with verbose logging
serverless deploy --stage dev --verbose
```

### Check logs for errors

```bash
npm run logs:dev
```

### Database connection errors

- Verify you're using the session pooler URL (port 6543)
- Check that DATABASE_URL in serverless.yml matches your .env

### Lambda timeout

If functions timeout, increase timeout in `serverless.yml`:

```yaml
provider:
  timeout: 60  # Increase from 30 to 60 seconds
```

## Next Steps

1. ✅ Deploy successfully
2. ✅ Test all API endpoints
3. ✅ Update frontend to use Lambda URL
4. ⬜ Set up custom domain (optional)
5. ⬜ Configure CloudWatch alarms
6. ⬜ Set up CI/CD with GitHub Actions
7. ⬜ Deploy to production

## Need Help?

- For detailed documentation: See [AWS_LAMBDA_DEPLOYMENT.md](./AWS_LAMBDA_DEPLOYMENT.md)
- For logs: `npm run logs:dev`
- For function info: `serverless info --stage dev`

## Cost Estimate

Free tier covers:
- 1M requests/month
- 400,000 GB-seconds of compute

Expected cost for small-medium traffic: **~$10-15/month**

---

**Ready to deploy?** Run: `npm run deploy:dev` 🚀
