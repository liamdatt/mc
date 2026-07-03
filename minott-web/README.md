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
npm run db:seed         # the 12 product categories
npm run import:catalog  # listings + variants from the per-category modules in prisma/data/*.ts
```

The catalog data lives in one pre-grouped module per category (`prisma/data/<category>.ts`, typed by `_listing-types.ts`), generated from the client spreadsheet. Each module already decides its own variant grouping (size/pack = variants under one listing; strength/scent/colour = separate listings). The importer writes them **authoritatively**: listings are upserted by slug and variants by SKU (IDs stay stable so inquiry references survive), then anything not present in the modules is pruned — so the modules are the single source of truth for the catalog.

**Production (`start:prod`) runs this automatically** via `setup:catalog`:
`prisma migrate deploy && prisma db seed && tsx scripts/import-catalog.ts && next start`.
A fresh/ephemeral deploy DB is fully populated on boot; a persistent DB is reconciled to match the modules.

> Deploy host (Coolify/Nixpacks): the start command must be `npm run start:prod` (not the default `npm start`) so migrations + catalog population run.
>
> To refresh the catalog from a new spreadsheet, re-run the extraction into `prisma/data/*.ts` + `public/images/products/`, then `npm run import:catalog`.

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
