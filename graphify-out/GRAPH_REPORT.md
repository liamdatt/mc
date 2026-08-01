# Graph Report - .  (2026-07-21)

## Corpus Check
- Large corpus: 997 files · ~24,159,089 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 726 nodes · 1424 edges · 38 communities (32 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.82)
- Token cost: 241,703 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin & Portal Pages|Admin & Portal Pages]]
- [[_COMMUNITY_Products Catalog Pages|Products Catalog Pages]]
- [[_COMMUNITY_ImageData Extraction Scripts|Image/Data Extraction Scripts]]
- [[_COMMUNITY_Architecture Concepts (docs)|Architecture Concepts (docs)]]
- [[_COMMUNITY_NPM Dependencies|NPM Dependencies]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Feature Plans & Data Models|Feature Plans & Data Models]]
- [[_COMMUNITY_Email Templates & Settings|Email Templates & Settings]]
- [[_COMMUNITY_Public API Routes|Public API Routes]]
- [[_COMMUNITY_Product Detail & Sample Forms|Product Detail & Sample Forms]]
- [[_COMMUNITY_Admin Login & Image Upload|Admin Login & Image Upload]]
- [[_COMMUNITY_Contact & Layout Primitives|Contact & Layout Primitives]]
- [[_COMMUNITY_Product Variant Admin|Product Variant Admin]]
- [[_COMMUNITY_Nav, Logo & Buttons|Nav, Logo & Buttons]]
- [[_COMMUNITY_Hero & Scroll Motion|Hero & Scroll Motion]]
- [[_COMMUNITY_Home & About Pages|Home & About Pages]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Admin Product Forms|Admin Product Forms]]
- [[_COMMUNITY_Admin Category Forms|Admin Category Forms]]
- [[_COMMUNITY_Admin Sales Rep Forms|Admin Sales Rep Forms]]
- [[_COMMUNITY_Solutions Page Sections|Solutions Page Sections]]
- [[_COMMUNITY_Admin Customer Forms|Admin Customer Forms]]
- [[_COMMUNITY_CSR Gallery & Scroll Reveals|CSR Gallery & Scroll Reveals]]
- [[_COMMUNITY_Admin Listings & Deletes|Admin Listings & Deletes]]
- [[_COMMUNITY_Brand Wordmarks & Trust Bar|Brand Wordmarks & Trust Bar]]
- [[_COMMUNITY_Product XLSX Extractor|Product XLSX Extractor]]
- [[_COMMUNITY_Admin Category Listing|Admin Category Listing]]
- [[_COMMUNITY_Edit Pages & 404|Edit Pages & 404]]
- [[_COMMUNITY_Next.js 16 Conventions|Next.js 16 Conventions]]
- [[_COMMUNITY_Image Gen Script|Image Gen Script]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Project Manager (Mia)|Project Manager (Mia)]]
- [[_COMMUNITY_Auth Client Exports|Auth Client Exports]]

