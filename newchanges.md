# MEC Website — Build To-Do List & Customer Portal Spec

**FloPro Ltd. · Minott Equipment & Chemicals Ltd.**
Based on client feedback dated 03/06/2026

This to-do list translates the client review notes into actionable build tasks, organized page by page, followed by a full specification for the requested Customer Portal. Each item is grouped under Layout or Content to mirror the client's review structure.

---

## Global / Cross-Page Tasks

- [ ] Update site link from `mce.floproltd.com` to `minottchem.com` once ready to launch (currently held by landing page).
- [ ] Replace the cursor-tracking effect with a traditional mouse cursor (flagged as distracting).
- [ ] Obtain and integrate MEC's official logo asset.
- [ ] Add primary nav buttons for "Tailored Solutions" and "Customer Portal" alongside existing "Request a Quote" and "Products".
- [ ] Give each partner brand (3M, San Jamar, Rubbermaid, Purell) its own logo treatment.
- [ ] Persistent AI chatbot widget in the bottom-right corner across product pages for product questions/suggestions.
- [ ] Coordinate with Marketing/PR on approved photography before populating imagery site-wide.

---

## Home Page

### Layout

- [ ] Replace mouse tracker with a traditional cursor.
- [ ] Highlight "See Our Products" in red so it stands out over "Request a Quote".
- [ ] Supply and place MEC logo — increase its size.
- [ ] Add "Tailored Solutions" and "Customer Portal" buttons.
- [ ] Study Camcorp's site for inspiration; introduce video or a less-static hero treatment.
- [ ] Pull the bottom segment from the About Us page onto the Home page as well.
- [ ] Align with Marketing/PR on hero/home imagery.

### Content

- [ ] Enlarge logo.
- [ ] Keep tagline: "Jamaica's Most Trusted Partner in Clean Since 1990."
- [ ] Replace "Cleaner Spaces. Stronger Business." with a punchier line, e.g. "MEC – Your Premium Source for Janitorial and Industrial Supplies."
- [ ] Update the intro paragraph (remove NSS from the brand list). Preferred copy:
  - "For over 30 years, we have powered clean, safe, and productive spaces across Jamaica by combining locally manufactured chemical solutions with world-class equipment and supplies from trusted brands including 3M, San Jamar, Rubbermaid, and Purell."
- [ ] Display each brand with its own logo.

---

## About Us

### Layout

- [ ] Source professional photos of the Executives and Board of Directors.
- [ ] Reuse the bottom segment of this page on the Home page.

### Content

- [ ] Add a mission/value statement at the top of the page. Client provided three options:
  - **Technical** — "To be Jamaica's most trusted provider of chemicals, sanitation solutions, and industrial equipment by delivering innovative products, technical expertise, and outstanding customer service that drive operational excellence for our clients."
  - **Impact** — "To build lasting partnerships by providing reliable chemicals, equipment, and support services that help businesses thrive while contributing to the growth and development of Jamaica."
  - **Simple** — "To deliver comprehensive chemical, sanitation, and facility solutions that create cleaner, safer, and more productive environments for the businesses and communities we serve."
- [ ] Insert professional photos of Mr. and Ms. Minott, executive team, and directors (can be a later step).

---

## Products

### Layout

- [ ] Add a line in the top section: "Come visit our showroom at 14½ Retirement Rd to see our range of products in-person."
- [ ] Add a line directing users to the AI chatbot (bottom-right) for product questions/suggestions.
- [ ] In the "Can't find what you need?" section, add a button linking to the sales rep WhatsApp line.
- [ ] Add a search bar on the main product page, all-products view, and every product category page.
- [ ] On category pages, add filters for product category and industry.
- [ ] On chemical product pages, add volume and color filter/options.
- [ ] Repeat the showroom + AI chatbot top banner across all product-related pages.
- [ ] Add a dismissible instruction banner (can be "X'd" out):
  - Returning customers: sign in to the Customer Portal to view purchasing history and request quotes for new products.
  - New customers: "Add items to quote," then view and request the quote (top-right) to enter your information and receive a quote within 48 hours.
- [ ] Give the Chemicals category subsections (sourced from the product listing).

### Content

