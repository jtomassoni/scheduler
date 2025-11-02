# Fallback Super Admin Account

## Overview

This application includes a **hardcoded fallback superadmin account** that is built directly into the codebase. This account is always available, regardless of database state or configuration, and should be used only for emergency access when regular admin accounts are unavailable.

## ⚠️ Security Notice

This is an **emergency fallback account**. It should NOT be used for regular operations. The credentials are hardcoded in the source code, which means anyone with access to the codebase can see them.

**Only use this account when:**

- Database is unavailable
- Regular admin accounts are locked/disabled
- You need to regain access to fix critical issues
- All other authentication methods have failed

## Credentials

The fallback admin credentials are configured via **environment variables** in Vercel:

**Option 1: Single Admin (Recommended)**

- `FALLBACK_ADMIN_USERNAME` - The username to login with
- `FALLBACK_ADMIN_PASSWORD` - The password for the account

**Option 2: Multiple Admins**

- `FALLBACK_ADMINS` - Comma-separated list in format: `username1:password1,username2:password2`

⚠️ **Note:** Credentials are stored in Vercel environment variables. You can update them through the Vercel dashboard without code changes.

## How to Configure

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `FALLBACK_ADMIN_USERNAME` with your desired username
3. Add `FALLBACK_ADMIN_PASSWORD` with your secure password
4. Set these for **Production** environment (or All Environments if desired)
5. **Redeploy** your application for changes to take effect

## How to Use

1. Go to the login page: `/login`
2. Enter the username (set in `FALLBACK_ADMIN_USERNAME`)
3. Enter the password (set in `FALLBACK_ADMIN_PASSWORD`)
4. Click "Sign In"

This account will authenticate **even if the database is down**, as it's checked before any database queries.

## Changing the Fallback Credentials

If you need to change the fallback credentials (for example, if they've been exposed), you must:

1. Update the credentials in `src/lib/auth.ts` (around line 65-75)
2. Update this documentation
3. Commit and redeploy

**Location in code:** `src/lib/auth.ts` - `authorize()` function

## Limitations

- This account is **read-only** in terms of authentication (always works)
- It has **full SUPER_ADMIN permissions** once logged in
- It does **not** exist in the database (so you won't see it in user lists)
- The ID is hardcoded as `system-admin-fallback-id`

## When NOT to Use

❌ **DO NOT use for:**

- Regular daily operations
- Testing authentication features
- Sharing with team members (create real accounts instead)
- Production workflows

✅ **DO use for:**

- Emergency access recovery
- Fixing critical database/auth issues
- Regaining system access after misconfiguration

## Updating Credentials

To update the fallback credentials:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit `FALLBACK_ADMIN_USERNAME` and/or `FALLBACK_ADMIN_PASSWORD`
3. Save the changes
4. **Redeploy** your application (the changes only take effect after redeploy)

No code changes needed! You can manage credentials entirely through Vercel's UI.

## Multiple Fallback Admins

If you need multiple fallback admin accounts, use the `FALLBACK_ADMINS` environment variable:

Format: `username1:password1,username2:password2`

Example:

```
FALLBACK_ADMINS=james_tomassoni:P@ssword123$,backup_admin:SecurePass456!
```

This allows you to have multiple emergency access accounts without changing code.
