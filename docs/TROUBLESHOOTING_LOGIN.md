# Troubleshooting Login Issues

## "Database connection error. Use fallback admin if needed."

This error occurs when Vercel cannot connect to your database during authentication.

### Common Causes & Fixes

#### 1. DATABASE_URL Not Set for Preview Environment

**Problem**: `DATABASE_URL` is missing or set incorrectly for the Preview environment.

**Fix**:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Check if `DATABASE_URL` exists
3. For `test.jschedules.com` (Preview), it must be:
   - **Value**: `postgresql://neondb_owner:npg_JQlxVwcOU19e@ep-curly-poetry-afdt1xoo-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require`
   - **Environment Scope**: Preview and Development (NOT Production)
4. **Redeploy** after making changes

#### 2. Environment Variables Not Applied (Need Redeploy)

**Problem**: You set the env vars but didn't redeploy.

**Fix**:

1. Go to Vercel Dashboard → Deployments
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete
5. Try logging in again

#### 3. Check Vercel Function Logs

To see the exact error:

1. Go to Vercel Dashboard → Your Project
2. Click "Functions" tab (or go to Deployments → Latest → Functions)
3. Find `/api/auth/callback/credentials` or `/api/auth/[...nextauth]`
4. Check the logs for specific error messages

Common errors you might see:

- `Connection refused`
- `timeout`
- `SSL/TLS connection failed`
- `P1001: Can't reach database server`

#### 4. Verify Database Connection String Format

Make sure your connection string includes:

- ✅ `?sslmode=require` at the end
- ✅ Correct password (no extra spaces)
- ✅ Correct hostname (pooler URL for Vercel)

**Test Database (Preview/Dev)**:

```
postgresql://neondb_owner:npg_JQlxVwcOU19e@ep-curly-poetry-afdt1xoo-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
```

**Production Database**:

```
postgresql://neondb_owner:npg_DGkc5HJz8Bmh@ep-aged-resonance-afitpbxv-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
```

#### 5. Neon Database Settings

If using Neon, verify:

- ✅ Database is running (not paused)
- ✅ Connection pooling is enabled (using `-pooler` in hostname)
- ✅ Allowed IPs include Vercel's IP ranges (Neon usually allows all by default)

#### 6. NEXTAUTH_SECRET Missing

If `NEXTAUTH_SECRET` is missing, you'll get a different error. Make sure it's set for **All Environments**.

## Quick Checklist

Before reporting issues, verify:

- [ ] `DATABASE_URL` is set for Preview environment (for test.jschedules.com)
- [ ] `DATABASE_URL` is set for Production environment (for jschedules.com)
- [ ] `NEXTAUTH_SECRET` is set for All Environments
- [ ] `NEXTAUTH_URL` is set correctly (`https://test.jschedules.com` for Preview, `https://jschedules.com` for Production)
- [ ] You **redeployed** after setting/changing environment variables
- [ ] Database is not paused (if using Neon)
- [ ] Connection string format is correct (includes `?sslmode=require`)

## Test Database Connection Locally

To verify your connection string works:

```bash
export DATABASE_URL="postgresql://neondb_owner:npg_JQlxVwcOU19e@ep-curly-poetry-afdt1xoo-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
npx prisma db pull
```

If this works locally but not in Vercel, it's an environment variable configuration issue.
