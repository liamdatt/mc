# Minott Multi-Page Site + Products DB + Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-page Minott site into a 6-page website with a Prisma/SQLite-backed products catalog, an "add to quote" flow, and a password-protected admin for managing products/categories and viewing inbound requests.

**Architecture:** Next.js 16 App Router on a Node server. Server Components read SQLite directly through a Prisma singleton; mutations go through Server Actions. Inbound messages (quote / sample / contact) are unified into one `Inquiry` model. Admin is gated by a signed httpOnly cookie checked in `middleware.ts`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Prisma + SQLite, `tsx` (seed runner), Web Crypto (HMAC session signing). Existing GSAP/Framer/Lenis motion system is preserved.

**Conventions (read before starting):**
- All commands run from `minott-web/` unless stated. `cd minott-web` first.
- Spec: `docs/superpowers/specs/2026-06-02-minott-multipage-products-admin-design.md`.
- Next.js 16 is **async-by-default**: `cookies()`, `headers()`, and route `params`/`searchParams` are Promises — always `await` them.
- Components use **named exports** (except Next.js `page.tsx`/`layout.tsx`/`middleware.ts` which need **default** exports for pages/layouts).
- Path alias `@/*` → project root. Helper `cn()` in `@/lib/cn`.
- There is **no automated test framework** (per spec, by user choice). Verification = `npx tsc --noEmit`, `npm run build`, `npm run lint`, and manual dev-server checks. Each task ends with a concrete verification + commit.

---

## Phase 0 — Database foundation

### Task 1: Install dependencies and initialize Prisma

**Files:**
- Modify: `minott-web/package.json`
- Create: `minott-web/prisma/schema.prisma` (via `prisma init`)
- Create/Modify: `minott-web/.env`, `minott-web/.gitignore`

- [ ] **Step 1: Install packages**

Run:
```bash
cd minott-web
npm install @prisma/client
npm install -D prisma tsx
```

- [ ] **Step 2: Initialize Prisma with SQLite**

Run:
```bash
npx prisma init --datasource-provider sqlite
```
Expected: creates `prisma/schema.prisma` and appends `DATABASE_URL` to `.env`.

- [ ] **Step 3: Set the database URL**

Edit `minott-web/.env` so the line reads exactly:
```
DATABASE_URL="file:./prisma/app.db"
ADMIN_PASSWORD="changeme-dev"
SESSION_SECRET="dev-only-insecure-secret-change-me"
```

- [ ] **Step 4: Ignore the DB file and env**

Ensure `minott-web/.gitignore` contains these lines (append if missing):
```
# database
/prisma/*.db
/prisma/*.db-journal

# env
.env
```
(`.env*` may already be ignored by the Next.js default — verify `.env` is covered; if a more specific allowlist exists, add `/prisma/*.db` regardless.)

- [ ] **Step 5: Add Prisma scripts to package.json**

In `minott-web/package.json`, set the `"scripts"` block to:
```json
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start",
    "lint": "eslint",
    "postinstall": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  },
```
And add a top-level `"prisma"` key (sibling of `"scripts"`):
```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
```

- [ ] **Step 6: Commit**

```bash
git add minott-web/package.json minott-web/package-lock.json minott-web/prisma/schema.prisma minott-web/.gitignore
git commit -m "chore: add Prisma + SQLite tooling and scripts"
```

---

### Task 2: Define the Prisma schema and run the first migration

**Files:**
- Modify: `minott-web/prisma/schema.prisma`

- [ ] **Step 1: Write the full schema**

