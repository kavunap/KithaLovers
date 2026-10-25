# KithaLovers — Stage 22: Enhanced Profile Discovery

This project builds on the working Stage 21 project and keeps its existing features. Stage 22 improves discovery filters and recommends profiles with shared interests first.

## What's new

- Filter profiles by connection type (friendship, dating, or both).
- Filter by city or country.
- Filter by an interest keyword.
- Set a minimum and/or maximum age. Age is calculated from the member's saved date of birth; profiles without a date of birth won't appear when an age limit is applied.
- Optionally show verified profiles only. The badge still appears only when Stage 21's `verified_at` field is set by the approved verification workflow.
- Discovery ranks matching profiles by the number of shared interests, based on the interests saved for the signed-in member.
- Shows a shared-interest summary on the profile card and the number of profiles matching the current filters.
- Includes a one-click reset and responsive filter layout for mobile.

## Install / upgrade

1. Keep your working Stage 21 folder as a backup and extract this ZIP into a separate folder.
2. Copy your existing `.env.local` file into the new folder. Do not share it or commit it to source control.
3. Run:

   ```bash
   npm install
   npm run build
   ```

4. No new SQL migration is required for Stage 22. It uses the existing `profiles` fields (`birth_date`, `city`, `country`, `intent`, `verified_at`, and visibility/suspension fields) and the Stage 2 `profile_interests` / `interests` tables.
5. Deploy the updated frontend after `npm run build` succeeds.

## Test checklist

1. Sign in with a member account and open `/discover`.
2. Test each connection type and city/country filters.
3. Enter an interest keyword such as `music` and confirm only profiles with a matching interest remain.
4. Set minimum and maximum ages, then verify profiles outside the range are hidden. Confirm invalid ranges (minimum greater than maximum) show a warning.
5. Enable **Show verified profiles only** and confirm only profiles with an approved `verified_at` value appear.
6. Add interests to your own profile and confirm people with more shared interests appear first and display the shared-interest summary.
7. Use **Reset filters** and verify all filters clear.
8. Check the filter panel at desktop and mobile widths.

## Notes

- Recommendations are simple and transparent: they prioritize exact shared interest names; they do not guarantee compatibility.
- Existing request/match behavior, blocks, visibility rules, suspension filtering, and notification email invocation are retained.
- Keep the Stage 21 verification review process and its database security in place; do not award badges from browser-side code.

## Stage 23 — Favorites & Saved Profiles

1. Keep your working Stage 22 folder as a backup.
2. Copy your existing `.env.local` into this Stage 23 project.
3. Run `supabase/stage23_favorites.sql` in the Supabase SQL Editor **before** testing favorites.
4. Run `npm install` and `npm run build`, then `npm run dev`.
5. Sign in, open `/discover`, click the bookmark button on a profile, then open `/favorites` from the navigation. Remove and save again to test persistence.

Favorites are private (RLS owner-only SELECT/INSERT/DELETE), and are distinct from connection requests. Hidden, suspended, and blocked profiles are omitted from the saved-profile display. A favorite does not notify its owner. This stage does not change existing notification or matching migrations.


## Stage 24 — Profile Visitors & Activity Insights

1. Keep your existing `.env.local` configuration.
2. Run `supabase/stage24_profile_activity.sql` in Supabase SQL Editor after the Stage 23 migration.
3. Run `npm install`, `npm run build`, and `npm run dev`.
4. Open `/profile-activity` for counts, recent identifiable visitors, and the anonymous browsing toggle.
5. Open a member's full profile from Discover or My Favorites. Only full-profile visits are counted; viewing discovery cards is not tracked.

Privacy: anonymous browsing disables recording of new visits and hides existing identifiable visits from visitor lists while enabled. Existing aggregate counts may still include older visits. Visits are deduplicated for 30 minutes per visitor/profile. Favorites received is an aggregate only; it does not reveal who bookmarked you. Members can see only their own activity through the protected RPC.

## Stage 25 — Blocking and privacy management

**Review of Stage 24:** The existing `public.blocks` table, the chat **Block** button,
mutual block filtering in discovery/favorites/profile pages, and Stage 3 messaging
policies are retained. Stage 25 does not create a second block table or replace the
working block action.

1. Back up the Stage 24 project and database before applying changes.
2. Run `supabase/stage25_blocking_privacy.sql` in Supabase SQL Editor **after** the
   existing Stage 3, 23 and 24 migrations. It adds `profiles.connection_request_policy`,
   a block-aware profile/request/match policy, and insert checks for requests/favorites.
3. Copy `.env.local` from your working Stage 24 installation.
4. Run `npm install`, `npm run build`, then `npm run dev`.
5. Open `/blocked-users`. Block someone from a conversation or a member profile;
   confirm the member appears in the list and can be unblocked. Change the request
   preference to Nobody and test with a second account. Test blocked messages and
   requests using two accounts, including direct Supabase API calls.

**Privacy note:** Blocking hides member profiles, requests, matches and conversations
from regular member queries, but it does not delete old data. Previously sent email
notifications cannot be recalled. Other tables, RPCs, admin privileges and Edge
Functions should be reviewed separately before a public launch to ensure they do
not disclose blocked accounts or their information. Anonymous browsing settings
from Stage 24 remain separate.
