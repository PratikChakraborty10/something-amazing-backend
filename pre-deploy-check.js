#!/usr/bin/env node

/**
 * Pre-deployment verification script
 * Checks if all requirements are met before deploying to AWS Lambda
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

let errors = 0;
let warnings = 0;

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function checkCommand(command, name) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe' });
    log(`✓ ${name} is installed`, COLORS.GREEN);
    return true;
  } catch (error) {
    log(`✗ ${name} is NOT installed`, COLORS.RED);
    errors++;
    return false;
  }
}

function checkFile(filePath, name, required = true) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${name} exists`, COLORS.GREEN);
    return true;
  } else {
    if (required) {
      log(`✗ ${name} is missing`, COLORS.RED);
      errors++;
    } else {
      log(`⚠ ${name} is missing (optional)`, COLORS.YELLOW);
      warnings++;
    }
    return false;
  }
}

function checkEnvVariable(envContent, variable, name) {
  const regex = new RegExp(`^${variable}=.+`, 'm');
  if (regex.test(envContent)) {
    const value = envContent.match(regex)[0].split('=')[1].trim();
    if (value && value !== 'your-' && !value.includes('xxxxx') && !value.includes('[PASSWORD]')) {
      log(`✓ ${name} is set`, COLORS.GREEN);
      return true;
    } else {
      log(`⚠ ${name} appears to have placeholder value`, COLORS.YELLOW);
      warnings++;
      return false;
    }
  } else {
    log(`✗ ${name} is not set`, COLORS.RED);
    errors++;
    return false;
  }
}

function checkDatabaseURL(envContent) {
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  if (dbUrlMatch) {
    const dbUrl = dbUrlMatch[1].trim();
    
    // Check if using session pooler (port 6543)
    if (dbUrl.includes(':6543')) {
      log(`✓ DATABASE_URL uses session pooler (port 6543)`, COLORS.GREEN);
      return true;
    } else if (dbUrl.includes(':5432')) {
      log(`✗ DATABASE_URL uses direct connection (port 5432) - Use session pooler (6543) for Lambda!`, COLORS.RED);
      errors++;
      return false;
    } else {
      log(`⚠ DATABASE_URL port unclear - ensure you're using session pooler (6543)`, COLORS.YELLOW);
      warnings++;
      return false;
    }
  } else {
    log(`✗ DATABASE_URL is not set`, COLORS.RED);
    errors++;
    return false;
  }
}

function checkAWSCredentials() {
  try {
    execSync('aws sts get-caller-identity', { stdio: 'pipe' });
    log(`✓ AWS credentials are configured`, COLORS.GREEN);
    return true;
  } catch (error) {
    log(`✗ AWS credentials are NOT configured - Run 'aws configure'`, COLORS.RED);
    errors++;
    return false;
  }
}

function checkNodeVersion() {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.split('.')[0].substring(1));
    
    if (majorVersion >= 18) {
      log(`✓ Node.js version ${version} is compatible (≥18)`, COLORS.GREEN);
      return true;
    } else {
      log(`✗ Node.js version ${version} is too old. Need ≥18`, COLORS.RED);
      errors++;
      return false;
    }
  } catch (error) {
    log(`✗ Could not check Node.js version`, COLORS.RED);
    errors++;
    return false;
  }
}

function main() {
  log('\n=================================', COLORS.BLUE);
  log(' AWS Lambda Pre-Deployment Check', COLORS.BLUE);
  log('=================================\n', COLORS.BLUE);

  // Check Node.js version
  log('\n📦 Checking Node.js Version...', COLORS.BLUE);
  checkNodeVersion();

  // Check required tools
  log('\n🔧 Checking Required Tools...', COLORS.BLUE);
  checkCommand('aws', 'AWS CLI');
  checkCommand('serverless', 'Serverless Framework');
  checkCommand('node', 'Node.js');
  checkCommand('npm', 'npm');

  // Check AWS credentials
  log('\n🔐 Checking AWS Credentials...', COLORS.BLUE);
  checkAWSCredentials();

  // Check required files
  log('\n📁 Checking Required Files...', COLORS.BLUE);
  checkFile('src/lambda.ts', 'Lambda handler (src/lambda.ts)');
  checkFile('serverless.yml', 'Serverless config (serverless.yml)');
  checkFile('dist/lambda.js', 'Compiled Lambda handler (dist/lambda.js)', false);

  // Check dependencies
  log('\n📚 Checking Dependencies...', COLORS.BLUE);
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = [
      '@vendia/serverless-express',
      'aws-lambda',
    ];
    
    const requiredDevDeps = [
      'serverless',
      'serverless-offline',
      '@types/aws-lambda',
    ];
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        log(`✓ ${dep} is installed`, COLORS.GREEN);
      } else {
        log(`✗ ${dep} is missing - Run 'npm install --save ${dep}'`, COLORS.RED);
        errors++;
      }
    });
    
    requiredDevDeps.forEach(dep => {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        log(`✓ ${dep} is installed`, COLORS.GREEN);
      } else {
        log(`✗ ${dep} is missing - Run 'npm install --save-dev ${dep}'`, COLORS.RED);
        errors++;
      }
    });
  }

  // Check environment configuration
  log('\n🌍 Checking Environment Configuration...', COLORS.BLUE);
  const stage = process.argv[2] || 'dev';
  const envFile = `.env.${stage}`;
  
  if (checkFile(envFile, `Environment file (${envFile})`)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    
    checkEnvVariable(envContent, 'SUPABASE_URL', 'SUPABASE_URL');
    checkEnvVariable(envContent, 'SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
    checkEnvVariable(envContent, 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
    checkEnvVariable(envContent, 'SUPABASE_JWT_SECRET', 'SUPABASE_JWT_SECRET');
    checkDatabaseURL(envContent);
    checkEnvVariable(envContent, 'FRONTEND_URL', 'FRONTEND_URL');
    checkEnvVariable(envContent, 'AWS_SES_REGION', 'AWS_SES_REGION');
    checkEnvVariable(envContent, 'RESEND_API_KEY', 'RESEND_API_KEY');
  }

  // Summary
  log('\n' + '='.repeat(50), COLORS.BLUE);
  log('Summary:', COLORS.BLUE);
  log('='.repeat(50) + '\n', COLORS.BLUE);

  if (errors === 0 && warnings === 0) {
    log('✅ All checks passed! You\'re ready to deploy! 🚀', COLORS.GREEN);
    log(`\nRun: npm run deploy:${stage}\n`, COLORS.GREEN);
    process.exit(0);
  } else if (errors === 0) {
    log(`⚠️  ${warnings} warning(s) found. Review warnings before deploying.`, COLORS.YELLOW);
    log(`\nYou can still deploy with: npm run deploy:${stage}\n`, COLORS.YELLOW);
    process.exit(0);
  } else {
    log(`❌ ${errors} error(s) and ${warnings} warning(s) found.`, COLORS.RED);
    log('Please fix the errors before deploying.\n', COLORS.RED);
    process.exit(1);
  }
}

// Run the checks
main();
