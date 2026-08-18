This is a [Next.js](https://nextjs.org) local-first gym app with optional Supabase authentication.

## Supabase groups setup

The `/groups` route requires an authenticated Supabase user. Run `supabase/migrations/202608170001_multiuser_groups.sql`, then `supabase/migrations/202608170002_repair_group_creation.sql`, `supabase/migrations/202608170003_fix_group_creation_ambiguity.sql`, `supabase/migrations/202608170004_fix_invite_creation_timing.sql`, `supabase/migrations/202608170005_fix_invite_crypto_schema.sql`, `supabase/migrations/202608170006_fix_join_invite_ambiguity.sql`, `supabase/migrations/202608170007_fix_join_rpc_return_shape.sql`, and finally `supabase/migrations/202608170008_group_routine_shares.sql` in that order in the Supabase SQL Editor. If Supabase is not configured or the migrations have not been applied, the local app and its anonymous routes remain available.

Shared routines are private read-only snapshots visible only to members of the selected group. Publishing copies routine metadata, ordered exercises, and prescribed sets into `group_routine_shares`; it never shares workout sessions, history, analytics, bodyweight, volume, or starting weights, and never changes the local Dexie routine. A publisher can revoke each share. The same local routine can be shared with multiple groups independently.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
