This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Catalog setup (first deploy & after a new product spreadsheet)

```bash
npm run db:seed         # categories
npm run import:catalog  # builds listings + variants from prisma/data/chemicals-2026.ts (idempotent; new SKUs land in the hidden "Unsorted Imports" listing for admin sorting)
```

**Production (`start:prod`) runs this automatically** via `setup:catalog`:
`prisma migrate deploy && prisma db seed && tsx scripts/import-catalog.ts && next start`.
Both steps are idempotent and curation-preserving — `db:seed` only upserts categories, and the importer refreshes existing variants by SKU (never touching admin groupings/renames) while routing brand-new SKUs to the hidden "Unsorted Imports" listing. So a fresh/ephemeral deploy DB bootstraps the full catalog on boot, and a persistent DB keeps admin edits across deploys. Run the two commands above manually only for local setup or an out-of-band re-import.

> Deploy host (Coolify/Nixpacks): the start command must be `npm run start:prod` (not the default `npm start`) so migrations + catalog population run. If an existing deployed DB still has pre-variants flat rows, reset its volume so the next boot bootstraps cleanly.

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
