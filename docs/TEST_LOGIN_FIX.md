# Fixing Login Hang on test.jschedules.com

If login at `test.jschedules.com` is hanging or not completing, it's almost always an environment variable configuration issue.

## Quick Fix

### Step 1: Set Environment Variables in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. **Add/Update `NEXTAUTH_URL` for test.jschedules.com:**
   - Variable: `NEXTAUTH_URL`
   - Value: `https://test.jschedules.com` (use HTTPS, not HTTP)
   - **Environment**: Select **Preview** (or **Development**, depending on how you configured test.jschedules.com)
   - Click **Save**

3. **Verify `NEXTAUTH_SECRET` is set:**
   - Should be set for **All Environments**
   - If missing, add it (generate with `openssl rand -base64 32`)

4. **Verify `DATABASE_URL` is set:**
   - Should be set for **All Environments** (or at least Preview/Development if using separate database)

### Step 2: Redeploy

**Important**: Environment variables only take effect after redeploy!

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

### Step 3: Test

1. Visit `https://test.jschedules.com/login` (use HTTPS!)
2. Try logging in with: `manager@demo.com` / `demo123`
3. Should redirect to dashboard

## Common Issues

### Using HTTP instead of HTTPS

- ❌ `http://test.jschedules.com`
- ✅ `https://test.jschedules.com`
- Vercel provides HTTPS automatically - always use HTTPS

### Wrong Environment Scope

- If test.jschedules.com is configured as a **Preview** deployment, set environment variables for **Preview**
- If configured as **Production**, set for **Production**
- You can set variables for multiple environments (Production, Preview, Development)

### NEXTAUTH_URL Mismatch

- The `NEXTAUTH_URL` must **exactly match** the domain you're accessing
- `NEXTAUTH_URL=https://test.jschedules.com` for test.jschedules.com
- `NEXTAUTH_URL=https://jschedules.com` for jschedules.com

## Debugging

### Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project → **Functions** tab
2. Look for errors in `/api/auth/callback/credentials`
3. Check for:
   - Missing `NEXTAUTH_SECRET` errors
   - Database connection errors
   - Authentication errors

### Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try logging in
4. Look for errors or failed network requests

### Network Tab

1. Open DevTools → **Network** tab
2. Try logging in
3. Look for:
   - `/api/auth/callback/credentials` - should return 200 OK
   - `/api/auth/session` - should return session data
   - Any 500 or error responses

## Verification Checklist

- [ ] `NEXTAUTH_URL` is set to `https://test.jschedules.com` (Preview/Development environment)
- [ ] `NEXTAUTH_SECRET` is set (All Environments)
- [ ] `DATABASE_URL` is set (All Environments or Preview)
- [ ] Redeployed after setting environment variables
- [ ] Accessing via HTTPS (not HTTP)
- [ ] Using correct demo credentials: `manager@demo.com` / `demo123`
