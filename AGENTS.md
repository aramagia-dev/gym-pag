<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository guidance

- Use npm; `package-lock.json` is the authoritative lockfile. Install with `npm ci`.
- This is a Next.js 16 App Router project. The application entrypoints live under `app/`; the main page is `app/page.tsx`, and global styles are imported by `app/layout.tsx`.
- Before changing Next.js APIs, read the matching guide under `node_modules/next/dist/docs/`; this repository uses Next.js `16.3.1`.
- Tailwind CSS v4 is connected through `postcss.config.mjs` and `@tailwindcss/postcss`; there is no separate `tailwind.config.*` file.
- TypeScript is strict, uses bundler resolution, emits no files, and maps `@/*` to the repository root. Do not edit generated `next-env.d.ts`.
- Verify changes in this order: `npm run lint`, then `npm run build`. There is no test script or repository CI configuration; do not claim tests passed unless you run an available focused check.
- `npm run start` serves a previously successful production build; it is not a development check. Use `npm run dev` for local development.
