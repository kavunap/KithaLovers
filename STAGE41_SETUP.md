# Stage 41 — Admin Moderation and Member Management

Builds on the working Stage 40 release, retaining all existing functionality.

## New
- Case search by report ID, reason, details, and member names; sorting and pagination.
- Moderation case status change confirmation and per-case busy state.
- Member status filters, search, sort, pagination, and confirmation before suspension/reactivation.
- Operational summary cards and responsive styling in `src/styles.css`.

## Setup
Copy your existing `.env.local` and run `npm install`, `npm run build`, `npm run dev`. No new SQL migration.

## Test
Sign in as an administrator, open `/admin/moderation` and `/admin/users`, exercise filters, search, paging and updates. Test normal-member access denial.

Note: Lists retain the existing database fetch limits (200 reports and 500 members); pagination operates on those loaded results.
