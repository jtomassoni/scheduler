# Deployment Guide

## Environment Setup

The application supports multiple deployment environments:

- **Production**: `https://jschedules.com` - Live customer data and operations
- **Demo/Test**: `https://test.jschedules.com` - Demo environment for sales and testing

## Demo Environment (test.jschedules.com)

The demo environment is designed for sales demonstrations and should be completely isolated from production.

### Setup Steps

1. **Deploy to test.jschedules.com subdomain**
   - Configure Vercel (or your hosting provider) to deploy to `test.jschedules.com`
   - Set up DNS to point `test.jschedules.com` to your deployment

2. **Environment Variables**

   ```bash
   NEXTAUTH_URL=https://test.jschedules.com
   NEXTAUTH_SECRET=<your-secret>
   DATABASE_URL=<separate-database-or-production-with-caution>
   ```

3. **Seed Demo Data**

   ```bash
   npm run db:seed
   ```

   This populates the database with:
   - 4 demo venues
   - 120 staff members (100 bartenders, 20 barbacks)
   - 4 weeks of sample shifts
   - Demo login accounts:
     - manager@demo.com / demo123
     - bartender@demo.com / demo123
     - barback@demo.com / demo123

4. **Access Demo Environment**
   - Sales team navigates to: `https://test.jschedules.com`
   - **Log in** with any demo account above
   - **Role switching**: Log out and log in with different demo account to see other roles
   - **Full demo experience**: Same app features as production, but with demo data

### Important Notes

- ⚠️ **Recommended**: Use a separate database for test.jschedules.com to avoid any risk of data mixing
- ✅ Demo accounts use `@demo.com` email addresses for easy identification
- ✅ Demo data can be safely reset without affecting production
- ✅ All demo accounts use password: `demo123`

## Production Environment (jschedules.com)

### Production Setup

1. **Environment Variables**

   ```bash
   NEXTAUTH_URL=https://jschedules.com
   NEXTAUTH_SECRET=<production-secret>
   DATABASE_URL=<production-database>
   FALLBACK_ADMIN_USERNAME=<emergency-admin-username>
   FALLBACK_ADMIN_PASSWORD=<emergency-admin-password>
   ```

2. **Security Considerations**
   - Never run `npm run db:seed` on production (it seeds demo data)
   - Ensure production database is properly backed up
   - Configure fallback admin credentials via environment variables
   - Monitor database connections and performance

3. **Initial Admin Setup**
   ```bash
   npx tsx scripts/create-production-admin.ts admin@jschedules.com securepassword "Production Admin"
   ```

## Database Considerations

### Option 1: Separate Databases (Recommended)

- Production uses one database
- Test/Demo uses a completely separate database
- No risk of data mixing or accidental operations

### Option 2: Shared Database with Filters

- Both environments use same database
- Demo accounts clearly marked with `@demo.com`
- Higher risk - requires careful filtering in queries
- Not recommended for production workloads

## Deployment Checklist

### Before Deploying to test.jschedules.com

- [ ] Configure `NEXTAUTH_URL` to `https://test.jschedules.com`
- [ ] Set up database (separate recommended)
- [ ] Run `npm run db:seed` to populate demo data
- [ ] Verify demo login accounts work
- [ ] Verify login and role access for all demo accounts
- [ ] Verify all demo features are accessible

### Before Deploying to Production

- [ ] Configure `NEXTAUTH_URL` to `https://jschedules.com`
- [ ] Set up production database with proper backups
- [ ] Configure fallback admin credentials
- [ ] Create production admin account
- [ ] Verify production environment variables
- [ ] Test authentication flow
- [ ] Verify no demo data seed scripts run automatically
