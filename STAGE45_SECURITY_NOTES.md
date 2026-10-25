# Stage 45 - Security & production readiness

## Installation
Copy your existing `.env.local` into your extracted project (do not commit it).
Run `npm install`, `npm run security:check`, and `npm run build`.

## What changed
- Explicit PKCE auth flow and token refresh/persistence configuration.
- Deployment security headers for Netlify (`public/_headers`) and Vercel (`vercel.json`).
- SPA fallback route on Vercel.
- Read-only SQL audit: `supabase/stage45_security_audit_readonly.sql`.
- Local project secret scanner: `npm run security:check`.

## Important limitations
- The scanner is heuristic and cannot prove the project is secure.
- Read-only SQL audit results must be reviewed manually. **Do not automatically enable RLS or revoke grants** without checking application requirements.
- PKCE changes may require testing email recovery, OAuth sign-in and redirect URLs in your Supabase Auth settings.
- Deploy with HTTPS and set Supabase Auth > URL Configuration to your exact production domain and redirect URLs.
- Only publish the Supabase publishable/anon key in `VITE_*` variables. Never expose the service-role key.
- Headers are applied by the respective deployment host; Vite dev mode does not emulate them.
- Confirm email templates, admin permissions, storage policies, abuse/rate limiting and data deletion workflows before production launch.