Replace the contents of `minott-web/prisma/schema.prisma` with:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Category {
  id          Int       @id @default(autoincrement())
  slug        String    @unique
  name        String
  description String?
  imagePath   String?
  sortOrder   Int       @default(0)
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Product {
  id               Int           @id @default(autoincrement())
  slug             String        @unique
  name             String
  category         Category      @relation(fields: [categoryId], references: [id])
  categoryId       Int
  shortDescription String?
  description      String?
  imagePath        String        @default("/images/product-placeholder.png")
  isChemical       Boolean       @default(false)
  sdsUrl           String?
  sampleAvailable  Boolean       @default(false)
  sku              String?
  featured         Boolean       @default(false)
  active           Boolean       @default(true)
  sortOrder        Int           @default(0)
  inquiryItems     InquiryItem[]
  sampleInquiries  Inquiry[]     @relation("SampleInquiryProduct")
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}

model Inquiry {
  id        Int           @id @default(autoincrement())
  type      String // "QUOTE" | "SAMPLE" | "CONTACT"
  status    String        @default("NEW") // "NEW" | "IN_PROGRESS" | "CLOSED"
  name      String
  company   String?
  email     String
  phone     String?
  message   String?
  product   Product?      @relation("SampleInquiryProduct", fields: [productId], references: [id], onDelete: SetNull)
  productId Int?
  items     InquiryItem[]
  createdAt DateTime      @default(now())
}

model InquiryItem {
  id          Int      @id @default(autoincrement())
  inquiry     Inquiry  @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  inquiryId   Int
  product     Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  productId   Int?
  productName String
  quantity    Int      @default(1)
}
```

- [ ] **Step 2: Create and apply the migration**

Run:
```bash
npx prisma migrate dev --name init
```
Expected: prints "Your database is now in sync with your schema", creates `prisma/migrations/<timestamp>_init/`, and generates the Prisma client.

- [ ] **Step 3: Verify the client generated**

Run:
```bash
npx prisma validate
```
Expected: "The schema at prisma/schema.prisma is valid 🚀".

- [ ] **Step 4: Commit**

```bash
git add minott-web/prisma/schema.prisma minott-web/prisma/migrations
git commit -m "feat(db): add categories, products, and unified inquiry schema"
```

---

### Task 3: Prisma client singleton + shared constants

**Files:**
- Create: `minott-web/lib/db.ts`
- Create: `minott-web/lib/constants.ts`

- [ ] **Step 1: Write the Prisma singleton**

Create `minott-web/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 2: Write inquiry constants**

Create `minott-web/lib/constants.ts`:
```ts
export const INQUIRY_TYPE = {
  QUOTE: "QUOTE",
  SAMPLE: "SAMPLE",
  CONTACT: "CONTACT",
} as const;
export type InquiryType = (typeof INQUIRY_TYPE)[keyof typeof INQUIRY_TYPE];

export const INQUIRY_STATUS = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  CLOSED: "CLOSED",
} as const;
export type InquiryStatus = (typeof INQUIRY_STATUS)[keyof typeof INQUIRY_STATUS];

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  CLOSED: "Closed",
};

export const INQUIRY_TYPE_LABELS: Record<string, string> = {
  QUOTE: "Quote request",
  SAMPLE: "Sample request",
  CONTACT: "Contact message",
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add minott-web/lib/db.ts minott-web/lib/constants.ts
git commit -m "feat(db): add Prisma singleton and inquiry constants"
```

---

### Task 4: Add the product placeholder image

**Files:**
- Create: `minott-web/public/images/product-placeholder.png` (copied from `assets/2.png`)

- [ ] **Step 1: Copy the placeholder**

Run (from repo root):
```bash
cp "assets/2.png" minott-web/public/images/product-placeholder.png
```

- [ ] **Step 2: Verify it exists**

Run: `ls -la minott-web/public/images/product-placeholder.png`
Expected: file listed with non-zero size.

- [ ] **Step 3: Commit**

```bash
git add minott-web/public/images/product-placeholder.png
git commit -m "chore: add product placeholder image"
```

---

### Task 5: Slugify helper + product read helpers

**Files:**
- Create: `minott-web/lib/slug.ts`
- Create: `minott-web/lib/products.ts`

- [ ] **Step 1: Write the slugify helper**

Create `minott-web/lib/slug.ts`:
```ts
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 2: Write the read helpers**

Create `minott-web/lib/products.ts`:
```ts
import { db } from "@/lib/db";

export function getCategories() {
  return db.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export function getCatalog() {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export function getCategoryBySlug(slug: string) {
  return db.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export function getFeaturedProducts() {
  return db.product.findMany({
    where: { active: true, featured: true },
    orderBy: { sortOrder: "asc" },
    include: { category: true },
    take: 8,
  });
}

export async function getProductBySlugInCategory(
  categorySlug: string,
  productSlug: string,
) {
  const product = await db.product.findUnique({
    where: { slug: productSlug },
    include: { category: true },
  });
  if (!product || !product.active || product.category.slug !== categorySlug) {
    return null;
  }
  return product;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add minott-web/lib/slug.ts minott-web/lib/products.ts
git commit -m "feat(db): add slugify and product read helpers"
```

---

### Task 6: Seed script

**Files:**
- Create: `minott-web/prisma/seed.ts`

- [ ] **Step 1: Write the seed script**

Create `minott-web/prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type SeedProduct = {
  name: string;
  shortDescription: string;
  isChemical?: boolean;
  featured?: boolean;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const CATEGORIES: {
  name: string;
  description: string;
  imagePath: string;
  products: SeedProduct[];
}[] = [
  {
    name: "Industrial & Household Chemicals",
    description:
      "Manufactured on our Kingston floor — our own extensive line of cleaning and maintenance chemicals.",
    imagePath: "/images/product-chemicals.jpg",
    products: [
      { name: "Time Saver All-Purpose Cleaner", shortDescription: "Versatile cleaner for kitchens, surfaces and equipment.", isChemical: true, featured: true },
      { name: "Industrial Degreaser", shortDescription: "Heavy-duty degreaser for floors and machinery.", isChemical: true },
      { name: "Disinfectant Concentrate", shortDescription: "Kills bacteria; meets government sanitation specs.", isChemical: true, featured: true },
      { name: "Chlorine Bleach", shortDescription: "Commercial-strength bleach for whitening and sanitizing.", isChemical: true },
      { name: "Hand Soap", shortDescription: "Gentle, economical hand soap for high-traffic washrooms.", isChemical: true },
      { name: "Floor Cleaner", shortDescription: "Neutral pH daily floor cleaner for polished surfaces.", isChemical: true },
      { name: "Deodoriser", shortDescription: "Long-lasting odour control for restrooms and bins.", isChemical: true },
      { name: "Carpet & Upholstery Cleaner", shortDescription: "Extraction-ready formula for carpets and soft furnishings.", isChemical: true },
    ],
  },
  {
    name: "Janitorial Equipment & Supplies",
    description:
      "Floor care, carts, and the everyday tools that keep facilities running.",
    imagePath: "/images/product-janitorial.jpg",
    products: [
      { name: "Rubbermaid Housekeeping Cart", shortDescription: "Commercial cleaning cart with organised storage.", featured: true },
      { name: "Mop Bucket & Wringer", shortDescription: "Heavy-duty bucket with side-press wringer.", featured: true },
      { name: "Wet/Dry Vacuum", shortDescription: "Powerful pickup for liquids and debris.", featured: true },
      { name: "Microfibre Wipes", shortDescription: "Lint-free cloths for streak-free cleaning." },
      { name: "Broom & Dustpan Set", shortDescription: "Durable broom paired with a lobby dustpan." },
      { name: "Floor Cleaning Mop", shortDescription: "Replaceable-head mop for daily floor care." },
      { name: "Garbage Bags", shortDescription: "Strong liners in commercial bin sizes." },
      { name: "Safety Cones & Wet-Floor Signs", shortDescription: "High-visibility hazard signage." },
      { name: "Waste & Recycling Bins", shortDescription: "Rubbermaid containers for any environment." },
    ],
  },
  {
    name: "Personal Protection Equipment (PPE)",
    description:
      "Gloves, masks, and protective wear that keep your people safe.",
    imagePath: "/images/product-ppe.jpg",
    products: [
      { name: "Nitrile Gloves", shortDescription: "Powder-free disposable gloves, box of 100.", featured: true },
      { name: "Latex Gloves", shortDescription: "Comfortable, flexible disposable gloves." },
      { name: "Surgical Gloves", shortDescription: "Sterile gloves for medical settings." },
      { name: "KN95 Masks", shortDescription: "High-filtration respiratory protection.", featured: true },
      { name: "Surgical Masks", shortDescription: "3-ply disposable masks, box of 50." },
      { name: "Isolation Gowns", shortDescription: "Fluid-resistant protective gowns." },
      { name: "Safety Goggles", shortDescription: "Clear, anti-fog eye protection." },
      { name: "Safety & Water Boots", shortDescription: "Slip-resistant protective footwear." },
    ],
  },
  {
    name: "Paper Products",
    description:
      "Hand towels, tissue, and dispensers — so you never run out.",
    imagePath: "/images/product-paper.jpg",
    products: [
      { name: "Multifold Hand Towels", shortDescription: "Absorbent folded towels for washroom dispensers.", featured: true },
      { name: "Jumbo Roll Tissue", shortDescription: "Long-lasting bathroom tissue for high-traffic areas." },
      { name: "Bathroom Tissue", shortDescription: "Soft 2-ply tissue in case quantities." },
      { name: "Paper Napkins", shortDescription: "Food-service napkins in bulk." },
      { name: "Towel & Tissue Dispensers", shortDescription: "Durable wall-mounted dispensers." },
    ],
  },
];

async function main() {
  let categorySort = 0;
  for (const cat of CATEGORIES) {
    const categorySlug = slugify(cat.name);
    const category = await db.category.upsert({
      where: { slug: categorySlug },
      update: {
        name: cat.name,
        description: cat.description,
        imagePath: cat.imagePath,
        sortOrder: categorySort,
      },
      create: {
        slug: categorySlug,
        name: cat.name,
        description: cat.description,
        imagePath: cat.imagePath,
        sortOrder: categorySort,
      },
    });
    categorySort += 1;

    let productSort = 0;
    for (const p of cat.products) {
      const productSlug = slugify(p.name);
      await db.product.upsert({
        where: { slug: productSlug },
        update: {
          name: p.name,
          categoryId: category.id,
          shortDescription: p.shortDescription,
          isChemical: p.isChemical ?? false,
          sampleAvailable: p.isChemical ?? false,
          featured: p.featured ?? false,
          sortOrder: productSort,
        },
        create: {
          slug: productSlug,
          name: p.name,
          categoryId: category.id,
          shortDescription: p.shortDescription,
          isChemical: p.isChemical ?? false,
          sampleAvailable: p.isChemical ?? false,
          featured: p.featured ?? false,
          sortOrder: productSort,
        },
      });
      productSort += 1;
    }
  }
  console.log("Seed complete.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: Run the seed**

Run:
```bash
npx prisma db seed
```
Expected: prints "Seed complete." with no errors.

- [ ] **Step 3: Verify the data**

Run:
```bash
npx prisma studio
```
Open the printed URL, confirm 4 categories and ~30 products exist, then stop it (Ctrl-C). (Or run `node -e "const {PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.product.count().then(c=>{console.log('products',c);return d.\$disconnect()})"` and expect `products 30`.)

- [ ] **Step 4: Commit**

```bash
git add minott-web/prisma/seed.ts
git commit -m "feat(db): add catalog seed script"
```

---

## Phase 1 — Auth & admin gate

### Task 7: Session signing (Web Crypto HMAC)

**Files:**
- Create: `minott-web/lib/auth/session.ts`

This uses the Web Crypto API (available in both the Node server runtime and the Edge middleware runtime) so the same code verifies the cookie in `middleware.ts` and signs it in Server Actions.

- [ ] **Step 1: Write the session module**

Create `minott-web/lib/auth/session.ts`:
```ts
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  secret: string,
  ttlMs: number,
): Promise<string> {
  const payload = bytesToB64url(
    encoder.encode(JSON.stringify({ exp: Date.now() + ttlMs })),
  );
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bytesToB64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  secret: string,
  token: string | undefined,
): Promise<boolean> {
  if (!secret || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sig),
      encoder.encode(payload),
    );
    if (!valid) return false;
    const { exp } = JSON.parse(decoder.decode(b64urlToBytes(payload)));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = "mec_admin";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Sanity-check sign/verify round-trip**

Run:
```bash
node --input-type=module -e "
const { signSession, verifySession } = await import('./lib/auth/session.ts').catch(()=>({}));
" 2>/dev/null || echo "skip (ts not directly runnable) — verified via build instead"
```
(If the direct import fails because it's TypeScript, that's fine — correctness is confirmed by `tsc` in Step 2 and the manual login test in Task 11.)

- [ ] **Step 4: Commit**

```bash
git add minott-web/lib/auth/session.ts
git commit -m "feat(auth): add Web Crypto HMAC session signing"
```

---

### Task 8: Auth server actions

**Files:**
- Create: `minott-web/lib/actions/auth.ts`

- [ ] **Step 1: Write the auth actions**

Create `minott-web/lib/actions/auth.ts`:
```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  signSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { error: "Incorrect password." };
  }
  const token = await signSession(
    process.env.SESSION_SECRET ?? "",
    SESSION_TTL_MS,
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add minott-web/lib/actions/auth.ts
git commit -m "feat(auth): add login/logout server actions"
```

---

### Task 9: Middleware to guard /admin/*

**Files:**
- Create: `minott-web/middleware.ts`

- [ ] **Step 1: Write the middleware**

Create `minott-web/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login page itself through.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySession(process.env.SESSION_SECRET ?? "", token);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add minott-web/middleware.ts
git commit -m "feat(auth): guard /admin/* with session middleware"
```

---

### Task 10: Admin login page

**Files:**
- Create: `minott-web/app/admin/login/page.tsx`

- [ ] **Step 1: Write the login page**

Create `minott-web/app/admin/login/page.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";

const initial: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="grid min-h-screen place-items-center bg-mec-ink px-6 text-mec-pure">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-md border border-white/10 bg-white/5 p-8"
      >
        <p className="font-display text-3xl tracking-wider">
          <span className="text-mec-red">MEC</span> Admin
        </p>
        <p className="mt-2 text-sm text-mec-pure/60">
          Enter the admin password to continue.
        </p>

        <label
          htmlFor="password"
          className="mt-8 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-pure/70"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="mt-2 w-full rounded-sm border border-white/20 bg-mec-ink px-4 py-3 text-mec-pure outline-none focus:border-mec-red"
        />

        {state.error && (
          <p className="mt-3 text-sm text-mec-red">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full bg-mec-red px-6 py-3 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add minott-web/app/admin/login/page.tsx
git commit -m "feat(admin): add login page"
```

---

### Task 11: Admin layout (server gate + chrome)

**Files:**
- Create: `minott-web/app/admin/layout.tsx`

- [ ] **Step 1: Write the admin layout**

Create `minott-web/app/admin/layout.tsx`:
```tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/requests", label: "Requests" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const authed = await verifySession(process.env.SESSION_SECRET ?? "", token);
  if (!authed) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-mec-mist text-mec-ink">
      <aside className="flex w-56 flex-col border-r border-black/10 bg-mec-pure p-6">
        <Link href="/admin" className="font-display text-2xl tracking-wider">
          <span className="text-mec-red">MEC</span> Admin
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-sm px-3 py-2 text-sm font-semibold hover:bg-mec-mist"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-sm border border-black/15 px-3 py-2 text-sm font-semibold hover:border-mec-red hover:text-mec-red"
          >
            Log out
          </button>
        </form>
        <Link
          href="/"
          className="mt-3 text-xs text-mec-ink/60 hover:text-mec-red"
        >
          ← View site
        </Link>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

> Note: this admin layout renders its own `<aside>`/`<main>` but inherits the root `<html>`/`<body>` from `app/layout.tsx`, including the public Nav/Footer. Task 21 removes the public Nav/Footer from `/admin` and `/admin/login` so the admin UI stands alone.

- [ ] **Step 2: Manual verification of the auth gate**

Run: `npm run dev`
- Visit `http://localhost:3000/admin` → expect redirect to `/admin/login`.
- Enter the wrong password → expect "Incorrect password."
- Enter `changeme-dev` (the `.env` value) → expect redirect to `/admin` (which 404s until Task 28 — that's fine; the redirect proves auth works).
Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add minott-web/app/admin/layout.tsx
git commit -m "feat(admin): add gated admin layout shell"
```

---

## Phase 2 — Inquiry actions + quote cart

### Task 12: Inquiry server actions (quote / sample / contact)

**Files:**
- Create: `minott-web/lib/actions/inquiries.ts`

- [ ] **Step 1: Write the inquiry actions**

Create `minott-web/lib/actions/inquiries.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { INQUIRY_TYPE } from "@/lib/constants";

export type InquiryResult = { ok: boolean; error?: string };

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function requireContact(formData: FormData): InquiryResult | null {
  if (!field(formData, "name")) return { ok: false, error: "Name is required." };
  if (!field(formData, "email"))
    return { ok: false, error: "Email is required." };
  return null;
}

export async function submitContact(
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
  const bad = requireContact(formData);
  if (bad) return bad;
  await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.CONTACT,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
    },
  });
  return { ok: true };
}

export async function submitSample(
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
  const bad = requireContact(formData);
  if (bad) return bad;
  const productId = Number(formData.get("productId"));
  await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.SAMPLE,
      productId: Number.isFinite(productId) ? productId : null,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
    },
  });
  return { ok: true };
}

type CartLine = { productId?: number; productName: string; quantity: number };

export async function submitQuote(
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
  const bad = requireContact(formData);
  if (bad) return bad;

  let items: CartLine[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "Could not read your quote list." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Your quote list is empty." };
  }

  await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.QUOTE,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
      items: {
        create: items.map((i) => ({
          productId:
            typeof i.productId === "number" ? i.productId : null,
          productName: String(i.productName).slice(0, 200),
          quantity:
            Number.isFinite(i.quantity) && i.quantity > 0
              ? Math.floor(i.quantity)
              : 1,
        })),
      },
    },
  });
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add minott-web/lib/actions/inquiries.ts
git commit -m "feat(inquiries): add quote/sample/contact server actions"
```

---

### Task 13: Quote cart provider (client, localStorage)

**Files:**
- Create: `minott-web/components/quote/QuoteCartProvider.tsx`

- [ ] **Step 1: Write the provider + hook**

Create `minott-web/components/quote/QuoteCartProvider.tsx`:
```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type QuoteItem = {
  productId: number;
  slug: string;
  name: string;
  imagePath: string;
  categorySlug: string;
  quantity: number;
};

type QuoteCartValue = {
  items: QuoteItem[];
  count: number;
  addItem: (item: Omit<QuoteItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "mec_quote_cart";
const QuoteCartContext = createContext<QuoteCartValue | null>(null);

export function QuoteCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<QuoteItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((p) => p.productId === item.productId);
        if (existing) {
          return prev.map((p) =>
            p.productId === item.productId
              ? { ...p, quantity: p.quantity + quantity }
              : p,
          );
        }
        return [...prev, { ...item, quantity }];
      });
    },
    [],
  );

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) =>
      prev
        .map((p) =>
          p.productId === productId
            ? { ...p, quantity: Math.max(1, Math.floor(quantity)) }
            : p,
        )
        .filter((p) => p.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<QuoteCartValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      addItem,
      removeItem,
      setQuantity,
      clear,
    }),
    [items, addItem, removeItem, setQuantity, clear],
  );

  return (
    <QuoteCartContext.Provider value={value}>
      {children}
    </QuoteCartContext.Provider>
  );
}

