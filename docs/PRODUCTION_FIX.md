# Fixing Production Login Issue

If you're seeing `?error=Configuration` on https://jschedules.com/login, follow these steps:

## Step 1: Fix Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and ensure these are set:

### Required Variables:

1. **NEXTAUTH_SECRET**
   - Generate with: `openssl rand -base64 32`
   - Or use: https://generate-secret.vercel.app/32
   - Must be set for ALL environments (Production, Preview, Development)

2. **NEXTAUTH_URL**
   - Set to: `https://jschedules.com`
   - Must be set for Production environment

3. **DATABASE_URL**
   - Your production PostgreSQL connection string
   - Must be set for ALL environments

### How to Set:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable above
3. Make sure to select "Production" for `NEXTAUTH_URL` (use `https://jschedules.com`)
4. Select "All Environments" for `NEXTAUTH_SECRET` and `DATABASE_URL`
5. Click "Save"
6. **Redeploy your application** (the variables only take effect after redeploy)

## Step 2: Create Production Admin Account

The test accounts (`admin@test.com`) only exist if you've run the seed script. For production, you need to create a real admin account.

### Option A: Using the Script (Recommended)

1. **Set your production DATABASE_URL locally:**

   ```bash
   export DATABASE_URL="your-production-database-url"
   ```

2. **Run the admin creation script:**

   ```bash
   npx tsx scripts/create-production-admin.ts your-email@example.com your-secure-password "Your Name"
   ```

   Example:

   ```bash
   npx tsx scripts/create-production-admin.ts admin@jschedules.com MySecurePassword123 "Production Admin"
   ```

3. **Login with the credentials you just created**

### Option B: Using Prisma Studio (Visual)

1. Install Prisma Studio: `npx prisma studio`
2. Connect to your production database (set `DATABASE_URL`)
3. Manually create a user with:
   - Email: your email
   - Role: `SUPER_ADMIN`
   - Status: `ACTIVE`
   - Hashed Password: Use bcrypt to hash your password first
   - Or use the script in Option A

### Option C: Direct Database Query

If you have direct database access:

```sql
-- First, generate a hashed password using Node.js:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 12).then(console.log)"

-- Then insert (replace YOUR_HASHED_PASSWORD with the output above):
INSERT INTO "User" (id, email, name, role, status, "hashedPassword", "hasDayJob", "isLead", "preferredVenuesOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@jschedules.com',
  'Production Admin',
  'SUPER_ADMIN',
  'ACTIVE',
  'YOUR_HASHED_PASSWORD',
  false,
  false,
  '{}',
  NOW(),
  NOW()
);
```

## Step 3: Verify Configuration

After setting environment variables and redeploying:

1. Check Vercel logs for any errors
2. Try logging in with your production admin credentials
3. If you still see configuration errors, check:
   - Vercel function logs
   - That you redeployed after setting environment variables
   - That `NEXTAUTH_URL` is exactly `https://jschedules.com` (no trailing slash)

## Emergency Fallback Account

**If you cannot access the system at all**, there is a fallback superadmin account configured via environment variables that works **even if the database is down**.

⚠️ **Warning:** This is an emergency account only. See `docs/FALLBACK_ADMIN.md` for full details.

**To configure:**

1. Go to Vercel → Environment Variables
2. Set `FALLBACK_ADMIN_USERNAME` and `FALLBACK_ADMIN_PASSWORD`
3. Redeploy your application

This account will work regardless of:

- Database connection status
- Environment variable configuration
- User account state in the database

Use it only when all other authentication methods fail.

## Troubleshooting

**Still seeing "Configuration" error?**

- Make sure you **redeployed** after setting environment variables
- Check Vercel function logs for specific errors
- Verify `NEXTAUTH_SECRET` is set (check in Vercel dashboard)
- Verify `NEXTAUTH_URL` matches your domain exactly

**Can't login after creating admin?**

- Check the user status is `ACTIVE` in the database
- Verify the password hash was generated correctly
- Check Vercel logs for authentication errors

**Database connection issues?**

- Verify `DATABASE_URL` is correct
- Check your database allows connections from Vercel IPs
- Ensure database is accessible and running
