# Local Development Setup

Local development should use its own separate database, not connect to remote test/production databases.

## Prerequisites

1. **PostgreSQL installed locally**
   - macOS: `brew install postgresql@14` (or use Postgres.app)
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

2. **Create local database**

   ```bash
   # Connect to PostgreSQL
   psql postgres

   # Create database
   CREATE DATABASE scheduler_dev;
   \q
   ```

## Local Environment Configuration

### 1. Create `.env.local` file

```bash
cp env.example .env.local
```

### 2. Configure `.env.local`

```bash
# Local Database (adjust credentials if needed)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scheduler_dev

# Local development URL
NEXTAUTH_URL=http://localhost:3000

# Generate a secret (run once)
# openssl rand -base64 32
NEXTAUTH_SECRET=your-local-secret-here

# Optional: Fallback admin for local dev
FALLBACK_ADMIN_USERNAME=admin
FALLBACK_ADMIN_PASSWORD=admin123
```

### 3. Run Migrations on Local Database

```bash
# Make sure DATABASE_URL in .env.local is correct
npm run db:migrate:deploy
```

### 4. (Optional) Seed Local Database

```bash
# Set NEXTAUTH_URL to localhost for seed script
export NEXTAUTH_URL=http://localhost:3000

# Run seed (creates demo data)
npm run db:seed
```

## Database URLs Summary

| Environment             | Database         | URL                                                           |
| ----------------------- | ---------------- | ------------------------------------------------------------- |
| **Local Dev**           | Local PostgreSQL | `postgresql://postgres:postgres@localhost:5432/scheduler_dev` |
| **Test (Vercel)**       | Neon Test DB     | `postgresql://...ep-curly-poetry...`                          |
| **Production (Vercel)** | Neon Prod DB     | `postgresql://...ep-aged-resonance...`                        |

## Quick Start

```bash
# 1. Install PostgreSQL (if not installed)
brew install postgresql@14

# 2. Start PostgreSQL
brew services start postgresql@14

# 3. Create database
createdb scheduler_dev

# 4. Create .env.local with local DATABASE_URL
echo "DATABASE_URL=postgresql://$(whoami):postgres@localhost:5432/scheduler_dev" >> .env.local
echo "NEXTAUTH_URL=http://localhost:3000" >> .env.local
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env.local

# 5. Run migrations
npm run db:migrate:deploy

# 6. (Optional) Seed with demo data
NEXTAUTH_URL=http://localhost:3000 npm run db:seed

# 7. Start dev server
npm run dev
```

## Benefits of Local Database

- ✅ Fast development (no network latency)
- ✅ Safe to experiment (doesn't affect test/production)
- ✅ Can reset/wipe anytime
- ✅ Works offline
- ✅ Free to use
