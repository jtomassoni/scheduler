# Debugging Vercel Authentication Issues

## Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project
2. Click **Deployments** tab
3. Click on your **latest deployment** (the one for test.jschedules.com)
4. Look for the **Functions** section or click **View Function Logs**
5. Try logging in again while watching the logs
6. Look for errors or log messages that show:
   - Which database it's connecting to
   - Authentication errors
   - Database connection errors

## Verify Environment Variables Are Active

Even if you see the variables set correctly, they might not be active in the current deployment.

### Option 1: Force Redeploy

1. Go to **Deployments**
2. Find your latest deployment for test.jschedules.com
3. Click "..." → **Redeploy**
4. Make sure it's deploying from the correct branch
5. Wait for it to complete
6. Try logging in again

### Option 2: Verify Deployment Environment

1. Check which environment the deployment is using:
   - Is `test.jschedules.com` configured as a **Preview** deployment or **Production**?
2. If it's Production, it will use Production env vars (wrong database!)
3. If it's Preview, it should use Preview env vars (correct database)

## Quick Test: Check Which Database Vercel Is Using

You can temporarily add logging to see which database URL is being used. But the easiest way is to check the Vercel logs.

## Common Issues

### Issue 1: Deployment Environment Mismatch

- `test.jschedules.com` might be set as a **Production** domain in Vercel
- Solution: Make sure `test.jschedules.com` is configured as a **Preview** domain

### Issue 2: Environment Variables Not Scoped Correctly

- "All Pre-Production Environments" should include Preview
- But sometimes Vercel treats custom domains differently
- Solution: Try setting it specifically to **Preview** instead of "All Pre-Production"

### Issue 3: Cached Deployment

- Old deployment might be cached
- Solution: Force a fresh redeploy or push a small commit