## God Nodes (most connected - your core abstractions)
1. `Container()` - 27 edges
2. `requireAdmin()` - 27 edges
3. `Eyebrow()` - 25 edges
4. `Section()` - 21 edges
5. `getPortalSession()` - 21 edges
6. `useReducedMotion()` - 19 edges
7. `cn()` - 18 edges
8. `compilerOptions` - 16 edges
9. `RevealOnScroll()` - 14 edges
10. `SeedListing` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Public Product API (proposal)` --semantically_similar_to--> `Public Read-Only Product API`  [INFERRED] [semantically similar]
  proposal.md → docs/api.md
- `Recommended Tech Stack (Next.js/Tailwind/GSAP/Lenis/Framer)` --semantically_similar_to--> `Motion System (Lenis + GSAP + Framer Motion)`  [INFERRED] [semantically similar]
  Minott_Chemicals_Design_Prompt.md → CLAUDE.md
- `Brand DNA (palette, typography, voice)` --semantically_similar_to--> `Design Tokens (dual-synced globals.css + tokens.ts)`  [INFERRED] [semantically similar]
  Minott_Chemicals_Design_Prompt.md → CLAUDE.md
- `Next.js Agent Rules (read docs before coding)` --semantically_similar_to--> `Next.js 16 / React 19 Conventions`  [INFERRED] [semantically similar]
  minott-web/AGENTS.md → CLAUDE.md
- `Homepage Demo Handoff (2026-05-27)` --semantically_similar_to--> `Marketing Website (multi-page)`  [INFERRED] [semantically similar]
  docs/handoff/2026-05-27-minott-demo-handoff.md → proposal.md

## Import Cycles
- 1-file cycle: `minott-web/lib/email/resend.ts -> minott-web/lib/email/resend.ts`

## Hyperedges (group relationships)
- **Delivered Web Platform Features** — proposal_marketing_website, proposal_product_database, proposal_quote_builder, proposal_admin_panel, proposal_ai_chatbot, proposal_public_product_api [EXTRACTED 1.00]
- **Catalog Data Flow (DB → API → Chatbot)** — claude_prisma_sqlite_setup, minott_web_readme_catalog_import, docs_api_public_api, docs_api_onechat_widget [INFERRED 0.85]
- **Motion + Reduced-Motion Accessibility System** — claude_motion_system, claude_reduced_motion, minott_chemicals_design_prompt_smooth_scroll, docs_handoff_a11y_audit [INFERRED 0.85]
- **Unified Inquiry Lifecycle (quote/sample/contact submit + notify)** — docs_superpowers_plans_2026_06_02_minott_multipage_products_admin_inquiry_model, docs_superpowers_plans_2026_06_02_minott_multipage_products_admin_inquiry_item_model, docs_superpowers_plans_2026_06_02_minott_multipage_products_admin_quote_cart_provider, docs_superpowers_plans_2026_07_21_resend_email_notifications_send_inquiry_emails [INFERRED 0.75]
- **Animation-heavy Motion Architecture** — docs_superpowers_plans_2026_05_27_minott_chemicals_homepage_implementation_motion_system, docs_superpowers_plans_2026_05_27_minott_chemicals_homepage_implementation_design_tokens, minott_web_docs_superpowers_specs_2026_06_02_about_us_page_redesign_design_our_story_timeline [INFERRED 0.75]
- **Products Catalog Data Model** — docs_superpowers_plans_2026_06_02_minott_multipage_products_admin_category_model, docs_superpowers_plans_2026_06_02_minott_multipage_products_admin_product_model, docs_superpowers_plans_2026_06_22_product_variants_product_variant_model [INFERRED 0.85]

## Communities (38 total, 6 thin omitted)

### Community 0 - "Admin & Portal Pages"
Cohesion: 0.05
Nodes (46): AdminCustomersPage(), TABS, { GET, POST }, GET(), isoDate(), metadata, PortalHistoryPage(), NAV (+38 more)

### Community 1 - "Products Catalog Pages"
Cohesion: 0.08
Nodes (32): AllProductsPage(), metadata, ProductWithCategory, generateMetadata(), ProductDetailPage(), CATEGORY_ICONS, FEATURES, metadata (+24 more)

### Community 2 - "Image/Data Extraction Scripts"
Cohesion: 0.09
Nodes (31): find_best_image_blob(), main(), Return the largest (base64, ext) image payload found across given files., Canonicalise the output path; reject non-image extensions and system dirs., validate_output_path(), BINS, CHEMICALS, CLEANING_TOOLS (+23 more)

### Community 3 - "Architecture Concepts (docs)"
Cohesion: 0.05
Nodes (46): Admin Auth (signed httpOnly cookie session), Design Tokens (dual-synced globals.css + tokens.ts), force-dynamic Root Layout, Unified Inquiry Model, Motion System (Lenis + GSAP + Framer Motion), Prisma 7 + SQLite Setup, Reduced-Motion Accessibility Gate, gpt-image-2 Skill (ChatGPT Images 2.0 via Codex CLI) (+38 more)

### Community 4 - "NPM Dependencies"
Cohesion: 0.04
Nodes (44): dependencies, better-auth, better-sqlite3, clsx, framer-motion, gsap, @gsap/react, lenis (+36 more)

### Community 5 - "Root Layout & Fonts"
Cohesion: 0.09
Nodes (26): bebas, jetbrains, metadata, montserrat, RootLayout(), formatDate(), metadata, PortalHistoryDetailPage() (+18 more)

### Community 6 - "Feature Plans & Data Models"
Cohesion: 0.09
Nodes (32): Minott Chemicals Homepage (Implementation Plan), Design Tokens (Tailwind v4 @theme + lib/tokens.ts), Motion System (Lenis + GSAP + Framer Motion), Multi-Page Site + Products DB + Admin (Plan), Category Model, InquiryItem (Quote Line Item), Unified Inquiry Model (QUOTE|SAMPLE|CONTACT), Product Model (+24 more)

### Community 7 - "Email Templates & Settings"
Cohesion: 0.11
Nodes (22): AdminSettingsPage(), SettingsForm(), SettingsFormData, emailColors, EmailLayout(), COPY, InquiryConfirmation(), InquiryConfirmationProps (+14 more)

### Community 8 - "Public API Routes"
Cohesion: 0.16
Nodes (24): GET(), GET(), parseBool(), GET(), enforceRateLimit(), jsonData(), jsonError(), absoluteUrl() (+16 more)

### Community 9 - "Product Detail & Sample Forms"
Cohesion: 0.12
Nodes (21): ProductDetailActions(), ProductDetailView(), Props, initial, SampleRequestForm(), SampleVariant, Props, SelectableVariant (+13 more)

### Community 10 - "Admin Login & Image Upload"
Cohesion: 0.13
Nodes (18): initial, AdminLayout(), NAV, EXT, POST(), UPLOAD_DIR, login(), LoginState (+10 more)

### Community 11 - "Contact & Layout Primitives"
Cohesion: 0.14
Nodes (13): metadata, metadata, PILLARS, Container(), Section(), Tone, toneMap, BOARD (+5 more)

### Community 12 - "Product Variant Admin"
Cohesion: 0.16
Nodes (15): initial, ListingRef, Variant, VariantManager(), createVariant(), deleteVariant(), isUniqueViolation(), num() (+7 more)

### Community 13 - "Nav, Logo & Buttons"
Cohesion: 0.15
Nodes (15): Logo(), CategoryLink, CTA_LINKS, LINKS, BaseProps, Button, ButtonAsButton, ButtonAsLink (+7 more)

### Community 14 - "Hero & Scroll Motion"
Cohesion: 0.13
Nodes (10): LenisProvider(), CinematicHero(), PARTICLES, TRUST_ITEMS, FounderStory(), PARAS, BrandedMap(), CARDS (+2 more)

### Community 15 - "Home & About Pages"
Cohesion: 0.14
Nodes (12): metadata, AnimatedNumber(), AboutHero(), Stat, STATS, CompanyValues(), LegacyBanner(), MissionStatement() (+4 more)

### Community 16 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 17 - "Admin Product Forms"
Cohesion: 0.19
Nodes (10): ImageUpload(), Category, ProductForm(), ProductValues, buildData(), createProduct(), isUniqueViolation(), num() (+2 more)

### Community 18 - "Admin Category Forms"
Cohesion: 0.24
Nodes (9): CategoryForm(), CategoryValues, buildData(), CategoryFormState, createCategory(), isUniqueViolation(), num(), updateCategory() (+1 more)

### Community 19 - "Admin Sales Rep Forms"
Cohesion: 0.22
Nodes (9): EditSalesRepPage(), SalesRepForm(), SalesRepFormData, buildData(), createSalesRep(), deleteSalesRep(), SalesRepFormState, updateSalesRep() (+1 more)

### Community 20 - "Solutions Page Sections"
Cohesion: 0.18
Nodes (7): metadata, metadata, Eyebrow(), IndustriesGrid(), TILES, TailoredSolutions(), PILLARS

### Community 21 - "Admin Customer Forms"
Cohesion: 0.21
Nodes (9): EditCustomerPage(), CustomerForm(), CustomerFormData, SalesRepOption, createCustomer(), CreateCustomerState, isUniqueViolation(), parseSalesRepId() (+1 more)

### Community 22 - "CSR Gallery & Scroll Reveals"
Cohesion: 0.19
Nodes (11): Props, RevealOnScroll(), ALL_PHOTOS, CsrEvent, CsrGallery(), EVENTS, Photo, clipReveal (+3 more)

### Community 23 - "Admin Listings & Deletes"
Cohesion: 0.17
Nodes (5): Row, DeleteSalesRepButton(), initial, deleteProduct(), globalForPrisma

### Community 24 - "Brand Wordmarks & Trust Bar"
Cohesion: 0.25
Nodes (3): BRAND_SLOTS, BrandSlot, TrustBar()

### Community 25 - "Product XLSX Extractor"
Cohesion: 0.52
Nodes (6): extract(), first_sentence(), main(), slugify(), title_case(), volume_from()

### Community 26 - "Admin Category Listing"
Cohesion: 0.40
Nodes (3): DeleteCategoryButton(), initial, deleteCategory()

### Community 27 - "Edit Pages & 404"
Cohesion: 0.50
Nodes (3): EditCategoryPage(), EditProductPage(), NotFound()

### Community 28 - "Next.js 16 Conventions"
Cohesion: 0.67
Nodes (3): Next.js 16 / React 19 Conventions, Next.js Agent Rules (read docs before coding), minott-web CLAUDE.md (re-exports AGENTS.md)

## Knowledge Gaps
- **202 isolated node(s):** `gen.sh script`, `metadata`, `NAV`, `Row`, `TABS` (+197 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `resend` connect `NPM Dependencies` to `Email Templates & Settings`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `Eyebrow()` connect `Solutions Page Sections` to `Admin & Portal Pages`, `Products Catalog Pages`, `Root Layout & Fonts`, `Product Detail & Sample Forms`, `Contact & Layout Primitives`, `Nav, Logo & Buttons`, `Hero & Scroll Motion`, `CSR Gallery & Scroll Reveals`, `Brand Wordmarks & Trust Bar`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `Return the largest (base64, ext) image payload found across given files.`, `Canonicalise the output path; reject non-image extensions and system dirs.`, `gen.sh script` to the rest of the system?**
  _208 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin & Portal Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.053313587560162905 - nodes in this community are weakly interconnected._
- **Should `Products Catalog Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.08067375886524823 - nodes in this community are weakly interconnected._
- **Should `Image/Data Extraction Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.0851063829787234 - nodes in this community are weakly interconnected._
- **Should `Architecture Concepts (docs)` be split into smaller, more focused modules?**
  _Cohesion score 0.04734299516908213 - nodes in this community are weakly interconnected._