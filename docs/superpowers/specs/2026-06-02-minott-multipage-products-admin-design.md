# Minott Chemicals — Multi-Page Site + Products DB + Admin — Design

**Date:** 2026-06-02
**Project:** Minott Equipment & Chemicals Limited website
**Author:** Claude (for FloPro Limited)
**Status:** Approved — ready for implementation planning

---

## 1. Background & goal

The current `minott-web/` app is a single, fully-static scrolling landing page (10 stacked sections, Next.js 16 / React 19 / Tailwind v4, heavy GSAP + Framer Motion + Lenis motion system).

Per the client (MEC Website Project Overview), the site should instead be a **separated multi-page website** with a real **products catalog**. This project:

1. Splits the one-pager into 6 distinct pages matching the client's desired nav: **Home, About Us, Products, Solutions, Social Responsibility, Contact**.
2. Adds a **database-driven products catalog** with category browsing and product detail pages.
3. Backs products and inbound requests with a **SQLite database via Prisma ORM**, populated by a **seed script**.
4. Adds a password-protected **admin area** for managing products/categories and viewing inbound requests.
5. Implements the client's requested commerce flow: **"Add to Quote"** (not cart), plus **"View SDS"** and **"Request Sample"** for chemicals.

Existing sections, the design system (tokens in `globals.css` `@theme` + `lib/tokens.ts`), Nav, Footer, and the motion stack are **reused and redistributed**, not rebuilt.

### Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Runtime / hosting | Node server (`next start`), SQLite file on local disk, self/VPS-hosted (Render/Railway/Fly/Docker). No longer static/Vercel-serverless. |
| ORM | **Prisma** (client over `better-sqlite`-style file DB). |
| Admin auth | Single `ADMIN_PASSWORD` env var → signed httpOnly session cookie → middleware-guarded `/admin/*`. No user accounts. |
| Page scope | All 6 pages fully built. |
| Quote flow | localStorage quote cart → submit persists to DB; sample + contact also persisted; SDS link per product. |
| Inbound messages | **Unified** into one `Inquiry` model (`type` = QUOTE \| SAMPLE \| CONTACT). |
| Product images | Single placeholder for all products (`assets/2.png` → `public/images/product-placeholder.png`); admin sets image via text path field. |
| Tests | Manual click-through checklist + clean build/migrate/seed. Vitest optional, not in scope unless requested. |

---

## 2. Architecture & routing

App Router, multi-page. Reads run in Server Components (direct Prisma calls); writes run through **Server Actions**. `middleware.ts` protects `/admin/*` except `/admin/login`.

```
app/
  layout.tsx                       fetches categories (for Nav dropdown), mounts Nav/Footer/motion
  page.tsx                         Home
  about/page.tsx                   About Us
  solutions/page.tsx               Solutions (industries + use-cases)
  social-responsibility/page.tsx   Social Responsibility
  contact/page.tsx                 Contact
  products/
    page.tsx                       Catalog: category cards + featured products
    [category]/page.tsx            Category listing (filtered grid)
    [category]/[slug]/page.tsx     Product detail
  quote/page.tsx                   Quote cart review + submit
  admin/
    login/page.tsx                 password form
    layout.tsx                     server-side auth gate for all children
    page.tsx                       dashboard (counts, quick links)
    products/page.tsx              product list
    products/new/page.tsx          create product
    products/[id]/edit/page.tsx    edit product
    categories/page.tsx            category list
    categories/[id]/edit/page.tsx  edit category
    categories/new/page.tsx        create category
    requests/page.tsx              inquiry inbox (filter by type, set status)
  not-found.tsx                    existing 404
```

URL shapes:
- Category pages: `/products/[category]` (e.g. `/products/industrial-household-chemicals`).
- Product detail: `/products/[category]/[slug]` (hierarchical, breadcrumb-friendly).
- Category & product slugs are globally unique.

---

## 3. Data model (Prisma + SQLite)

`prisma/schema.prisma`, `provider = "sqlite"`, `url = env("DATABASE_URL")` → `file:./prisma/app.db`.

