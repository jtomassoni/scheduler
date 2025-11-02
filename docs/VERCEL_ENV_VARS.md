# Vercel Environment Variables: Multiple Environments Setup

## Setting Different Values for Same Variable

Yes! In Vercel, you can have the **same environment variable** with **different values** for different environments.

## For test.jschedules.com and jschedules.com

You need to set `NEXTAUTH_URL` twice with different values and different environment scopes:

### Setup in Vercel

1. **Go to**: Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

2. **Add First NEXTAUTH_URL** (for production):
   - Variable: `NEXTAUTH_URL`
   - Value: `https://jschedules.com`
   - **Environment**: Select **Production** only
   - Click **Save**

3. **Add Second NEXTAUTH_URL** (for test):
   - Variable: `NEXTAUTH_URL` (same name!)
   - Value: `https://test.jschedules.com`
   - **Environment**: Select **Preview** or **Development** (depending on how test.jschedules.com is configured)
   - Click **Save**

4. **Set Shared Variables** (for all environments):
   - `NEXTAUTH_SECRET` → Value: `[your-secret]` → **All Environments**
   - `DATABASE_URL` → Value: `[your-database-url]` → **All Environments** (or separate for each if using different DBs)

## How Vercel Environment Scoping Works

Vercel uses the environment scoping to determine which value to use:

- **Production** → Uses variables set for "Production"
- **Preview** → Uses variables set for "Preview"
- **Development** → Uses variables set for "Development"
- **All Environments** → Uses the same value for all

## Example Configuration

| Variable          | Value                         | Environment Scope    |
| ----------------- | ----------------------------- | -------------------- |
| `NEXTAUTH_URL`    | `https://jschedules.com`      | **Production**       |
| `NEXTAUTH_URL`    | `https://test.jschedules.com` | **Preview**          |
| `NEXTAUTH_SECRET` | `[secret-value]`              | **All Environments** |
| `DATABASE_URL`    | `[database-url]`              | **All Environments** |

## Important: Which Environment is test.jschedules.com?

How you configured test.jschedules.com determines which environment scope to use:

### Option A: Preview Deployment

- If test.jschedules.com uses preview deployments
- Set `NEXTAUTH_URL=https://test.jschedules.com` for **Preview**

### Option B: Separate Production Domain

- If test.jschedules.com is configured as its own production domain
- Set `NEXTAUTH_URL=https://test.jschedules.com` for **Production**
- **BUT** then you'll have a conflict since jschedules.com also uses Production

**Solution for Option B**: Use a different approach:

- Use Vercel's preview branch deployments for test.jschedules.com
- OR configure test.jschedules.com to always deploy from a specific branch (which becomes Preview)
- OR use Vercel's custom domains with environment-specific settings

## Recommended Setup

**Best Practice:**

1. `jschedules.com` → Production environment → Uses Production variables
2. `test.jschedules.com` → Preview environment → Uses Preview variables

This way:

- Production gets `NEXTAUTH_URL=https://jschedules.com`
- Preview (test.jschedules.com) gets `NEXTAUTH_URL=https://test.jschedules.com`
- Both share `NEXTAUTH_SECRET` and `DATABASE_URL` (if using same DB)

## Verification

After setting up:

1. **Check Production deployment** (`jschedules.com`):
   - Should use `NEXTAUTH_URL=https://jschedules.com`
   - Login should work

2. **Check Preview deployment** (`test.jschedules.com`):
   - Should use `NEXTAUTH_URL=https://test.jschedules.com`
   - Login should work

3. **Test both:**
   - Visit `https://jschedules.com/login` → Should work
   - Visit `https://test.jschedules.com/login` → Should work

## Troubleshooting

### Both domains showing same NEXTAUTH_URL

- Check environment scoping is correct
- Verify test.jschedules.com is using Preview, not Production
- Redeploy both environments after changing variables

### Login still hanging

- Verify environment variables are set correctly
- Check Vercel deployment logs for errors
- Ensure you redeployed after setting variables
