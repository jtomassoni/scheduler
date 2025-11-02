# Environment Variables Quick Reference

## Copy-Paste Ready for Vercel

Use these exact variable names when adding them to Vercel's Environment Variables section:

### Required Variables (Copy these names):

```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
```

### Optional Variables (Only if enabling push notifications):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

### Optional Variables (Emergency Fallback Admin):

```
FALLBACK_ADMIN_USERNAME
FALLBACK_ADMIN_PASSWORD
```

OR (for multiple admins):

```
FALLBACK_ADMINS
```

---

## Detailed Variable Guide

### 1. DATABASE_URL ⚠️ REQUIRED

**What it is:** PostgreSQL database connection string

**Format:**

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

**Examples:**

- Local: `postgresql://postgres:mypassword@localhost:5432/scheduler`
- Vercel Postgres: Vercel will provide this automatically if you use their Postgres addon
- Supabase: `postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
- Neon: `postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb`

**How to get it:**

- If using Vercel Postgres: Go to your Vercel project → Storage → Create Database → Postgres
- If using external provider: Check your database provider's dashboard for connection string

---

### 2. NEXTAUTH_URL ⚠️ REQUIRED

**What it is:** Your application's public URL

**For first deploy:**

```
https://scheduler-XXXXX.vercel.app
```

_(Vercel will show you the exact URL after first deploy)_

**For custom domain:**

```
https://scheduler.yourdomain.com
```

**For local development:**

```
http://localhost:3000
```

**⚠️ Important:** Update this after your first Vercel deploy with the actual URL Vercel gives you!

---

### 3. NEXTAUTH_SECRET ⚠️ REQUIRED

**What it is:** Secret key for encrypting NextAuth sessions

**Generate it:**

```bash
openssl rand -base64 32
```

**Or use online generator:**
https://generate-secret.vercel.app/32

**Example output:**

```
XyZ123AbC456DeF789GhI012JkL345MnO678PqR901StU234VwX567YzA890
```

**⚠️ Important:** Keep this secret! Don't commit it to git.

---

### 4. NEXT_PUBLIC_VAPID_PUBLIC_KEY (Optional)

**What it is:** Public key for push notifications (safe to expose)

**Only needed if:** You want push notifications enabled

**Generate it:**

```bash
npx web-push generate-vapid-keys
```

**Output will look like:**

```
Public Key: BLxQ... (long string starting with BL)
Private Key: -- (long string)
```

**Copy the Public Key** (the one starting with `BL`)

---

### 5. VAPID_PRIVATE_KEY (Optional)

**What it is:** Private key for push notifications (must be kept secret)

**Only needed if:** You want push notifications enabled

**Generate it:**

```bash
npx web-push generate-vapid-keys
```

**Copy the Private Key** (the second value)

**⚠️ Important:** Keep this secret! Don't commit it to git.

---

### 6. VAPID_SUBJECT (Optional)

**What it is:** Email address associated with your VAPID keys

**Only needed if:** You want push notifications enabled

**Format:**

```
mailto:your-email@example.com
```

**Example:**

```
mailto:admin@yourscheduler.com
```

---

## Quick Setup Checklist

### For Vercel Deployment:

- [ ] Remove example variable (`EXAMPLE_NAME`) if present
- [ ] Add `DATABASE_URL` (get from your database provider)
- [ ] Add `NEXTAUTH_URL` (use placeholder `https://scheduler.vercel.app` for now, update after deploy)
- [ ] Add `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- [ ] (Optional) Add push notification variables if needed
- [ ] Click "Deploy"
- [ ] After deploy, update `NEXTAUTH_URL` with actual Vercel URL

### For Local Development:

- [ ] Copy `env.example` to `.env.local`
- [ ] Fill in all required variables
- [ ] Use `http://localhost:3000` for `NEXTAUTH_URL`
- [ ] Run `npm run dev`

---

## Troubleshooting

**"DATABASE_URL is not set"**
→ Add your database connection string

**"NEXTAUTH_URL is required"**
→ Set it to your Vercel URL (or localhost for dev)

**"Invalid NEXTAUTH_SECRET"**
→ Generate a new one with `openssl rand -base64 32`

**Push notifications not working**
→ Make sure you've installed `web-push` and uncommented code in `push-sender.ts`
→ Verify VAPID keys are correct
→ Check browser console for errors

**Emergency fallback admin**
→ Set `FALLBACK_ADMIN_USERNAME` and `FALLBACK_ADMIN_PASSWORD` in Vercel
→ Or use `FALLBACK_ADMINS` for multiple accounts (format: `user1:pass1,user2:pass2`)
→ Works even if database is unavailable
→ See `docs/FALLBACK_ADMIN.md` for full details