```prisma
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
  id               Int      @id @default(autoincrement())
  slug             String   @unique
  name             String
  category         Category @relation(fields: [categoryId], references: [id])
  categoryId       Int
  shortDescription String?
  description      String?
  imagePath        String   @default("/images/product-placeholder.png")
  isChemical       Boolean  @default(false)   // shows View SDS + Request Sample
  sdsUrl           String?
  sampleAvailable  Boolean  @default(false)
  sku              String?
  featured         Boolean  @default(false)
  active           Boolean  @default(true)
  sortOrder        Int      @default(0)
  inquiryItems     InquiryItem[]
  sampleInquiries  Inquiry[]   @relation("SampleInquiryProduct")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Inquiry {
  id         Int       @id @default(autoincrement())
  type       String    // "QUOTE" | "SAMPLE" | "CONTACT" (app-validated)
  status     String    @default("NEW") // "NEW" | "IN_PROGRESS" | "CLOSED"
  name       String
  company    String?
  email      String
  phone      String?
  message    String?
  product    Product?  @relation("SampleInquiryProduct", fields: [productId], references: [id], onDelete: SetNull)
  productId  Int?      // set for SAMPLE
  items      InquiryItem[]
  createdAt  DateTime  @default(now())
}

model InquiryItem {
  id          Int      @id @default(autoincrement())
  inquiry     Inquiry  @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  inquiryId   Int
  product     Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  productId   Int?
  productName String   // snapshot, survives product deletion
  quantity    Int      @default(1)
}
```

Notes:
- SQLite/Prisma has no native enums → `type` and `status` are validated strings (constants in `lib/constants.ts`).
- `onDelete: SetNull` on inquiry→product links + `productName` snapshot preserve request history when a product is deleted.

---

## 4. Data access layer

- `lib/db.ts` — Prisma client **singleton** (`globalThis` guard to avoid dev hot-reload connection leaks).
- `lib/products.ts` — typed read helpers: `getCategories()`, `getCategoryBySlug()`, `getProductsByCategory()`, `getProductBySlugInCategory()`, `getFeaturedProducts()`, `getCatalog()`.
- `lib/actions/` — Server Actions (`"use server"`), each validating input:
  - `inquiries.ts` — `submitQuote`, `submitSample`, `submitContact`.
  - `admin-products.ts` — `createProduct`, `updateProduct`, `deleteProduct`.
  - `admin-categories.ts` — `createCategory`, `updateCategory`, `deleteCategory`.
  - `admin-inquiries.ts` — `setInquiryStatus`.
  - `auth.ts` — `login`, `logout`.
- `lib/constants.ts` — `INQUIRY_TYPE`, `INQUIRY_STATUS` value sets + label maps.

---

## 5. Products experience

- **Catalog** `/products`: hero/eyebrow header, grid of category cards (image + name + count), then a "Featured" product strip.
- **Category** `/products/[category]`: breadcrumb, category intro, responsive product grid. Each card: image, name, short description, **Add to Quote**; chemicals also show an SDS affordance.
- **Detail** `/products/[category]/[slug]`: large image, name, SKU (if any), description, **Add to Quote** (qty selector). If `isChemical`:
  - **View SDS** → opens `sdsUrl` in new tab; if `sdsUrl` is null, render the button disabled with an inline "SDS available on request" note.
  - **Request Sample** (visible when `sampleAvailable`) → opens a form (name/company/email/phone/message) → `submitSample` → `Inquiry{type:SAMPLE, productId}`; success state inline.
- Only `active` products are shown publicly. All products use the placeholder image unless an admin sets another path.

---

## 6. Quote cart

- `components/quote/QuoteCartProvider.tsx` — client React context, persisted to `localStorage` (`mec_quote_cart`). API: `addItem(product)`, `removeItem`, `setQuantity`, `clear`, `items`, `count`.
- **Add to Quote** buttons call `addItem`; a cart-count badge appears in the Nav.
- `/quote` page: lists line items (name, qty editable, remove), a contact form (name, company, email, phone, message), and **Submit Quote Request** → `submitQuote` writes `Inquiry{type:QUOTE}` + `InquiryItem[]`, shows a success state, and clears the cart.
- Empty-cart state links back to `/products`.

---

## 7. Admin area

- **Login** `/admin/login`: single password field → `login` action compares to `ADMIN_PASSWORD`; on success sets a signed httpOnly cookie `mec_admin` (HMAC-SHA256 of a payload using `SESSION_SECRET`, with expiry). On failure, inline error.
- **Gate**: `middleware.ts` checks the cookie signature/expiry for `/admin/*` (excluding `/admin/login`); invalid → redirect to login. `app/admin/layout.tsx` adds a server-side re-check + admin chrome (sidebar nav, logout).
- **Dashboard** `/admin`: counts (products, categories, new inquiries) + quick links.
- **Products**: list (name, category, flags, active toggle); create/edit form (all Product fields; image as text path defaulting to placeholder; category select; isChemical/sampleAvailable/featured/active checkboxes); delete with confirm.
- **Categories**: list + create/edit (name, slug, description, image path, sort order); delete guarded if it has products (block or reassign — block with message for simplicity).
- **Requests inbox** `/admin/requests`: table of inquiries, filter tabs by type (Quote/Sample/Contact), expand to see items/product/contact details, status dropdown (`setInquiryStatus`). Sorted newest first.