export function useQuoteCart(): QuoteCartValue {
  const ctx = useContext(QuoteCartContext);
  if (!ctx)
    throw new Error("useQuoteCart must be used within QuoteCartProvider");
  return ctx;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add minott-web/components/quote/QuoteCartProvider.tsx
git commit -m "feat(quote): add localStorage quote cart provider"
```

---

### Task 14: Add-to-Quote button (client)

**Files:**
- Create: `minott-web/components/quote/AddToQuoteButton.tsx`

- [ ] **Step 1: Write the button**

Create `minott-web/components/quote/AddToQuoteButton.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useQuoteCart, type QuoteItem } from "./QuoteCartProvider";
import { cn } from "@/lib/cn";

export function AddToQuoteButton({
  product,
  quantity = 1,
  variant = "primary",
  className,
}: {
  product: Omit<QuoteItem, "quantity">;
  quantity?: number;
  variant?: "primary" | "ghost-dark";
  className?: string;
}) {
  const { addItem } = useQuoteCart();
  const [added, setAdded] = useState(false);

  const base =
    "group inline-flex items-center justify-center gap-2 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.97]";
  const styles =
    variant === "ghost-dark"
      ? "border border-white/30 text-mec-pure hover:border-mec-red hover:text-mec-red"
      : "bg-mec-red text-mec-pure hover:bg-mec-red-hover";

  return (
    <button
      type="button"
      data-cursor="Add"
      className={cn(base, styles, className)}
      onClick={() => {
        addItem(product, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" aria-hidden /> Added
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" aria-hidden /> Add to Quote
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add minott-web/components/quote/AddToQuoteButton.tsx
git commit -m "feat(quote): add Add-to-Quote button"
```

---

## Phase 3 — Layout, Nav, and public pages

### Task 15: Mount cart provider + pass categories to Nav in root layout

**Files:**
- Modify: `minott-web/app/layout.tsx`

- [ ] **Step 1: Update the root layout**

In `minott-web/app/layout.tsx`:

1. Make the default export `async`.
2. Add imports near the other component imports:
```tsx
import { QuoteCartProvider } from "@/components/quote/QuoteCartProvider";
import { getCategories } from "@/lib/products";
```
3. Change the function signature and fetch categories at the top of the body:
```tsx
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const categories = await getCategories();
```
4. Wrap the existing provider tree with `QuoteCartProvider` and pass `categories` to `Nav`. Replace the existing `<MotionRoot>…</MotionRoot>` block with:
```tsx
        <QuoteCartProvider>
          <MotionRoot>
            <LenisProvider>
              <Nav
                categories={categories.map((c) => ({
                  slug: c.slug,
                  name: c.name,
                }))}
              />
              <main id="main">{children}</main>
              <Footer />
            </LenisProvider>
          </MotionRoot>
        </QuoteCartProvider>
```

- [ ] **Step 2: Typecheck (expect a Nav prop error until Task 16)**

Run: `npx tsc --noEmit`
Expected: an error that `Nav` does not accept a `categories` prop. This is expected and fixed in Task 16. (If you prefer a clean checkpoint, do Task 16 before committing.)

- [ ] **Step 3: Commit**

```bash
git add minott-web/app/layout.tsx
git commit -m "feat(layout): mount quote cart provider and load categories for nav"
```

---

### Task 16: Rewrite Nav for routes + Products dropdown + cart badge

**Files:**
- Modify: `minott-web/components/layout/Nav.tsx` (full replacement)

- [ ] **Step 1: Replace Nav with the route-based version**

Replace the entire contents of `minott-web/components/layout/Nav.tsx` with:
```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { useQuoteCart } from "@/components/quote/QuoteCartProvider";
import { cn } from "@/lib/cn";

type CategoryLink = { slug: string; name: string };

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/products", label: "Products", hasDropdown: true },
  { href: "/solutions", label: "Solutions" },
  { href: "/social-responsibility", label: "Social Responsibility" },
  { href: "/contact", label: "Contact" },
];

export function Nav({ categories }: { categories: CategoryLink[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { count } = useQuoteCart();

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      if (y > lastY && y > 200) setHidden(true);
      else setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the mobile overlay whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkColor = scrolled ? "text-mec-pure" : "text-mec-ink";

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-0 right-0 top-0 z-[120] transition-[background,backdrop-filter] duration-300",
          scrolled ? "bg-mec-ink/90 backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className={cn(
              "font-display text-2xl tracking-wider transition-colors",
              linkColor,
            )}
            data-cursor="Home"
          >
            <span className="text-mec-red">MEC</span>{" "}
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70 font-[var(--font-body)]">
              Minott Chemicals
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {LINKS.map((l) => (
              <div key={l.href} className="group relative">
                <Link
                  href={l.href}
                  className={cn(
                    "relative flex items-center gap-1 text-sm font-semibold uppercase tracking-[0.12em] transition-colors hover:text-mec-red",
                    linkColor,
                    isActive(l.href) && "text-mec-red",
                  )}
                  data-cursor="View"
                >
                  {l.label}
                  {l.hasDropdown && (
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  )}
                </Link>
                {l.hasDropdown && categories.length > 0 && (
                  <div className="invisible absolute left-1/2 top-full z-[130] w-64 -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                    <div className="overflow-hidden rounded-md border border-black/10 bg-mec-pure py-2 shadow-[var(--shadow-card)]">
                      <Link
                        href="/products"
                        className="block px-5 py-2 text-sm font-semibold text-mec-ink hover:bg-mec-mist hover:text-mec-red"
                      >
                        All Products
                      </Link>
                      <div className="my-1 h-px bg-black/5" />
                      {categories.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/products/${c.slug}`}
                          className="block px-5 py-2 text-sm text-mec-ink/80 hover:bg-mec-mist hover:text-mec-red"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <Link
              href="/quote"
              className={cn(
                "relative inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] transition-colors hover:text-mec-red",
                linkColor,
              )}
              data-cursor="View"
            >
              <FileText className="h-4 w-4" aria-hidden />
              Quote
              {count > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-mec-red px-1 text-[11px] font-bold text-mec-pure">
                  {count}
                </span>
              )}
            </Link>
            <Button href="/contact" variant="primary" arrow>
              Contact
            </Button>
          </div>

          <button
            type="button"
            className={cn(
              "lg:hidden transition-colors",
              scrolled || open ? "text-mec-pure" : "text-mec-ink",
            )}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-mec-ink lg:hidden"
          >
            <nav className="flex flex-col items-center gap-6 py-24 text-center">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.08 + i * 0.05,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "font-display text-4xl tracking-wider text-mec-pure",
                      isActive(l.href) && "text-mec-red",
                    )}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Link
                  href="/quote"
                  onClick={() => setOpen(false)}
                  className="font-display text-2xl tracking-wider text-mec-pure/80"
                >
                  My Quote {count > 0 ? `(${count})` : ""}
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the Task 15 layout error is now resolved).

- [ ] **Step 3: Commit**

```bash
git add minott-web/components/layout/Nav.tsx
git commit -m "feat(nav): route-based nav with products dropdown and quote badge"
```

---

### Task 17: Update Footer links to routes

**Files:**
- Modify: `minott-web/components/layout/Footer.tsx`

- [ ] **Step 1: Repoint the quick-links and logo**

In `minott-web/components/layout/Footer.tsx`:

Replace the `QUICK` array with:
```tsx
const QUICK = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/solutions", label: "Solutions" },
  { href: "/about", label: "About Us" },
  { href: "/social-responsibility", label: "Social Responsibility" },
  { href: "/contact", label: "Contact" },
];
```

Change the logo link `href="#top"` (the `<Link>` near the top of the footer) to `href="/"`.

Make the "Our Products" list items link to category pages — replace the `PRODUCTS` block render:
```tsx
        <div className="md:col-span-3">
          <h3 className="eyebrow text-mec-pure">Our Products</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {PRODUCTS.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="hover:text-mec-red">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
```
And replace the `PRODUCTS` constant with:
```tsx
const PRODUCTS = [
  { href: "/products/industrial-and-household-chemicals", label: "Industrial & Household Chemicals" },
  { href: "/products/janitorial-equipment-and-supplies", label: "Janitorial Equipment & Supplies" },
  { href: "/products/personal-protection-equipment-ppe", label: "Personal Protection Equipment" },
  { href: "/products/paper-products", label: "Paper Products" },
];
```
(These slugs match `slugify()` output for the seeded category names.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add minott-web/components/layout/Footer.tsx
git commit -m "feat(footer): point links to real routes"
```

---

### Task 18: Repoint section CTAs (Hero, ProductCategories) + convert QuoteCTA to a banner

**Files:**
- Modify: `minott-web/components/sections/Hero.tsx`
- Modify: `minott-web/components/sections/ProductCategories.tsx`
- Modify: `minott-web/components/sections/QuoteCTA.tsx` (full replacement)

- [ ] **Step 1: Hero CTAs → routes**

In `minott-web/components/sections/Hero.tsx`, change the two buttons:
- `<Button href="#contact" variant="primary" arrow>Request a Quote</Button>` → `href="/quote"`
- `<Button href="#products" variant="ghost">See Our Products</Button>` → `href="/products"`

- [ ] **Step 2: ProductCategories card CTA → category route**

In `minott-web/components/sections/ProductCategories.tsx`:
1. Add a `href` to each entry in the `CARDS` array (add the property to all four objects):
```tsx
  { img: "/images/product-chemicals.jpg", href: "/products/industrial-and-household-chemicals", eyebrow: "01 / 04", title: "Formulated for Jamaica.", cat: "Industrial & Household Chemicals", items: ["Floor cleaners", "Disinfectants", "Degreasers", "Bleach", "Sanitizers"] },
  { img: "/images/product-janitorial.jpg", href: "/products/janitorial-equipment-and-supplies", eyebrow: "02 / 04", title: "Built for the work.", cat: "Janitorial Equipment & Supplies", items: ["Vacuums", "Mops", "Carts", "Brooms", "Buckets", "Bins"] },
  { img: "/images/product-ppe.jpg", href: "/products/personal-protection-equipment-ppe", eyebrow: "03 / 04", title: "Protection that fits.", cat: "Personal Protection Equipment", items: ["Surgical gloves", "Nitrile", "Latex", "Masks", "Isolation gowns"] },
  { img: "/images/product-paper.jpg", href: "/products/paper-products", eyebrow: "04 / 04", title: "Never run out.", cat: "Paper Products", items: ["Hand towels", "Jumbo roll", "Bathroom tissue", "Napkins", "Dispensers"] },
```
2. Add `href: string;` to both the `CARDS`-derived `ProductCard` prop type and the function params, and change the card's button from `<Button href="#contact" variant="ghost-dark" arrow>View Products</Button>` to `<Button href={href} variant="ghost-dark" arrow>View Products</Button>`.

- [ ] **Step 3: Replace QuoteCTA with a CTA banner (no inline form)**

The dedicated contact form lives on `/contact` and quote submission on `/quote`, so QuoteCTA becomes a marketing banner with two buttons. Replace the entire contents of `minott-web/components/sections/QuoteCTA.tsx` with:
```tsx
"use client";
import { useRef } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/primitives/Container";
import { Button } from "@/components/primitives/Button";

export function QuoteCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-mec-ink py-[var(--spacing-section-y)] text-mec-pure"
    >
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-0 origin-left bg-mec-red"
      />
      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mec-pure/80">
            ★ Request a Quote
          </p>
          <h2 className="mt-6 max-w-4xl font-display-tight text-[clamp(3rem,7vw,7rem)] leading-[0.95] text-mec-pure">
            Your space. Our standard.
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-mec-pure/90">
            Tell us what you need clean. We&apos;ll quote it within one business
            day.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button href="/products" variant="primary" arrow>
              Browse Products
            </Button>
            <Button href="/contact" variant="ghost-dark">
              Talk to a Consultant
            </Button>
          </div>
          <p className="mt-6 text-sm text-mec-pure/80">
            Or call us directly:{" "}
            <a
              href="tel:+18769295284"
              className="font-semibold underline-offset-4 hover:underline"
              data-cursor="Call"
            >
              (876) 929-5284
            </a>
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add minott-web/components/sections/Hero.tsx minott-web/components/sections/ProductCategories.tsx minott-web/components/sections/QuoteCTA.tsx
git commit -m "feat(sections): repoint CTAs to routes; QuoteCTA becomes a banner"
```

---

### Task 19: Home page (trim composition)

**Files:**
- Modify: `minott-web/app/page.tsx` (full replacement)

- [ ] **Step 1: Replace the home page**

Replace the contents of `minott-web/app/page.tsx` with:
```tsx
import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { DualPlay } from "@/components/sections/DualPlay";
import { ProductCategories } from "@/components/sections/ProductCategories";
import { NumbersBar } from "@/components/sections/NumbersBar";
import { QuoteCTA } from "@/components/sections/QuoteCTA";

export default function HomePage() {
  return (
    <>
      <span id="top" className="sr-only" />
      <Hero />
      <TrustBar />
      <DualPlay />
      <ProductCategories />
      <NumbersBar />
      <QuoteCTA />
    </>
  );
}
```

- [ ] **Step 2: Manual check**

Run `npm run dev`, open `http://localhost:3000/`. Expect the home page to render with Hero, brands marquee, dual-play, the pinned product categories, numbers, and the new CTA banner. The Products nav dropdown should list the 4 seeded categories. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add minott-web/app/page.tsx
git commit -m "feat(home): trim home page composition for multi-page site"
```

---

### Task 20: About, Solutions, and Social Responsibility pages

**Files:**
- Create: `minott-web/app/about/page.tsx`
- Create: `minott-web/app/solutions/page.tsx`
- Create: `minott-web/app/social-responsibility/page.tsx`

- [ ] **Step 1: About page**

Create `minott-web/app/about/page.tsx`:
```tsx
import type { Metadata } from "next";
import { FounderStory } from "@/components/sections/FounderStory";
import { DualPlay } from "@/components/sections/DualPlay";
import { NumbersBar } from "@/components/sections/NumbersBar";
import { TrustBar } from "@/components/sections/TrustBar";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export const metadata: Metadata = {
  title: "About Us — Minott Equipment & Chemicals Limited",
  description:
    "Founded by Chester G. Minott over 35 years ago, MEC is Jamaica's dual-play manufacturer of chemicals and Elite Distributor for the world's leading cleaning brands.",
};

export default function AboutPage() {
  return (
    <>
      <Section tone="light" className="pt-40">
        <Container>
          <Eyebrow tone="red">About Minott</Eyebrow>
          <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
            35+ years keeping Jamaica clean.
          </h1>
          <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
            Minott Equipment &amp; Chemicals Limited began over 35 years ago as a
            cleaning-equipment distributor. Today we are both a manufacturer of
            our own extensive chemical line and the Elite Distributor for 3M,
            NSS, San Jamar, Rubbermaid Commercial, and Purell.
          </p>
        </Container>
      </Section>
      <FounderStory />
      <DualPlay />
      <NumbersBar />
      <TrustBar />
    </>
  );
}
```

- [ ] **Step 2: Solutions page**

Create `minott-web/app/solutions/page.tsx`:
```tsx
import type { Metadata } from "next";
import { IndustriesGrid } from "@/components/sections/IndustriesGrid";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export const metadata: Metadata = {
  title: "Solutions — Industries We Serve | Minott Chemicals",
  description:
    "Tailored cleaning, sanitation, and PPE programs for hospitality, medical, manufacturing, financial, telecoms, entertainment, retail, janitorial, and sanitation operations across Jamaica.",
};

const INDUSTRIES = [
  { name: "Hospitality", blurb: "Hotels and resorts: housekeeping carts, amenities, paper, and floor care that protect guest experience." },
  { name: "Medical", blurb: "Clinics and hospitals: hospital-grade disinfectants, PPE, and biohazard handling that meet sanitation specs." },
  { name: "Manufacturing", blurb: "Plants and factories: industrial degreasers, floor machines, and safety gear for demanding environments." },
  { name: "Financial", blurb: "Banks and offices: discreet, dependable janitorial supply that keeps institutional spaces immaculate." },
  { name: "Telecoms", blurb: "Data and network facilities: precise, low-residue cleaning for sensitive equipment areas." },
  { name: "Entertainment", blurb: "Venues and theatres: fast turnaround cleaning supplies for high-traffic public spaces." },
  { name: "Retail", blurb: "Stores and malls: nightly maintenance programs that keep sales floors spotless." },
  { name: "Janitorial & Sanitation", blurb: "Contract cleaners: bulk chemicals, equipment, and consumables with island-wide twice-weekly delivery." },
];

export default function SolutionsPage() {
  return (
    <>
      <Section tone="light" className="pt-40">
        <Container>
          <Eyebrow tone="red">Solutions</Eyebrow>
          <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
            Built around your industry.
          </h1>
          <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
            We supply a tailored mix of manufactured chemicals and
            elite-distributed equipment to keep every kind of Jamaican operation
            clean, safe, and compliant.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {INDUSTRIES.map((i) => (
              <div
                key={i.name}
                className="rounded-md border border-black/10 bg-mec-pure p-6"
              >
                <h2 className="font-display-tight text-h3 text-mec-ink">
                  {i.name}
                </h2>
                <p className="mt-2 text-mec-ink/75">{i.blurb}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
      <IndustriesGrid />
    </>
  );
}
```

- [ ] **Step 3: Social Responsibility page**

Create `minott-web/app/social-responsibility/page.tsx`:
```tsx
import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export const metadata: Metadata = {
  title: "Social Responsibility — Minott Chemicals",
  description:
    "Earth-friendly chemicals safe for daycares and Homes for the Aged, a commitment to quality and safety, and support for the Jamaican communities we serve.",
};

const PILLARS = [
  {
    title: "Safer formulations",
    body: "Our earth-friendly chemicals are formulated to be safe for sensitive environments — including daycare facilities and Homes for the Aged — while staying strong enough for restaurants and meeting government specifications for destroying bacteria.",
  },
  {
    title: "Quality & safety first",
    body: "As a manufacturer of our own line, we hold ourselves to a standard of excellence in how products are made, labelled, and supplied — so the people who use them, and the spaces they clean, stay protected.",
  },
  {
    title: "Rooted in Jamaica",
    body: "We manufacture on-island, employ locally, and serve a loyal client base across the country — investing in the communities that have supported Minott for more than 35 years.",
  },
];

export default function SocialResponsibilityPage() {
  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">Social Responsibility</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          Clean that cares.
        </h1>
        <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
          Doing right by people and place is part of how we do business —
          from the chemistry we put in the bottle to the communities we serve.
        </p>
        {/* CONTENT NOTE: claims below are drawn from the knowledge base and
            third-party directories — confirm with the client before launch. */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title}>
              <span aria-hidden className="block h-1 w-12 bg-mec-red" />
              <h2 className="mt-5 font-display-tight text-h3">{p.title}</h2>
              <p className="mt-3 text-mec-ink/75">{p.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 4: Manual check**

Run `npm run dev`; visit `/about`, `/solutions`, `/social-responsibility`. Each renders with the fixed Nav (note: top padding `pt-40` keeps content clear of the fixed header). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add minott-web/app/about minott-web/app/solutions minott-web/app/social-responsibility
git commit -m "feat(pages): add About, Solutions, and Social Responsibility pages"
```

---

### Task 21: Contact page (form + WhatsApp) and remove public chrome from /admin

**Files:**
- Create: `minott-web/components/sections/ContactForm.tsx`
- Create: `minott-web/app/contact/page.tsx`
- Modify: `minott-web/app/layout.tsx`

- [ ] **Step 1: Contact form (client, wired to submitContact)**

Create `minott-web/components/sections/ContactForm.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { submitContact, type InquiryResult } from "@/lib/actions/inquiries";

const initial: InquiryResult = { ok: false };

const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initial);

  if (state.ok) {
    return (
      <div className="rounded-md border border-mec-red/30 bg-mec-red/5 p-8">
        <h3 className="font-display-tight text-h3 text-mec-ink">
          Thanks — we&apos;ve got your message.
        </h3>
        <p className="mt-3 text-mec-ink/75">
          A sales consultant will be in touch within one business day.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Name *
        <input name="name" required className={inputCls} />
      </label>
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Company
        <input name="company" className={inputCls} />
      </label>
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Email *
        <input name="email" type="email" required className={inputCls} />
      </label>
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Phone
        <input name="phone" className={inputCls} />
      </label>
      <label className="text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 sm:col-span-2">
        Message
        <textarea name="message" rows={4} className={`${inputCls} resize-none`} />
      </label>
      {state.error && (
        <p className="text-sm text-mec-red sm:col-span-2">{state.error}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-8 py-4 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send Message"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Contact page**

Create `minott-web/app/contact/page.tsx`:
```tsx
import type { Metadata } from "next";
import { LocationContact } from "@/components/sections/LocationContact";
import { ContactForm } from "@/components/sections/ContactForm";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — Minott Chemicals | Kingston 5, Jamaica",
  description:
    "Reach Minott Equipment & Chemicals in Kingston 5. Call (876) 929-5284, message us on WhatsApp, or send a message and we'll respond within one business day.",
};

export default function ContactPage() {
  return (
    <>
      <Section tone="light" className="pt-40" pad={false}>
        <Container>
          <Eyebrow tone="red">Contact</Eyebrow>
          <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
            Let&apos;s talk supply.
          </h1>
          <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
            Send us a message and a sales consultant will follow up within one
            business day — or reach us instantly on WhatsApp.
          </p>

          <div className="mt-10">
            <a
              href="https://wa.me/18769295284"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-pill bg-[#25D366] px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:opacity-90"
              data-cursor="Chat"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Chat on WhatsApp
            </a>
          </div>

          <div className="mt-12 max-w-3xl">
            <ContactForm />
          </div>
        </Container>
      </Section>
      <LocationContact />
    </>
  );
}
```

- [ ] **Step 3: Hide public Nav/Footer on admin routes**

The admin has its own layout chrome; the public Nav/Footer should not appear there. In `minott-web/app/layout.tsx`, the root layout cannot read the pathname (it's a server component without params). Use a small client wrapper. Create `minott-web/components/layout/PublicChrome.tsx`:
```tsx
"use client";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

type CategoryLink = { slug: string; name: string };

export function PublicChrome({
  categories,
  children,
}: {
  categories: CategoryLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) return <>{children}</>;
  return (
    <>
      <Nav categories={categories} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
```
Then in `minott-web/app/layout.tsx`, replace the `<Nav … /> <main>… </main> <Footer />` block (inside the providers) with:
```tsx
              <PublicChrome
                categories={categories.map((c) => ({
                  slug: c.slug,
                  name: c.name,
                }))}
              >
                {children}
              </PublicChrome>
```
and add the import:
```tsx
import { PublicChrome } from "@/components/layout/PublicChrome";
```
Remove the now-unused `Nav` and `Footer` imports from `app/layout.tsx`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run `npm run dev`:
- `/contact`: form + WhatsApp button + map render. Submit with name+email → success message. Confirm the row exists: `npx prisma studio` → Inquiry table has a CONTACT row.
- `/admin/login`: no public Nav/Footer visible.
Stop the server.

- [ ] **Step 6: Commit**

```bash
git add minott-web/components/sections/ContactForm.tsx minott-web/app/contact/page.tsx minott-web/components/layout/PublicChrome.tsx minott-web/app/layout.tsx
git commit -m "feat(contact): contact page with form + WhatsApp; hide chrome on admin"
```

---

## Phase 4 — Products experience

### Task 22: Products catalog page

**Files:**
- Create: `minott-web/app/products/page.tsx`

- [ ] **Step 1: Write the catalog page**

Create `minott-web/app/products/page.tsx`:
```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCatalog, getFeaturedProducts } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

export const metadata: Metadata = {
  title: "Products — Chemicals, Janitorial, PPE & Paper | Minott Chemicals",
  description:
    "Browse Minott's full catalog: manufactured industrial & household chemicals, janitorial equipment, PPE, and paper products. Add items to your quote.",
};

export default async function ProductsPage() {
  const [catalog, featured] = await Promise.all([
    getCatalog(),
    getFeaturedProducts(),
  ]);

  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">Our Catalog</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          Four categories. One supplier.
        </h1>
        <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
          From hospital-grade disinfectant to bulk bathroom tissue — explore by
          category and build a quote as you go.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.map((cat) => (
            <Link
              key={cat.id}
              href={`/products/${cat.slug}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-md"
              data-cursor="View"
            >
              <Image
                src={cat.imagePath ?? "/images/product-placeholder.png"}
                alt={cat.name}
                fill
                sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-mec-ink via-mec-ink/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-mec-pure">
                <h2 className="font-display-tight text-2xl leading-tight">
                  {cat.name}
                </h2>
                <p className="mt-1 text-sm text-mec-pure/70">
                  {cat.products.length} products
                </p>
              </div>
            </Link>
          ))}
        </div>

        {featured.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display-tight text-h2">Featured</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-md border border-black/10 bg-mec-pure"
                >
                  <Link
                    href={`/products/${p.category.slug}/${p.slug}`}
                    className="relative block aspect-square"
                    data-cursor="View"
                  >
                    <Image
                      src={p.imagePath}
                      alt={p.name}
                      fill
                      sizes="(min-width:1024px) 25vw, 50vw"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <Link
                      href={`/products/${p.category.slug}/${p.slug}`}
                      className="font-display-tight text-xl leading-tight hover:text-mec-red"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-mec-ink/70">
                      {p.shortDescription}
                    </p>
                    <div className="mt-4 pt-2">
                      <AddToQuoteButton
                        product={{
                          productId: p.id,
                          slug: p.slug,
                          name: p.name,
                          imagePath: p.imagePath,
                          categorySlug: p.category.slug,
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Manual check**

Run `npm run dev`, open `/products`. Expect 4 category cards with counts and a Featured grid. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add minott-web/app/products/page.tsx
git commit -m "feat(products): catalog page with categories and featured grid"
```

---

### Task 23: Category listing page

**Files:**
- Create: `minott-web/components/products/ProductCard.tsx`
- Create: `minott-web/app/products/[category]/page.tsx`

- [ ] **Step 1: Reusable product card**

Create `minott-web/components/products/ProductCard.tsx`:
```tsx
import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  imagePath: string;
  isChemical: boolean;
  categorySlug: string;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const href = `/products/${product.categorySlug}/${product.slug}`;
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-black/10 bg-mec-pure">
      <Link href={href} className="relative block aspect-square" data-cursor="View">
        <Image
          src={product.imagePath}
          alt={product.name}
          fill
          sizes="(min-width:1024px) 25vw, 50vw"
          className="object-cover"
        />
        {product.isChemical && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-mec-ink/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
            <FileText className="h-3 w-3" aria-hidden /> SDS
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link
          href={href}
          className="font-display-tight text-xl leading-tight hover:text-mec-red"
        >
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-mec-ink/70">
            {product.shortDescription}
          </p>
        )}
        <div className="mt-4 pt-2">
          <AddToQuoteButton
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              imagePath: product.imagePath,
              categorySlug: product.categorySlug,
            }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Category page**

Create `minott-web/app/products/[category]/page.tsx`:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductCard } from "@/components/products/ProductCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return { title: "Category not found — Minott Chemicals" };
  return {
    title: `${cat.name} — Minott Chemicals`,
    description: cat.description ?? undefined,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  return (
    <Section tone="light" className="pt-40">
      <Container>
        <nav className="text-sm text-mec-ink/60">
          <Link href="/products" className="hover:text-mec-red">
            Products
          </Link>{" "}
          / <span className="text-mec-ink">{cat.name}</span>
        </nav>
        <Eyebrow tone="red" className="mt-6">
          Catalog
        </Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          {cat.name}
        </h1>
        {cat.description && (
          <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
            {cat.description}
          </p>
        )}

        {cat.products.length === 0 ? (
          <p className="mt-12 text-mec-ink/60">
            No products in this category yet.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cat.products.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  shortDescription: p.shortDescription,
                  imagePath: p.imagePath,
                  isChemical: p.isChemical,
                  categorySlug: cat.slug,
                }}
              />
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
```

- [ ] **Step 3: Manual check**

Run `npm run dev`, open `/products/industrial-and-household-chemicals`. Expect breadcrumb, category intro, and a grid of products with SDS badges on chemical items. Visit a bad slug like `/products/nope` → 404. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add minott-web/components/products/ProductCard.tsx minott-web/app/products/[category]/page.tsx
git commit -m "feat(products): category listing page + reusable product card"
```

---

### Task 24: Product detail page (SDS + sample request)

**Files:**
- Create: `minott-web/components/products/SampleRequestForm.tsx`
- Create: `minott-web/components/products/ProductDetailActions.tsx`
- Create: `minott-web/app/products/[category]/[slug]/page.tsx`

- [ ] **Step 1: Sample request form (client)**

Create `minott-web/components/products/SampleRequestForm.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { submitSample, type InquiryResult } from "@/lib/actions/inquiries";

const initial: InquiryResult = { ok: false };
const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-2.5 text-mec-ink outline-none focus:border-mec-red";

export function SampleRequestForm({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const [state, formAction, pending] = useActionState(submitSample, initial);

  if (state.ok) {
    return (
      <p className="rounded-sm border border-mec-red/30 bg-mec-red/5 p-4 text-sm text-mec-ink">
        Sample request received for <strong>{productName}</strong>. We&apos;ll be
        in touch within one business day.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="productId" value={productId} />
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Name *
        <input name="name" required className={inputCls} />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Company
        <input name="company" className={inputCls} />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Email *
        <input name="email" type="email" required className={inputCls} />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Phone
        <input name="phone" className={inputCls} />
      </label>
      {state.error && (
        <p className="text-sm text-mec-red sm:col-span-2">{state.error}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition hover:bg-mec-graphite disabled:opacity-50"
        >
          {pending ? "Sending…" : "Request Sample"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Detail actions (client: quote + SDS + sample toggle)**

Create `minott-web/components/products/ProductDetailActions.tsx`:
```tsx
"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";
import { SampleRequestForm } from "./SampleRequestForm";

export function ProductDetailActions({
  product,
}: {
  product: {
    id: number;
    slug: string;
    name: string;
    imagePath: string;
    categorySlug: string;
    isChemical: boolean;
    sampleAvailable: boolean;
    sdsUrl: string | null;
  };
}) {
  const [showSample, setShowSample] = useState(false);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-3">
        <AddToQuoteButton
          product={{
            productId: product.id,
            slug: product.slug,
            name: product.name,
            imagePath: product.imagePath,
            categorySlug: product.categorySlug,
          }}
        />

        {product.isChemical &&
          (product.sdsUrl ? (
            <a
              href={product.sdsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-mec-ink px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-ink transition hover:border-mec-red hover:text-mec-red"
              data-cursor="Open"
            >
              <FileText className="h-4 w-4" aria-hidden /> View SDS
            </a>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center gap-2 border border-black/20 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-ink/40"
              title="SDS available on request"
            >
              <FileText className="h-4 w-4" aria-hidden /> SDS on request
            </span>
          ))}

        {product.isChemical && product.sampleAvailable && (
          <button
            type="button"
            onClick={() => setShowSample((v) => !v)}
            className="inline-flex items-center gap-2 border border-mec-ink px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-ink transition hover:border-mec-red hover:text-mec-red"
          >
            {showSample ? "Hide sample form" : "Request Sample"}
          </button>
        )}
      </div>

      {showSample && product.sampleAvailable && (
        <div className="mt-6 rounded-md border border-black/10 bg-mec-mist p-6">
          <h3 className="font-display-tight text-h3 text-mec-ink">
            Request a sample
          </h3>
          <p className="mt-1 mb-4 text-sm text-mec-ink/70">
            Tell us where to send it and we&apos;ll arrange a sample.
          </p>
          <SampleRequestForm productId={product.id} productName={product.name} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Product detail page (server)**

Create `minott-web/app/products/[category]/[slug]/page.tsx`:
```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlugInCategory } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductDetailActions } from "@/components/products/ProductDetailActions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const product = await getProductBySlugInCategory(category, slug);
  if (!product) return { title: "Product not found — Minott Chemicals" };
  return {
    title: `${product.name} — Minott Chemicals`,
    description: product.shortDescription ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const product = await getProductBySlugInCategory(category, slug);
  if (!product) notFound();

  return (
    <Section tone="light" className="pt-40">
      <Container>
        <nav className="text-sm text-mec-ink/60">
          <Link href="/products" className="hover:text-mec-red">
            Products
          </Link>{" "}
          /{" "}
          <Link
            href={`/products/${product.category.slug}`}
            className="hover:text-mec-red"
          >
            {product.category.name}
          </Link>{" "}
          / <span className="text-mec-ink">{product.name}</span>
        </nav>

        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-md bg-mec-mist">
            <Image
              src={product.imagePath}
              alt={product.name}
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col justify-center">
            <Eyebrow tone="red">{product.category.name}</Eyebrow>
            <h1 className="mt-4 font-display-tight text-h2 leading-[1]">
              {product.name}
            </h1>
            {product.sku && (
              <p className="mt-3 font-mono text-sm text-mec-ink/50">
                SKU: {product.sku}
              </p>
            )}
            {product.shortDescription && (
              <p className="mt-6 text-lede text-mec-ink/80">
                {product.shortDescription}
              </p>
            )}
            {product.description && (
              <p className="mt-4 text-mec-ink/75">{product.description}</p>
            )}

            <ProductDetailActions
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                imagePath: product.imagePath,
                categorySlug: product.category.slug,
                isChemical: product.isChemical,
                sampleAvailable: product.sampleAvailable,
                sdsUrl: product.sdsUrl,
              }}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 4: Manual check**

Run `npm run dev`. Open a chemical product, e.g. `/products/industrial-and-household-chemicals/time-saver-all-purpose-cleaner`. Expect: image, description, Add to Quote, "SDS on request" (disabled), and a working "Request Sample" toggle. Submit the sample form → success message; confirm a SAMPLE row in `npx prisma studio`. Open a non-chemical product (e.g. under Paper Products) → no SDS/sample buttons. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add minott-web/components/products/SampleRequestForm.tsx minott-web/components/products/ProductDetailActions.tsx "minott-web/app/products/[category]/[slug]/page.tsx"
git commit -m "feat(products): product detail page with SDS + sample request"
```

---

### Task 25: Quote page (cart review + submit)

**Files:**
- Create: `minott-web/app/quote/page.tsx`
- Create: `minott-web/components/quote/QuotePageClient.tsx`

- [ ] **Step 1: Quote page client component**

Create `minott-web/components/quote/QuotePageClient.tsx`:
```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useQuoteCart } from "@/components/quote/QuoteCartProvider";
import { submitQuote, type InquiryResult } from "@/lib/actions/inquiries";

const initial: InquiryResult = { ok: false };
const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";

export function QuotePageClient() {
  const { items, setQuantity, removeItem, clear } = useQuoteCart();
  const [state, formAction, pending] = useActionState(submitQuote, initial);
  const clearedRef = useRef(false);

  // Clear the cart once after a successful submission.
  useEffect(() => {
    if (state.ok && !clearedRef.current) {
      clearedRef.current = true;
      clear();
    }
  }, [state.ok, clear]);

  if (state.ok) {
    return (
      <div className="rounded-md border border-mec-red/30 bg-mec-red/5 p-8">
        <h2 className="font-display-tight text-h2 text-mec-ink">
          Quote request sent.
        </h2>
        <p className="mt-3 max-w-xl text-mec-ink/75">
          Thanks — a sales consultant will price your list and respond within one
          business day.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-black/10 bg-mec-pure p-8">
        <p className="text-mec-ink/70">Your quote list is empty.</p>
        <Link
          href="/products"
          className="mt-4 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
      {/* Line items */}
      <div className="space-y-4">
        {items.map((it) => (
          <div
            key={it.productId}
            className="flex items-center gap-4 rounded-md border border-black/10 bg-mec-pure p-4"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-mec-mist">
              <Image
                src={it.imagePath}
                alt={it.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${it.categorySlug}/${it.slug}`}
                className="font-semibold text-mec-ink hover:text-mec-red"
              >
                {it.name}
              </Link>
            </div>
            <input
              type="number"
              min={1}
              value={it.quantity}
              onChange={(e) =>
                setQuantity(it.productId, Number(e.target.value) || 1)
              }
              className="w-20 rounded-sm border border-black/15 px-3 py-2 text-mec-ink outline-none focus:border-mec-red"
              aria-label={`Quantity for ${it.name}`}
            />
            <button
              type="button"
              onClick={() => removeItem(it.productId)}
              className="text-mec-ink/50 hover:text-mec-red"
              aria-label={`Remove ${it.name}`}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Contact form */}
      <form
        action={formAction}
        className="h-fit rounded-md border border-black/10 bg-mec-pure p-6"
      >
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            items.map((i) => ({
              productId: i.productId,
              productName: i.name,
              quantity: i.quantity,
            })),
          )}
        />
        <h2 className="font-display-tight text-h3 text-mec-ink">Your details</h2>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
          Name *
          <input name="name" required className={inputCls} />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
          Company
          <input name="company" className={inputCls} />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
          Email *
          <input name="email" type="email" required className={inputCls} />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
          Phone
          <input name="phone" className={inputCls} />
        </label>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
          Notes
          <textarea name="message" rows={3} className={`${inputCls} resize-none`} />
        </label>
        {state.error && <p className="mt-3 text-sm text-mec-red">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending ? "Sending…" : "Submit Quote Request"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Quote page (server wrapper)**

Create `minott-web/app/quote/page.tsx`:
```tsx
import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { QuotePageClient } from "@/components/quote/QuotePageClient";

export const metadata: Metadata = {
  title: "My Quote — Minott Chemicals",
  description:
    "Review the products on your quote list and send them to Minott for a same-day price.",
};

export default function QuotePage() {
  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">Request a Quote</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          Your quote list.
        </h1>
        <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
          Review your items, add your details, and we&apos;ll price everything
          within one business day.
        </p>
        <div className="mt-12">
          <QuotePageClient />
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 3: Manual end-to-end check**

Run `npm run dev`:
- From `/products`, add 2–3 items to quote (badge in Nav increments).
- Open `/quote`: items listed, change a quantity, remove one.
- Submit with name+email → success state, cart badge resets to 0.
- `npx prisma studio` → Inquiry table has a QUOTE row with InquiryItem children.
Stop the server.

- [ ] **Step 4: Commit**

```bash
git add minott-web/app/quote/page.tsx minott-web/components/quote/QuotePageClient.tsx
git commit -m "feat(quote): quote review page with DB submission"
```

---

## Phase 5 — Admin CRUD

### Task 26: Admin product actions

**Files:**
- Create: `minott-web/lib/actions/admin-products.ts`

- [ ] **Step 1: Write the product actions**

Create `minott-web/lib/actions/admin-products.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

function num(formData: FormData, key: string, fallback = 0): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : fallback;
}
function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}
function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function buildData(formData: FormData) {
  const name = str(formData, "name");
  const providedSlug = str(formData, "slug");
  return {
    name,
    slug: slugify(providedSlug || name),
    categoryId: num(formData, "categoryId"),
    shortDescription: str(formData, "shortDescription") || null,
    description: str(formData, "description") || null,
    imagePath: str(formData, "imagePath") || "/images/product-placeholder.png",
    sku: str(formData, "sku") || null,
    sdsUrl: str(formData, "sdsUrl") || null,
    isChemical: bool(formData, "isChemical"),
    sampleAvailable: bool(formData, "sampleAvailable"),
    featured: bool(formData, "featured"),
    active: bool(formData, "active"),
    sortOrder: num(formData, "sortOrder"),
  };
}

export async function createProduct(formData: FormData): Promise<void> {
  await db.product.create({ data: buildData(formData) });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function updateProduct(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  await db.product.update({ where: { id }, data: buildData(formData) });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  await db.product.delete({ where: { id } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add minott-web/lib/actions/admin-products.ts
git commit -m "feat(admin): product create/update/delete actions"
```

---

### Task 27: Admin product form + pages (list / new / edit)

**Files:**
- Create: `minott-web/components/admin/ProductForm.tsx`
- Create: `minott-web/app/admin/products/page.tsx`
- Create: `minott-web/app/admin/products/new/page.tsx`
- Create: `minott-web/app/admin/products/[id]/edit/page.tsx`

- [ ] **Step 1: Reusable product form**

Create `minott-web/components/admin/ProductForm.tsx`:
```tsx
import Link from "next/link";

type Category = { id: number; name: string };
type ProductValues = {
  id?: number;
  name?: string;
  slug?: string;
  categoryId?: number;
  shortDescription?: string | null;
  description?: string | null;
  imagePath?: string;
  sku?: string | null;
  sdsUrl?: string | null;
  isChemical?: boolean;
  sampleAvailable?: boolean;
  featured?: boolean;
  active?: boolean;
  sortOrder?: number;
};

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export function ProductForm({
  action,
  categories,
  product,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  product?: ProductValues;
}) {
  const p = product ?? {};
  return (
    <form action={action} className="max-w-2xl space-y-5">
      {p.id != null && <input type="hidden" name="id" value={p.id} />}

      <label className={label}>
        Name
        <input name="name" defaultValue={p.name ?? ""} required className={field} />
      </label>

      <label className={label}>
        Slug (leave blank to auto-generate)
        <input name="slug" defaultValue={p.slug ?? ""} className={field} />
      </label>

      <label className={label}>
        Category
        <select
          name="categoryId"
          defaultValue={p.categoryId ?? categories[0]?.id}
          className={field}
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className={label}>
        Short description
        <input
          name="shortDescription"
          defaultValue={p.shortDescription ?? ""}
          className={field}
        />
      </label>

      <label className={label}>
        Full description
        <textarea
          name="description"
          defaultValue={p.description ?? ""}
          rows={4}
          className={`${field} resize-none`}
        />
      </label>

      <label className={label}>
        Image path
        <input
          name="imagePath"
          defaultValue={p.imagePath ?? "/images/product-placeholder.png"}
          className={field}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={label}>
          SKU
          <input name="sku" defaultValue={p.sku ?? ""} className={field} />
        </label>
        <label className={label}>
          Sort order
          <input
            name="sortOrder"
            type="number"
            defaultValue={p.sortOrder ?? 0}
            className={field}
          />
        </label>
      </div>

      <label className={label}>
        SDS URL (chemicals)
        <input name="sdsUrl" defaultValue={p.sdsUrl ?? ""} className={field} />
      </label>

      <fieldset className="grid grid-cols-2 gap-3 rounded-sm border border-black/10 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isChemical" defaultChecked={p.isChemical ?? false} />
          Is chemical (SDS + sample)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sampleAvailable" defaultChecked={p.sampleAvailable ?? false} />
          Sample available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={p.featured ?? false} />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={p.active ?? true} />
          Active (visible on site)
        </label>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          Save Product
        </button>
        <Link
          href="/admin/products"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Product list page**

Create `minott-web/app/admin/products/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { deleteProduct } from "@/lib/actions/admin-products";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    include: { category: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Product
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3 text-mec-ink/70">{p.category.name}</td>
                <td className="px-4 py-3 text-xs text-mec-ink/60">
                  {[
                    p.active ? "active" : "hidden",
                    p.featured ? "featured" : null,
                    p.isChemical ? "chemical" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="font-semibold text-mec-red hover:underline"
                  >
                    Edit
                  </Link>
                  <form action={deleteProduct} className="ml-4 inline">
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="text-mec-ink/50 hover:text-mec-red"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: New product page**

Create `minott-web/app/admin/products/new/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { createProduct } from "@/lib/actions/admin-products";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h1 className="font-display-tight text-3xl">New Product</h1>
      <div className="mt-6">
        <ProductForm action={createProduct} categories={categories} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Edit product page**

Create `minott-web/app/admin/products/[id]/edit/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateProduct } from "@/lib/actions/admin-products";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id: Number(id) } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Edit Product</h1>
      <div className="mt-6">
        <ProductForm
          action={updateProduct}
          categories={categories}
          product={product}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Manual check**

Run `npm run dev`, log in at `/admin/login`. Go to `/admin/products`:
- Create a new product (set a category, mark active) → it appears in the list and on the public category page.
- Edit it (rename) → change reflected on the public site.
- Toggle `active` off via edit → it disappears from the public category page.
- Delete it → removed.
Stop the server.

- [ ] **Step 6: Commit**

```bash
git add minott-web/components/admin/ProductForm.tsx "minott-web/app/admin/products"
git commit -m "feat(admin): product CRUD pages"
```

---

### Task 28: Admin category actions + pages

**Files:**
- Create: `minott-web/lib/actions/admin-categories.ts`
- Create: `minott-web/components/admin/CategoryForm.tsx`
- Create: `minott-web/app/admin/categories/page.tsx`
- Create: `minott-web/app/admin/categories/new/page.tsx`
- Create: `minott-web/app/admin/categories/[id]/edit/page.tsx`

- [ ] **Step 1: Category actions (with delete guard)**

Create `minott-web/lib/actions/admin-categories.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function num(formData: FormData, key: string): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : 0;
}

function buildData(formData: FormData) {
  const name = str(formData, "name");
  return {
    name,
    slug: slugify(str(formData, "slug") || name),
    description: str(formData, "description") || null,
    imagePath: str(formData, "imagePath") || null,
    sortOrder: num(formData, "sortOrder"),
  };
}

export async function createCategory(formData: FormData): Promise<void> {
  await db.category.create({ data: buildData(formData) });
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  redirect("/admin/categories");
}

export async function updateCategory(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  await db.category.update({ where: { id }, data: buildData(formData) });
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  redirect("/admin/categories");
}

export async function deleteCategory(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const id = Number(formData.get("id"));
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return {
      error: `Cannot delete: ${count} product(s) still use this category. Reassign or delete them first.`,
    };
  }
  await db.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return {};
}
```

- [ ] **Step 2: Category form**

Create `minott-web/components/admin/CategoryForm.tsx`:
```tsx
import Link from "next/link";

type CategoryValues = {
  id?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  imagePath?: string | null;
  sortOrder?: number;
};

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export function CategoryForm({
  action,
  category,
}: {
  action: (formData: FormData) => void | Promise<void>;
  category?: CategoryValues;
}) {
  const c = category ?? {};
  return (
    <form action={action} className="max-w-xl space-y-5">
      {c.id != null && <input type="hidden" name="id" value={c.id} />}
      <label className={label}>
        Name
        <input name="name" defaultValue={c.name ?? ""} required className={field} />
      </label>
      <label className={label}>
        Slug (leave blank to auto-generate)
        <input name="slug" defaultValue={c.slug ?? ""} className={field} />
      </label>
      <label className={label}>
        Description
        <textarea
          name="description"
          defaultValue={c.description ?? ""}
          rows={3}
          className={`${field} resize-none`}
        />
      </label>
      <label className={label}>
        Image path
        <input name="imagePath" defaultValue={c.imagePath ?? ""} className={field} />
      </label>
      <label className={label}>
        Sort order
        <input
          name="sortOrder"
          type="number"
          defaultValue={c.sortOrder ?? 0}
          className={field}
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          Save Category
        </button>
        <Link
          href="/admin/categories"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Category list with delete (uses useActionState for the guard message)**

Create `minott-web/app/admin/categories/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Category
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {c._count.products}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/categories/${c.id}/edit`}
                    className="font-semibold text-mec-red hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteCategoryButton id={c.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Delete-category button (client, shows guard error)**

Create `minott-web/components/admin/DeleteCategoryButton.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { deleteCategory } from "@/lib/actions/admin-categories";

const initial: { error?: string } = {};

export function DeleteCategoryButton({ id }: { id: number }) {
  const [state, action] = useActionState(deleteCategory, initial);
  return (
    <form action={action} className="ml-4 inline">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-mec-ink/50 hover:text-mec-red">
        Delete
      </button>
      {state.error && (
        <span className="ml-3 text-xs text-mec-red">{state.error}</span>
      )}
    </form>
  );
}
```

- [ ] **Step 5: New + edit category pages**

Create `minott-web/app/admin/categories/new/page.tsx`:
```tsx
import { createCategory } from "@/lib/actions/admin-categories";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div>
      <h1 className="font-display-tight text-3xl">New Category</h1>
      <div className="mt-6">
        <CategoryForm action={createCategory} />
      </div>
    </div>
  );
}
```

Create `minott-web/app/admin/categories/[id]/edit/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateCategory } from "@/lib/actions/admin-categories";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await db.category.findUnique({ where: { id: Number(id) } });
  if (!category) notFound();

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Edit Category</h1>
      <div className="mt-6">
        <CategoryForm action={updateCategory} category={category} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Manual check**

Run `npm run dev`, logged in. At `/admin/categories`: create a category, edit it, try to delete a seeded category that has products → see the guard error; create an empty category and delete it → succeeds. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add minott-web/lib/actions/admin-categories.ts minott-web/components/admin/CategoryForm.tsx minott-web/components/admin/DeleteCategoryButton.tsx "minott-web/app/admin/categories"
git commit -m "feat(admin): category CRUD pages with delete guard"
```

---

### Task 29: Admin requests inbox + status action

**Files:**
- Create: `minott-web/lib/actions/admin-inquiries.ts`
- Create: `minott-web/components/admin/InquiryStatusSelect.tsx`
- Create: `minott-web/app/admin/requests/page.tsx`

- [ ] **Step 1: Status update action**

Create `minott-web/lib/actions/admin-inquiries.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { INQUIRY_STATUS } from "@/lib/constants";

const VALID = new Set(Object.values(INQUIRY_STATUS));

export async function setInquiryStatus(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!Number.isFinite(id) || !VALID.has(status as never)) return;
  await db.inquiry.update({ where: { id }, data: { status } });
  revalidatePath("/admin/requests");
}
```

- [ ] **Step 2: Status select (client; auto-submits on change)**

Create `minott-web/components/admin/InquiryStatusSelect.tsx`:
```tsx
"use client";

import { useRef } from "react";
import { setInquiryStatus } from "@/lib/actions/admin-inquiries";
import { INQUIRY_STATUS, INQUIRY_STATUS_LABELS } from "@/lib/constants";

export function InquiryStatusSelect({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={setInquiryStatus} ref={formRef}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-sm border border-black/15 bg-mec-pure px-2 py-1 text-xs font-semibold"
      >
        {Object.values(INQUIRY_STATUS).map((s) => (
          <option key={s} value={s}>
            {INQUIRY_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
```

- [ ] **Step 3: Requests inbox page (filter by type via searchParams)**

Create `minott-web/app/admin/requests/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import {
  INQUIRY_TYPE,
  INQUIRY_TYPE_LABELS,
} from "@/lib/constants";
import { InquiryStatusSelect } from "@/components/admin/InquiryStatusSelect";

const TABS = [
  { key: "ALL", label: "All" },
  { key: INQUIRY_TYPE.QUOTE, label: "Quotes" },
  { key: INQUIRY_TYPE.SAMPLE, label: "Samples" },
  { key: INQUIRY_TYPE.CONTACT, label: "Contact" },
];

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const active = type && type !== "ALL" ? type : "ALL";

  const inquiries = await db.inquiry.findMany({
    where: active === "ALL" ? {} : { type: active },
    orderBy: { createdAt: "desc" },
    include: { items: true, product: true },
  });

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Requests</h1>

      <div className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "ALL" ? "/admin/requests" : `/admin/requests?type=${t.key}`}
            className={`rounded-pill px-4 py-1.5 text-sm font-semibold ${
              active === t.key
                ? "bg-mec-red text-mec-pure"
                : "border border-black/15 text-mec-ink/70 hover:border-mec-red"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {inquiries.length === 0 && (
          <p className="text-mec-ink/60">No requests yet.</p>
        )}
        {inquiries.map((inq) => (
          <div
            key={inq.id}
            className="rounded-md border border-black/10 bg-mec-pure p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-block rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
                  {INQUIRY_TYPE_LABELS[inq.type] ?? inq.type}
                </span>
                <p className="mt-2 font-semibold">
                  {inq.name}
                  {inq.company ? ` · ${inq.company}` : ""}
                </p>
                <p className="text-sm text-mec-ink/70">
                  <a href={`mailto:${inq.email}`} className="hover:text-mec-red">
                    {inq.email}
                  </a>
                  {inq.phone ? ` · ${inq.phone}` : ""}
                </p>
              </div>
              <InquiryStatusSelect id={inq.id} status={inq.status} />
            </div>

            {inq.product && (
              <p className="mt-3 text-sm">
                <span className="text-mec-ink/60">Sample for:</span>{" "}
                <strong>{inq.product.name}</strong>
              </p>
            )}

            {inq.items.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-mec-ink/80">
                {inq.items.map((it) => (
                  <li key={it.id}>
                    {it.quantity} × {it.productName}
                  </li>
                ))}
              </ul>
            )}

            {inq.message && (
              <p className="mt-3 whitespace-pre-line text-sm text-mec-ink/75">
                {inq.message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual check**

Run `npm run dev`, logged in, open `/admin/requests`. Expect the quote/sample/contact rows created during earlier tasks. Filter tabs work; changing a status dropdown persists (reload to confirm). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add minott-web/lib/actions/admin-inquiries.ts minott-web/components/admin/InquiryStatusSelect.tsx "minott-web/app/admin/requests"
git commit -m "feat(admin): requests inbox with type filter and status updates"
```

---

### Task 30: Admin dashboard

**Files:**
- Create: `minott-web/app/admin/page.tsx`

- [ ] **Step 1: Write the dashboard**

Create `minott-web/app/admin/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { INQUIRY_STATUS } from "@/lib/constants";

export default async function AdminDashboardPage() {
  const [products, categories, newInquiries] = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.inquiry.count({ where: { status: INQUIRY_STATUS.NEW } }),
  ]);

  const cards = [
    { label: "Products", value: products, href: "/admin/products" },
    { label: "Categories", value: categories, href: "/admin/categories" },
    { label: "New requests", value: newInquiries, href: "/admin/requests" },
  ];

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-md border border-black/10 bg-mec-pure p-6 transition hover:border-mec-red"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/60">
              {c.label}
            </p>
            <p className="mt-2 font-display-tight text-5xl text-mec-ink">
              {c.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual check**

Run `npm run dev`, logged in, open `/admin`. Expect 3 stat cards with real counts linking to each section. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add minott-web/app/admin/page.tsx
git commit -m "feat(admin): dashboard with counts"
```

---

## Phase 6 — Docs, env, and final verification

### Task 31: Env example + docs

**Files:**
- Create: `minott-web/.env.example`
- Modify: `CLAUDE.md` (repo root)

- [ ] **Step 1: Write `.env.example`**

Create `minott-web/.env.example`:
```
# SQLite database location (relative to minott-web/)
DATABASE_URL="file:./prisma/app.db"

# Admin login (single shared password)
ADMIN_PASSWORD="set-a-strong-password"

# HMAC key used to sign the admin session cookie
SESSION_SECRET="set-a-long-random-string"
```

- [ ] **Step 2: Update CLAUDE.md**

In the repo-root `CLAUDE.md`, make these edits:

Replace the "⚠️ Next.js version" deployment claim and the "fully static" framing. Under **Commands**, change the build line description and add DB commands:
```
npm run dev      # next dev — http://localhost:3000
npm run build    # prisma generate && prisma migrate deploy && next build
npm run start    # serve the production build (Node server — NOT static)
npm run lint     # eslint
npm run db:migrate  # prisma migrate dev (create/apply migrations in dev)
npm run db:seed     # populate categories + products
npm run db:studio   # browse the SQLite DB
```

Replace the **Architecture** opening sentence ("Single-page marketing site…") with:
```
Multi-page App Router site backed by SQLite via Prisma. Public pages: Home (`app/page.tsx`), About, Solutions, Social Responsibility, Contact, and a DB-driven Products catalog (`/products`, `/products/[category]`, `/products/[category]/[slug]`) plus a quote builder (`/quote`). A password-protected admin (`/admin/*`) manages products/categories and an inquiry inbox. Reads run in Server Components via `lib/products.ts`; mutations run through Server Actions in `lib/actions/`. The marketing sections in `components/sections/` are reused and redistributed across the public pages.
```

Add a new short section after "Design tokens":
```
## Data & admin

- **DB:** SQLite via Prisma. Schema in `prisma/schema.prisma`; client singleton in `lib/db.ts`; seed in `prisma/seed.ts`. Run `npm run db:migrate` then `npm run db:seed` after cloning.
- **Inquiries** (quote / sample / contact) are one unified `Inquiry` model with a `type` discriminator; quote line items live in `InquiryItem`.
- **Admin auth:** single `ADMIN_PASSWORD`; a signed httpOnly cookie (`lib/auth/session.ts`, Web Crypto HMAC with `SESSION_SECRET`) is checked in `middleware.ts` and re-checked in `app/admin/layout.tsx`.
- **Env:** copy `minott-web/.env.example` → `.env`. Required: `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
- **Deployment:** Node server (`next start`) with the SQLite file persisted on disk — no longer static/Vercel-serverless.
```

- [ ] **Step 3: Commit**

```bash
git add minott-web/.env.example CLAUDE.md
git commit -m "docs: env example and CLAUDE.md updates for DB/admin/multi-page"
```

---

### Task 32: Full build, lint, and manual acceptance pass

**Files:** none (verification only)

- [ ] **Step 1: Clean typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors. (Fix any unused-import/`any` warnings surfaced — e.g. ensure removed `Nav`/`Footer` imports in `app/layout.tsx` are gone.)

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds. Note that pages reading the DB will be dynamic (ƒ) rather than static (○) — that is expected for this server-backed app.

- [ ] **Step 4: Production smoke test**

Run: `npm run start`, then walk the acceptance checklist (spec §12):
- Nav reaches all 6 pages; Products dropdown lists seeded categories; active-route highlight works; mobile overlay (resize to mobile) works.
- `/products` → category → product detail render from DB; inactive products are hidden.
- Add to Quote → badge updates → `/quote` → submit → success + cart cleared → appears in `/admin/requests` (Quote).
- Chemical detail shows SDS affordance + Request Sample; sample submit appears in inbox (Sample).
- Contact form submit appears in inbox (Contact); WhatsApp link opens `wa.me`.
- Admin: wrong password rejected; product/category CRUD reflected on the public site; status changes persist; logout returns to login and the guard blocks `/admin`.
- Toggle OS "reduce motion" and reload Home → GSAP animations are gated (no pinned-scroll hijack), per the existing requirement.
Stop the server.

- [ ] **Step 5: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "chore: final fixes from build/lint/acceptance pass"
```

---

## Self-review notes (author)

- **Spec coverage:** §2 routing → Tasks 15–30; §3 data model → Task 2; §4 data access → Tasks 3,5,12,26,28,29; §5 products → Tasks 22–24; §6 quote cart → Tasks 13–14,25; §7 admin → Tasks 7–11,26–30; §8 nav → Task 16; §9 page mapping → Tasks 18–21; §10 seed → Task 6; §11 deployment/env → Tasks 1,31; §12 verification → Task 32. All sections covered.
- **Type consistency:** `QuoteItem` (keyed by `productId`) is defined in Task 13 and consumed identically in Tasks 14, 16, 23, 25. `InquiryResult`/`LoginState` shapes match between action files and their consuming forms. Server-action form signatures: plain `(FormData)` actions are passed directly to `<form action>` (admin CRUD); `useActionState` actions use `(prevState, FormData)` (login, inquiries, delete-category, contact/sample/quote forms) — verified consistent per file.
- **Placeholder scan:** no TBD/TODO/"handle errors"/"similar to" left in steps; every code step contains full code.
- **Known intentional dynamic behavior:** DB-backed pages render dynamically after `npm run build` — called out in Task 32 Step 3 so it isn't mistaken for a regression.
```