- [ ] Populate item name, description, details, and images from the product listing.

**Product Categories:**

- Industrial & Household Chemicals
- Garbage Bins
- Garbage Bags
- Janitorial Supplies
- Dispensers
- Personal Protection Equipment (PPE)
- Paper Products
- Aerosols
- Safety Supplies
- Floor Maintenance Products
- Consumer Products
- Custom Products

---

## Solutions ("Tailored Solutions")

### Layout

- [ ] Build three cards/segments: "Custom Products," "Janitorial Services," and "Facility Evaluation."

### Content

- [ ] **Custom Products** — "Have a product request you can't find on our website? Contact us to see how we can facilitate product sourcing." (matting to be added later.)
- [ ] **Facility Evaluation** — "Looking to refurbish your facilities? Let a MEC sales representative tour your facility for free to evaluate how we can best serve you."
- [ ] **Janitorial Services** — copy to be supplied by client (left blank in the brief).

---

## Social Responsibility

### Layout

- [ ] Create a gallery with photos from CSR events (e.g., Sigma 2026, Read Across Jamaica).

### Content

- [ ] Use heading "Clean That Cares" or the alternate "A Legacy of Service, A Future of Impact."
- [ ] Body copy: "Doing right by the people and place that have facilitated our growth is how we do business — from the chemistry we put in the bottle to the communities we serve."

---

## Contact

### Layout

- [ ] Approved as-is — no layout changes required.

### Content

- [ ] Copy: "Send us a message and a sales consultant will follow up within one business day — or connect with us on WhatsApp as your preferred method of communication."

---

# Customer Portal — New Build Specification

**Goal:** give returning B2B customers fast, self-service access to their purchasing history and a streamlined way to re-order or request quotes — reducing friction for repeat buyers and call/WhatsApp volume for the sales team.

## 1. Access & Authentication

- [ ] Sign-in entry points: "Customer Portal" nav button (site-wide) and the dismissible banner on product pages.
- [ ] Account-based login (email + password) with password reset; optional WhatsApp/phone OTP as a convenience for B2B users.
- [ ] Accounts provisioned by MEC (sales/admin) and tied to a customer/company profile so history maps to the correct buyer.
- [ ] "Remember me" / persistent session for frequent re-ordering.
- [ ] Role note for Phase 2: support multiple users per company account (e.g., procurement contacts).

## 2. Purchasing History (core requested feature)

- [ ] Dashboard landing view summarizing recent orders and quotes.
- [ ] Full order/purchase history list with: order/quote reference, date, items, quantities, status, and total (where applicable).
- [ ] Search and filter history by date range, product category, and order status.
- [ ] Order detail view showing line items, quantities, and linked products.
- [ ] "Reorder" / "Add to quote" action on any past order or line item to repopulate the quote builder instantly.
- [ ] Export history (PDF/CSV) for the customer's own records.

## 3. Quote Management

- [ ] View status of submitted quote requests (pending, quoted, accepted).
- [ ] Request a new quote for new products directly from the portal (ties into the site-wide quote builder).
- [ ] Saved/active quote (cart) carried across sessions for logged-in users.
- [ ] 48-hour quote turnaround messaging surfaced in the portal, consistent with the product-page banner.

## 4. Account & Profile

- [ ] View/edit company and contact details (billing/delivery contacts, phone, WhatsApp, email).
- [ ] Showroom/sales-rep contact shortcuts (WhatsApp line) inside the portal.
- [ ] Saved/favorite products or "frequently ordered" list for one-tap reorder.

## 5. Integration Points

- [ ] Quote builder — shared component between public product pages and the portal.
- [ ] Product catalog — history line items link back to current product pages.
- [ ] AI chatbot — logged-in context so "Mia" can reference the customer's history (Phase 2 enhancement).
- [ ] Backend/database — requires the product catalog DB and a customer/orders data model (Phase 2 backend scope).

## 6. Phasing Recommendation

The Customer Portal depends on backend, database, and authentication infrastructure currently deferred to Phase 2. Recommend scoping it as a Phase 2 deliverable. The demo build can include a static portal entry point and UI mockups (sign-in screen, dashboard, history view) so the client can preview the experience without the live data layer.