Slugs auto-generated from name on create (editable), uniqueness validated.

---

## 8. Navigation

`components/layout/Nav.tsx` becomes route-based:
- Links: Home, About Us, Products, Solutions, Social Responsibility, Contact.
- **Products** has a **hover dropdown** listing categories (deep-linking to `/products/[category]`), plus an "All Products" entry.
- Categories are fetched in the server `app/layout.tsx` and passed as props to the client `<Nav categories={...}>`.
- Retains scroll-aware transparent→frosted behavior and the mobile overlay; the mobile overlay nests categories under Products.
- Adds a quote-cart count badge (from `QuoteCartProvider`).
- Active-route highlighting via `usePathname()`.

---

## 9. Page content mapping

Existing section components are reused; new content is drawn from the knowledge base (`Minott_Chemicals_Knowledge_Base.docx`) and flagged for client confirmation where it relies on third-party claims.

| Page | Composition |
|---|---|
| **Home** | Hero · TrustBar · DualPlay · ProductCategories (CTA → `/products`) · NumbersBar · QuoteCTA |
| **About Us** | FounderStory · company history + dual identity (manufacturer + distributor) · NumbersBar · Elite Distributor brands (3M, NSS, San Jamar, Rubbermaid, Purell) |
| **Solutions** | IndustriesGrid · per-industry blurbs (hospitality, medical, manufacturing, financial, telecoms, entertainment, retail, janitorial, sanitation) |
| **Social Responsibility** | New page — earth-friendly chemicals (safe for daycares & Homes for the Aged), quality/ISO posture, community commitment. Content from KB §3/§5, marked for client confirmation. |
| **Contact** | LocationContact (address, hours, phones, branded SVG map) · contact form (→ `Inquiry{type:CONTACT}`) · WhatsApp quick-contact button (`wa.me` link — the doc's "WhatsApp option") |

---

## 10. Seed script

`prisma/seed.ts`, wired via `package.json` `"prisma": { "seed": "..." }`, run with `prisma db seed`. Re-runnable via `upsert` keyed on slug.

- **Categories (4):** Industrial & Household Chemicals, Janitorial Equipment & Supplies, Personal Protection Equipment (PPE), Paper Products — reusing existing category images (`product-chemicals.jpg`, etc.).
- **Products:** a representative spread per category, derived from the knowledge base detailed listings (e.g. chemicals: All-Purpose Cleaner / "Time Saver", Degreaser, Disinfectant, Bleach; janitorial: mop buckets, brooms, cleaning carts, floor cleaners; PPE: nitrile/latex gloves, KN95 masks, isolation gowns; paper: hand towels, jumbo roll, bathroom tissue). Chemical-category products get `isChemical: true` and `sampleAvailable: true`. All use the placeholder image.

---

## 11. Deployment & configuration changes

- Site is **no longer static**. Build: `prisma generate && prisma migrate deploy && next build`. Run: `next start`. Persist `prisma/app.db` on disk between deploys.
- New env vars (add `.env.example`):
  - `DATABASE_URL="file:./prisma/app.db"`
  - `ADMIN_PASSWORD=...`
  - `SESSION_SECRET=...` (HMAC signing key)
- Copy `assets/2.png` → `minott-web/public/images/product-placeholder.png`.
- Update root `CLAUDE.md`: multi-page architecture, Prisma/SQLite, admin, env vars, new build/run flow (supersedes the "fully static" note).

---

## 12. Verification

No automated test framework exists; verification is pragmatic:

1. `prisma migrate dev` + `prisma db seed` run clean.
2. `npm run build` passes; `npm run lint` clean.
3. Manual click-through checklist:
   - Nav reaches all 6 pages; Products dropdown lists seeded categories; active-route highlight works; mobile overlay works.
   - Catalog → category → product detail render from DB; only active products show.
   - Add to Quote → badge updates → `/quote` → submit → success + cart cleared → appears in `/admin/requests` (Quote).
   - Chemical detail shows SDS + Request Sample; sample submit appears in inbox (Sample).
   - Contact form submit appears in inbox (Contact); WhatsApp link opens.
   - Admin: login (wrong password rejected), product/category CRUD reflected on public site, status changes persist, logout + guard works.
   - Reduced-motion still gates all GSAP (existing requirement preserved on every page).

Optional (not in scope unless requested): Vitest coverage for the data layer and Server Actions.

---

## 13. Out of scope

- Customer accounts / sign-in (Camcorp-style repeat-customer login) — future phase.
- Email/notification delivery for inquiries (DB-only this pass).
- Image uploads in admin (text path only).
- CMS, pricing, online payment, multi-language.
- Per-industry sub-pages under Solutions.
