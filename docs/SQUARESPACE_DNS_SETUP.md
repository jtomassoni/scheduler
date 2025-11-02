# Setting Up test.jschedules.com with Squarespace DNS

If your domain `jschedules.com` is registered or managed through Squarespace, you need to add a DNS record in Squarespace to point `test.jschedules.com` to Vercel.

## Step-by-Step: Add Subdomain in Squarespace

### Option 1: Squarespace Domain Settings (If Domain is Connected to Squarespace)

1. **Log into Squarespace**
   - Go to your Squarespace account
   - Navigate to **Settings** → **Domains**
   - Find `jschedules.com`

2. **Add DNS Record**
   - Click on `jschedules.com` to manage it
   - Look for **DNS Settings** or **Advanced DNS**
   - Click **Add Record**

3. **Create CNAME Record**
   - **Type**: CNAME
   - **Host**: `test` (just the subdomain part)
   - **Points to**: `cname.vercel-dns.com` (or the value Vercel provides)
   - **TTL**: Auto (or 3600)
   - Click **Save**

4. **Alternative: If CNAME not available, use A Record**
   - **Type**: A
   - **Host**: `test`
   - **Points to**: [Vercel IP addresses - Vercel will show these when you add the domain]
   - **TTL**: Auto
   - Click **Save**

### Option 2: Transfer DNS to Vercel or External Provider (Recommended)

If Squarespace DNS management is limited, consider:

**Transfer DNS to Vercel:**

1. In Vercel → Settings → Domains
2. Add `jschedules.com` as primary domain
3. Follow Vercel's instructions to update nameservers in Squarespace

**Or use external DNS provider (Cloudflare, Route53, etc.):**

1. Point nameservers to DNS provider
2. Add DNS records there
3. More flexible for managing subdomains

## Getting the Correct Values from Vercel

1. **Add domain in Vercel first:**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Click "Add Domain"
   - Enter: `test.jschedules.com`
   - Vercel will show you what DNS record to add

2. **Vercel will display:**
   - Either: CNAME pointing to `cname.vercel-dns.com`
   - Or: A records with specific IP addresses

## After Adding DNS Record in Squarespace

1. **Wait for DNS propagation** (5 minutes to 24 hours)
   - Use `dig test.jschedules.com` or `nslookup test.jschedules.com` to verify
   - Or use online tool: https://dnschecker.org

2. **Vercel will automatically detect the DNS record**
   - Once detected, it will show "Valid Configuration" in Vercel dashboard

3. **Set environment variables in Vercel:**
   - `NEXTAUTH_URL` = `https://test.jschedules.com` (for Preview/Development)
   - `DATABASE_URL` = Your test database
   - `NEXTAUTH_SECRET` = Same as production

4. **Deploy or Redeploy**
   - Push code or trigger redeploy
   - test.jschedules.com should now work!

## Troubleshooting

### DNS record not working

- Verify the record is correct in Squarespace
- Check TTL - lower values help with testing
- Wait longer for propagation (can take up to 24 hours)

### Squarespace doesn't allow subdomains

- Some Squarespace plans have limited DNS management
- Consider transferring DNS to Vercel or another provider
- Or use a different domain/subdomain strategy

### test.jschedules.com shows Squarespace site

- Make sure the CNAME/A record is pointing to Vercel, not Squarespace
- Check DNS propagation status
- Clear browser cache

## Quick Checklist

- [ ] Logged into Squarespace account
- [ ] Navigated to DNS settings for jschedules.com
- [ ] Added CNAME or A record for `test` subdomain
- [ ] Pointed to Vercel (value from Vercel dashboard)
- [ ] Saved DNS record
- [ ] Added `test.jschedules.com` domain in Vercel
- [ ] Set environment variables in Vercel for test subdomain
- [ ] Waited for DNS propagation
- [ ] Tested `https://test.jschedules.com`
