# Quick Fix: Add Missing Environment Variables

## Required Variables (Minimum to Fix the 500 Error)

You need these 3 environment variables in Vercel:

### 1. NEXTAUTH_SECRET ⚠️ REQUIRED (MISSING - This is causing your 500 error!)

**Generate it:**

```bash
openssl rand -base64 32
```

**Or use:** https://generate-secret.vercel.app/32

**Set it in Vercel:**

- Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
- Add: `NEXTAUTH_SECRET`
- Value: Paste the generated secret
- Environment: Select "Production" (or "All Environments")
- Click "Save"

### 2. NEXTAUTH_URL ✅ (You already have this)

Should be set to: `https://jschedules.com`

### 3. DATABASE_URL ⚠️ REQUIRED

Your production PostgreSQL connection string.

**Format:** `postgresql://username:password@host:port/database`

If you're using Neon, Supabase, or Vercel Postgres, get the connection string from your database provider's dashboard.

## After Adding Variables

**IMPORTANT:** You must **redeploy** your application after adding environment variables!

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click the "..." menu on the latest deployment
3. Click "Redeploy"
4. Or push a new commit to trigger a redeploy

## Optional: Fallback Admin

If you want the emergency fallback admin account:

- `FALLBACK_ADMIN_USERNAME` = `james_tomassoni`
- `FALLBACK_ADMIN_PASSWORD` = `P@ssword123$`

These are optional - only add them if you want emergency access.
