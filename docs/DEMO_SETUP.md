# Demo Setup Guide

This guide explains how to set up and use the demo environment for sales demonstrations.

## Overview

The demo system includes:

- **4 Demo Venues**: The Grand Ballroom, Downtown Lounge, Riverside Club, City Center Hall
- **120 Staff Members**: 100 bartenders (15 leads) + 20 barbacks
- **4 Weeks of Shifts**: Pre-populated shifts with assignments
- **3 Demo Accounts**: Manager, Bartender, and Barback roles

## Setting Up Demo Data for test.jschedules.com

⚠️ **Important:** The seed command is specifically designed for the **test.jschedules.com** environment to prevent production data contamination.

### Prerequisites

1. **Environment Variable**: Ensure `NEXTAUTH_URL=https://test.jschedules.com` is set
2. **Database**: Use the test database (separate from production recommended)
3. **Environment**: Run seed on test.jschedules.com deployment or locally with test config

### Seeding Test Database

To seed the test database with demo data, run:

```bash
# Ensure NEXTAUTH_URL is set for test environment
export NEXTAUTH_URL=https://test.jschedules.com
npm run db:seed
```

**Safety Check:** The seed script will automatically abort if it detects production environment (unless `FORCE_SEED=true` is set).

This will create:

- Demo venues (4 venues)
- Demo staff (100 bartenders, 20 barbacks)
- Demo shifts for the next 4 weeks
- Demo user accounts with credentials below

## Demo Login Credentials

All demo accounts use the password: **`demo123`**

### Manager Account

- **Email**: `manager@demo.com`
- **Password**: `demo123`
- **Access**: Full management features including shift assignment, auto-scheduling, reports, staff management

### Bartender Account

- **Email**: `bartender@demo.com`
- **Password**: `demo123`
- **Access**: Staff view with schedule, availability submission, shift trading

### Barback Account

- **Email**: `barback@demo.com`
- **Password**: `demo123`
- **Access**: Staff view with schedule, availability submission, shift trading

## Using the Demo

### For Sales Team

**Demo Environment**: The entire `https://test.jschedules.com` site is the demo environment, completely separate from production (`jschedules.com`).

1. **Navigate to**: `https://test.jschedules.com`
2. **Log in** with any demo account:
   - Manager: `manager@demo.com` / `demo123`
   - Bartender: `bartender@demo.com` / `demo123`
   - Barback: `barback@demo.com` / `demo123`
3. **Explore Features**: Navigate through the app from that role's perspective
4. **Switch Roles**: Log out and log in with a different demo account to see other role views
5. **Full Access**: All demo accounts have full permissions for their respective roles to showcase features

**Demo Environment Benefits:**

- ✅ Complete separation from production
- ✅ Pre-populated with realistic demo data
- ✅ Same seamless experience as production
- ✅ Safe to demo without affecting real customer data

### Key Features to Demo

#### As Manager:

- **Shift Scheduler**: Show calendar view with multiple venues
- **Auto-Schedule**: Demonstrate automatic shift assignment
- **Auto-Assign**: Show single-shift auto-assignment
- **Staff Management**: Browse 120 staff members
- **Scheduling Priority**: Drag-and-drop priority ranking
- **Reports**: Show equity reports and venue summaries
- **Shift Details**: Show shift editing and manual assignment

#### As Bartender/Barback:

- **Dashboard**: Show personal schedule and upcoming shifts
- **Shift Calendar**: View assigned shifts across venues
- **Availability**: Show month calendar for submitting availability
- **Profile**: Show venue preferences and settings
- **Shift Trading**: Show shift trade requests (if any exist)

## Demo Data Details

### Venues

All venues are configured with:

- Tip pool enabled
- Availability deadline: 10th of each month
- Networked venues (shared staff pool)

### Staff Distribution

- Bartenders work at 2-4 random venues each
- Barbacks work at 2-4 random venues each
- 15 bartenders are designated as leads
- Staff have realistic names and phone numbers

### Shifts

- Shifts are created for Friday, Saturday, Sunday, and occasionally Thursday
- 60% of shifts have staff assignments pre-populated
- Event names are randomly assigned from a pool of realistic names
- Shifts require 3-6 bartenders, 1-2 barbacks, and 1-2 leads

## Troubleshooting

### Demo data not loading

If demo data isn't appearing:

1. Verify the seed script ran successfully: `npm run db:seed`
2. Check database connection in `.env.local`
3. Ensure Prisma client is generated: `npm run db:generate`

### Login issues

If demo accounts won't log in:

1. Verify accounts were created: Check database for `manager@demo.com`, etc.
2. Verify password hash: All demo accounts use the same password (`demo123`)
3. Check NextAuth configuration

### Missing shifts

If shifts aren't visible:

1. Ensure shifts were created (check seed script output)
2. Verify shift dates are in the future (shifts are created for next 4 weeks)
3. Check venue filters on the shift scheduler page

## Resetting Demo Data

To reset and re-seed demo data:

```bash
# Option 1: Clear and re-seed (careful - deletes ALL data)
# You may want to backup your database first

# Option 2: Just re-run seed (upserts existing data)
npm run db:seed
```

The seed script uses `upsert` operations, so running it multiple times is safe - it will update existing records rather than creating duplicates.

## Deployment & Environment Separation

The demo environment is deployed to **`test.jschedules.com`** to ensure complete separation from production:

- **Production**: `https://jschedules.com` - Live customer data
- **Demo/Test**: `https://test.jschedules.com` - Demo data only

### Benefits of Separate Subdomain

- ✅ Complete data isolation - no risk of mixing demo and production data
- ✅ Separate database or environment can be used
- ✅ Independent NextAuth configuration
- ✅ Sales team can demo without affecting production
- ✅ Easy to reset/refresh demo data without impacting production

### Configuration for test.jschedules.com

When deploying to `test.jschedules.com`, ensure:

1. **NEXTAUTH_URL** environment variable is set to `https://test.jschedules.com`
2. Database can be separate or use a filtered query (recommend separate for safety)
3. Demo data seed runs only on the test subdomain
4. CORS/origin settings allow the test subdomain if needed

### Demo Account Considerations

- Demo accounts are clearly marked with `@demo.com` email addresses
- Demo data uses separate venue IDs and naming conventions
- Consider adding a visual indicator in the UI for demo accounts
- May want to automatically log out demo sessions after a certain period
