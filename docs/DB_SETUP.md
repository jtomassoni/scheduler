# Database Setup Guide: Test & Production

This guide walks you through setting up both your test and production databases.

## Prerequisites

- Both databases are connected in Vercel
- Test DB: `DATABASE_URL` scoped to Preview/Development
- Production DB: `DATABASE_URL` scoped to Production only

## Step 1: Run Migrations on Both Databases

Both databases need the schema applied. Run migrations separately for each.

### Test Database Migrations

```bash
# Set DATABASE_URL to test database
export DATABASE_URL="postgresql://neondb_owner:npg_JQlxVwcOU19e@ep-curly-poetry-afdt1xoo-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Run migrations
npm run db:migrate:deploy
```

### Production Database Migrations

```bash
# Set DATABASE_URL to production database
export DATABASE_URL="postgresql://neondb_owner:npg_DGkc5HJz8Bmh@ep-aged-resonance-afitpbxv-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Run migrations
npm run db:migrate:deploy
```

## Step 2: Seed Test Database

The test database will be populated with demo data for sales demonstrations.

```bash
# Set DATABASE_URL to test database
export DATABASE_URL="postgresql://neondb_owner:npg_JQlxVwcOU19e@ep-curly-poetry-afdt1xoo-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Set NEXTAUTH_URL to test environment (required for seed script safety check)
export NEXTAUTH_URL="https://test.jschedules.com"

# Run seed
npm run db:seed
```

This creates:

- 4 demo venues
- 120 staff members (100 bartenders, 20 barbacks)
- 4 weeks of sample shifts
- Demo accounts: `manager@demo.com`, `bartender@demo.com`, `barback@demo.com` (password: `demo123`)

**Safety**: The seed script will abort if it detects production environment unless `FORCE_SEED=true` is set.

## Step 3: Set Up Production Database

Production database should remain **empty** - no user accounts needed initially.

### Configure Fallback Admin (Recommended)

Instead of creating a database user, use the **fallback admin** system which works via environment variables:

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add these variables for Production environment:**
   - `FALLBACK_ADMIN_USERNAME` = your desired username
   - `FALLBACK_ADMIN_PASSWORD` = your secure password

3. **Redeploy** your application for the changes to take effect

**Benefits:**

- Works even if database is unavailable
- No need to create database users initially
- Can be updated in Vercel without code changes
- Full SUPER_ADMIN permissions

**Alternative: Create Database User (Optional)**

If you prefer a database user instead:

```bash
# Set DATABASE_URL to production database
export DATABASE_URL="postgresql://neondb_owner:npg_DGkc5HJz8Bmh@ep-aged-resonance-afitpbxv-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Create superadmin (replace with your credentials)
npx tsx scripts/create-production-admin.ts your-email@jschedules.com your-secure-password "Your Name"
```

## Step 4: Verify Setup

### Test Database (test.jschedules.com)

1. Visit `https://test.jschedules.com`
2. Log in with demo credentials:
   - `manager@demo.com` / `demo123`
   - `bartender@demo.com` / `demo123`
   - `barback@demo.com` / `demo123`
3. Verify you see demo venues and shifts

### Production Database (jschedules.com)

1. Visit `https://jschedules.com`
2. Log in with your **fallback admin credentials** (from `FALLBACK_ADMIN_USERNAME` and `FALLBACK_ADMIN_PASSWORD` env vars)
3. Database should be empty (no venues yet)
4. Create your first venue through the app
5. Start inviting staff and setting up shifts

**Note:** The fallback admin is a virtual account that doesn't exist in the database but has full SUPER_ADMIN permissions.

## Troubleshooting

### Migrations Fail

If migrations fail:

- Check database connection string is correct
- Verify database exists and is accessible
- Check SSL mode is set correctly (`?sslmode=require`)

### Seed Script Aborts on Production

This is **intentional**! The seed script protects production. If you see:

```
⚠️  WARNING: This seed script is designed for test.jschedules.com only!
```

Verify:

- `NEXTAUTH_URL` is set to `https://test.jschedules.com` for test seeding
- You're using the test database connection string

### Can't Connect to Database

- Verify environment variables in Vercel are correct
- Check database is running in Neon dashboard
- Verify connection string includes `?sslmode=require`

## Summary

| Database       | Migrations        | Seed Data                       | User Account               |
| -------------- | ----------------- | ------------------------------- | -------------------------- |
| **Test**       | ✅ Run migrations | ✅ Run seed (creates demo data) | Auto-created demo accounts |
| **Production** | ✅ Run migrations | ❌ Keep empty                   | ✅ Create superadmin only  |

After setup:

- **test.jschedules.com** → Ready for sales demos with full demo data
- **jschedules.com** → Ready for you to create your first venue as superadmin
