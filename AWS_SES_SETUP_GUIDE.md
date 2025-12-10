# AWS SES Setup Guide

Complete walkthrough to set up AWS SES for email sending in your application.

---

## Step 1: Create an AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click **"Create an AWS Account"**
3. Follow the signup process (requires credit card, but SES is very cheap)

---

## Step 2: Create IAM User with SES Permissions

1. Go to **IAM Console**: [console.aws.amazon.com/iam](https://console.aws.amazon.com/iamv2/home)
2. Click **Users** → **Create user**
3. **User name**: `ses-backend-user`
4. Click **Next**
5. Select **Attach policies directly**
6. Search and select: `AmazonSESFullAccess`
7. Click **Next** → **Create user**

### Get Access Keys
1. Click on the user you just created
2. Go to **Security credentials** tab
3. Scroll to **Access keys** → **Create access key**
4. Select **Application running outside AWS**
5. Click **Create access key**
6. **SAVE THESE VALUES** (you won't see them again):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

---

## Step 3: Update Your `.env` File

Add these to your `.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

> **Note**: Use `us-east-1` unless you have a specific region preference. SES is available in limited regions.

---

## Step 4: Request Production Access (IMPORTANT!)

By default, AWS SES is in **Sandbox Mode**:
- You can only send to **verified email addresses**
- Max 200 emails/day, 1 email/second

### To get out of Sandbox:
1. Go to **SES Console**: [console.aws.amazon.com/ses](https://console.aws.amazon.com/ses)
2. Select your region (e.g., us-east-1)
3. Click **Account dashboard** in sidebar
4. Under **Sending statistics**, click **Request production access**
5. Fill in the form:
   - **Mail Type**: Transactional (or Marketing)
   - **Website URL**: Your website
   - **Use Case Description**: Explain your legitimate email use case
   - **Additional contacts**: Your email
6. Submit and wait for approval (usually 24-48 hours)

---

## Step 5: Verify Your Sending Domain

### Using Your API:
1. Call `POST /domains` with body `{ "domain": "yourdomain.com" }`
2. You'll receive DNS records to add

### Using AWS Console (alternative):
1. Go to **SES Console** → **Verified identities**
2. Click **Create identity** → **Domain**
3. Enter your domain name
4. Enable **DKIM signing** (recommended)
5. Click **Create**

---

## Step 6: Add DNS Records

Add these records at your DNS provider (Cloudflare, GoDaddy, etc.):

### TXT Record (Domain Verification)
| Type | Name | Value |
|------|------|-------|
| TXT | `_amazonses.yourdomain.com` | `{verificationToken from API}` |

### CNAME Records (DKIM - 3 records)
| Type | Name | Value |
|------|------|-------|
| CNAME | `{token1}._domainkey.yourdomain.com` | `{token1}.dkim.amazonses.com` |
| CNAME | `{token2}._domainkey.yourdomain.com` | `{token2}.dkim.amazonses.com` |
| CNAME | `{token3}._domainkey.yourdomain.com` | `{token3}.dkim.amazonses.com` |

> **DNS Propagation**: Wait 15-60 minutes, then call `PATCH /domains/:id/refresh` to check status.

---

## Step 7: Test Email Sending

### In Sandbox Mode (before production access):
1. Verify your test email address first:
   - Go to **SES Console** → **Verified identities** → **Create identity (Email address)**
   - Enter your email and verify via the link sent
2. Use the campaign "Send Test Email" feature to that verified address

### After Production Access:
- You can send to any email address

---

## Quick Checklist

- [ ] AWS account created
- [ ] IAM user with `AmazonSESFullAccess` policy
- [ ] Access keys saved in `.env`
- [ ] Domain verified (TXT + DKIM records added)
- [ ] Production access requested (for real sending)

---

## Pricing

AWS SES is extremely affordable:
- **First 62,000 emails/month**: FREE (if sent from EC2)
- **Standard pricing**: $0.10 per 1,000 emails
- **No monthly minimum**

For comparison: Resend at $40/month vs SES at ~$1/month for 10,000 emails.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Email address is not verified` | You're in sandbox mode. Verify the recipient or request production access. |
| `Domain not verified` | Wait for DNS propagation, then refresh status. Check DNS records are correct. |
| `Access Denied` | Check IAM user has `AmazonSESFullAccess` policy. |
| `MessageRejected` | Usually a formatting issue or you're sending to an unverified address in sandbox. |
