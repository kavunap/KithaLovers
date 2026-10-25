# KithaLovers Stage 46 — Production launch guide

## 1. Before deployment
- Preserve your existing `.env.local` outside the public repository. Never commit it.
- Run `npm ci`, `npm run security:check`, `npm run deploy:check`, and `npm run build`.
- Review `supabase/stage45_security_audit_readonly.sql` output manually. Confirm RLS on sensitive tables and Storage policies.
- Review Supabase Auth > URL Configuration: production Site URL, exact Google OAuth callback and password reset redirect URLs.
- Verify Resend email sender/domain and Edge Function secrets (server-side only).
- Test registration, email verification, login, Google login, password reset, sign-out and session refresh.
- Test account roles and attempts to access admin pages using a regular member account.
- Verify moderation, profile verification, blocking, reports, messages, file attachments, account export and deletion.

## 2. Deploy on Vercel
1. Push project to a **private** Git repository (without `.env.local`).
2. Import the repository into Vercel; framework preset **Vite**.
3. Build command: `npm run build`. Output directory: `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in project Environment Variables for Production (and Preview only if intended).
5. Deploy; `vercel.json` supplies SPA fallback and baseline security headers.
6. Update Supabase Auth Site URL and allowed redirect URLs for your deployed domain.

## 3. Deploy on Netlify
1. Import the private repository.
2. Build command: `npm run build`; publish directory: `dist`.
3. Add the same two `VITE_` environment variables.
4. `public/_headers` supplies baseline security headers; `public/_redirects` supplies SPA fallback.
5. Update Supabase Auth URL Configuration to match your domain.

## 4. Production smoke test
- Open `/dashboard`, `/discover`, `/messages`, `/settings` directly (including refresh) and verify no 404.
- On mobile, test navigation, unread badges, messages and attachment upload/download.
- Verify database access rules with both regular and admin accounts; ensure cross-user data cannot be accessed improperly.
- Confirm email delivery, recovery links, account deletion and notification preferences.
- Inspect browser console and network requests for errors. Confirm HTTPS and headers on the actual deployed host.
- Configure uptime/error monitoring and a recovery/rollback plan; verify backups and restore procedures.

## Limitations
- This package does not deploy the app or change Supabase policies automatically.
- `deploy:check` checks local configuration only; cloud environment variables must also be configured.
- The security scripts are heuristic, not a security audit. A production launch requires manual access-control and abuse testing.
