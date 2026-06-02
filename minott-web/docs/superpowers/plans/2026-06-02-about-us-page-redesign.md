# About Us Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `app/about/page.tsx` into a six-section, animation-rich About Us page modeled on the client mockup, centered on a scroll-driven GSAP timeline.

**Architecture:** Six new named-export section components in `components/sections/`, composed by a rewritten `app/about/page.tsx`. Reuses existing primitives (`Section`, `Container`, `Eyebrow`, `AnimatedNumber`), `RevealOnScroll`, `lib/motion.ts` variants, `lib/tokens.ts` easings, and `lucide-react`. The "Our Story" centerpiece uses GSAP `DrawSVGPlugin` (scrubbed line draw, reduced-motion gated) + Framer reveals + `AnimatedNumber` count-ups. Global `Nav`/`Footer` already wrap every page.

**Tech Stack:** Next.js 16 / React 19, Tailwind v4 (CSS-first), GSAP (`DrawSVGPlugin`, `SplitText`, `ScrollTrigger`) + `@gsap/react`, Framer Motion, lucide-react.

**Testing note:** This repo has **no automated test suite** (per `CLAUDE.md`). Verification per task is `npx tsc --noEmit` + `npm run lint`; a final task runs `npm run build` and a manual click-through. Run all commands from `minott-web/`.

**Motion conventions (hard requirements, apply to every client/GSAP task):**
- Register GSAP plugins SSR-guarded at module top: `if (typeof window !== "undefined") gsap.registerPlugin(...)`.
- Every `useGSAP` block gates on reduced motion: `const reduced = useReducedMotion(); ... if (reduced) return;` with `dependencies: [reduced]`.
- SplitText-split nodes get explicit `role="text"`.
- Default (un-animated) DOM/SVG state must be the *finished* visual state, so reduced-motion users (GSAP skipped) and SSR see a complete page.

---

### Task 1: Copy the person-placeholder asset into `public/`

**Files:**
- Create: `minott-web/public/images/person-placeholder.png` (copied from repo-root `assets/18.png`)

- [ ] **Step 1: Copy the asset**

Run (from repo root `/home/liamd/Work/github/Minott`):
```bash
cp assets/18.png minott-web/public/images/person-placeholder.png
```

- [ ] **Step 2: Verify it landed**

Run:
```bash
ls -la minott-web/public/images/person-placeholder.png
```
Expected: file exists, non-zero size (~1.8 MB).

- [ ] **Step 3: Commit**

```bash
cd minott-web
git add public/images/person-placeholder.png
git commit -m "chore(about): add person-placeholder image for team/timeline portraits"
```

---

### Task 2: `AboutHero` section

**Files:**
- Create: `minott-web/components/sections/AboutHero.tsx`

- [ ] **Step 1: Write the component**

Create `minott-web/components/sections/AboutHero.tsx`:

```tsx
"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { Calendar, Users, Package, MapPin } from "lucide-react";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

type Stat = {
  icon: typeof Calendar;
  value?: number;
  suffix?: string;
  display?: string;
  label: string;
};

const STATS: Stat[] = [
  { icon: Calendar, value: 40, suffix: "+", label: "Years of Excellence" },
  { icon: Users, value: 1000, suffix: "+", label: "Customers Served" },
  { icon: Package, value: 5000, suffix: "+", label: "Products Available" },
  { icon: MapPin, display: "Nationwide", label: "Coverage Across Jamaica" },
];

export function AboutHero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const root = ref.current;
      if (!root) return;
      const title = root.querySelector(".about-title");
      if (!title) return;

      const split = new SplitText(title, { type: "chars" });
      gsap.set(split.chars, { yPercent: 110 });
      gsap.set(".about-sub, .about-lede > *, .about-stat", {
        y: 24,
        opacity: 0,
      });

      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.2 });
      tl.to(split.chars, { yPercent: 0, stagger: 0.03, duration: 0.9 })
        .to(".about-sub", { y: 0, opacity: 1, duration: 0.6 }, "-=0.5")
        .to(
          ".about-lede > *",
          { y: 0, opacity: 1, stagger: 0.1, duration: 0.6 },
          "-=0.4",
        )
        .to(
          ".about-stat",
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.5 },
          "-=0.4",
        );

      return () => split.revert();
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section ref={ref} className="relative overflow-hidden bg-mec-pure pt-40 pb-24">
      <div aria-hidden className="absolute inset-0 bg-grid opacity-50" />
      <svg
        aria-hidden
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      >
        <path d="M 700 0 L 1440 360" stroke="#E10600" strokeWidth="2" fill="none" opacity="0.25" />
        <path d="M 900 0 L 1440 200" stroke="#E10600" strokeWidth="2" fill="none" opacity="0.15" />
      </svg>

      <Container>
        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h1 className="about-title overflow-hidden font-display-tight text-h1 leading-[0.9]">
              <span role="text">
                ABOUT <span className="text-mec-red">US</span>
              </span>
            </h1>
            <p className="about-sub mt-6 font-display text-[clamp(1.5rem,2.6vw,2.25rem)] leading-tight text-mec-ink">
              Our Legacy. Our Family.
              <br />
              Our Commitment to You.
            </p>
            <span aria-hidden className="mt-6 block h-1 w-16 bg-mec-red" />
            <div className="about-lede mt-8 max-w-xl space-y-5 text-lede text-mec-ink/80">
              <p>
                For over 40 years, Minott Equipment &amp; Chemicals has been
                built on hard work, strong values, and an unwavering commitment
                to our customers.
              </p>
              <p>A family business then, today, and for generations to come.</p>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:gap-x-4">
            {STATS.map(({ icon: Icon, value, suffix, display, label }) => (
              <li
                key={label}
                className="about-stat flex flex-col items-start border-l border-mec-red/30 pl-4"
              >
                <Icon className="h-7 w-7 text-mec-red" aria-hidden />
                <span className="mt-4 font-display text-[clamp(2rem,3vw,2.75rem)] leading-none text-mec-ink">
                  {display ? (
                    display
                  ) : (
                    <AnimatedNumber to={value ?? 0} suffix={suffix} />
                  )}
                </span>
                <span className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-mec-ink/70">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sections/AboutHero.tsx
git commit -m "feat(about): AboutHero with SplitText headline + animated stat row"
```

---

### Task 3: `OurStory` section (centerpiece timeline)

**Files:**
- Create: `minott-web/components/sections/OurStory.tsx`

- [ ] **Step 1: Write the component**

Create `minott-web/components/sections/OurStory.tsx`:

```tsx
"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Users } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);
}

const MILESTONES = [
  {
    years: 40,
    title: "1984 — A Vision Takes Root",
    body: "Forty years ago, our founder, Chester G. Minott, started Minott Equipment & Chemicals with a clear vision — to provide quality products, exceptional service, and honest relationships. With determination and hard work, he built a company grounded in integrity, reliability, and customer trust.",
  },
  {
    years: 15,
    title: "A New Chapter of Strength",
    body: "Fifteen years ago, [Successor Name] stepped in with courage and vision, taking the reins and leading the company through new challenges. Continuing the legacy, she transformed Minott Equipment & Chemicals into the strong, respected company it is today.",
  },
];

export function OurStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const root = ref.current;
      if (!root) return;
      const path = root.querySelector<SVGPathElement>(".story-spine path");
      const timeline = root.querySelector(".story-timeline");
      if (!path || !timeline) return;

      gsap.from(path, {
        drawSVG: "0%",
        ease: "none",
        scrollTrigger: {
          trigger: timeline,
          start: "top 75%",
          end: "bottom 65%",
          scrub: 1,
        },
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <Section tone="light" id="our-story">
      <div ref={ref}>
        <Container>
          <div className="flex items-center justify-center gap-6">
            <span aria-hidden className="h-px w-16 bg-mec-red/40" />
            <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] tracking-wide text-mec-ink">
              Our Story
            </h2>
            <span aria-hidden className="h-px w-16 bg-mec-red/40" />
          </div>

          <div className="story-timeline relative mt-16 grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
            <svg
              aria-hidden
              className="story-spine pointer-events-none absolute left-1/2 top-0 hidden h-full w-[3px] -translate-x-1/2 lg:block"
              viewBox="0 0 3 100"
              preserveAspectRatio="none"
            >
              <path d="M1.5 0 L1.5 100" stroke="#E10600" strokeWidth="3" fill="none" />
            </svg>

            {MILESTONES.map((m, i) => (
              <RevealOnScroll
                key={m.title}
                delay={i * 0.12}
                className="relative flex flex-col gap-8"
              >
                <div className="flex items-start gap-6">
                  <div className="shrink-0 text-center">
                    <span className="block font-display text-[clamp(3rem,5vw,4.5rem)] leading-none text-mec-red">
                      <AnimatedNumber to={m.years} />
                    </span>
                    <span className="mt-1 block font-display text-lg tracking-[0.1em] text-mec-ink">
                      Years Ago
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-2xl tracking-wide text-mec-ink">
                      {m.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-mec-ink/75">
                      {m.body}
                    </p>
                  </div>
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-mec-mist">
                  <Image
                    src="/images/person-placeholder.png"
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover opacity-80"
                  />
                </div>
              </RevealOnScroll>
            ))}

            <div className="absolute left-1/2 top-1/2 hidden h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-mec-red text-mec-pure shadow-lift lg:grid">
              <Users className="h-7 w-7" aria-hidden />
            </div>
          </div>

          <RevealOnScroll className="mx-auto mt-20 max-w-3xl text-center">
            <h3 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] tracking-wide text-mec-red">
              Today &amp; Beyond
            </h3>
            <p className="mt-5 text-lg leading-relaxed text-mec-ink/80">
              As a family, we remain hands-on in every aspect of the business.
              Our success is built not just on the products we provide, but on
              the relationships we build and the values we live by every day.
            </p>
          </RevealOnScroll>
        </Container>
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sections/OurStory.tsx
git commit -m "feat(about): OurStory timeline with DrawSVG spine + count-up milestones"
```

---

### Task 4: `CompanyValues` section

**Files:**
- Create: `minott-web/components/sections/CompanyValues.tsx`

- [ ] **Step 1: Write the component**

Create `minott-web/components/sections/CompanyValues.tsx`:

```tsx
"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { motion } from "framer-motion";
import { Users, ShieldCheck, BadgeCheck, TrendingUp, HeartHandshake } from "lucide-react";

const VALUES = [
  { icon: Users, title: "Family", body: "We treat our customers and team like family." },
  { icon: ShieldCheck, title: "Integrity", body: "We do the right thing, always." },
  { icon: BadgeCheck, title: "Quality", body: "We deliver trusted products and solutions." },
  { icon: TrendingUp, title: "Resilience", body: "We overcome challenges and keep moving forward." },
  { icon: HeartHandshake, title: "Commitment", body: "We are committed to our customers' success." },
];

export function CompanyValues() {
  return (
    <Section tone="light" pad={false} className="pb-[var(--spacing-section-y)]">
      <Container>
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-5"
        >
          {VALUES.map(({ icon: Icon, title, body }) => (
            <motion.li
              key={title}
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="flex flex-col items-center text-center"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-mec-red text-mec-red">
                <Icon className="h-7 w-7" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-2xl tracking-wide text-mec-red">
                {title}
              </h3>
              <p className="mt-3 max-w-[22ch] text-sm leading-relaxed text-mec-ink/70">
                {body}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sections/CompanyValues.tsx
git commit -m "feat(about): CompanyValues five-pillar row"
```

---

### Task 5: `LeadershipTeam` section

**Files:**
- Create: `minott-web/components/sections/LeadershipTeam.tsx`

- [ ] **Step 1: Write the component**

Create `minott-web/components/sections/LeadershipTeam.tsx`:

```tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const TEAM = [
  { role: "CEO", name: "Name Here", bio: "Leads the company with vision, passion, and a commitment to excellence." },
  { role: "CFO", name: "Name Here", bio: "Drives financial strategy and ensures long-term sustainability and growth." },
  { role: "COO", name: "Name Here", bio: "Oversees daily operations and ensures we deliver on our promises." },
  { role: "GM", name: "Name Here", bio: "Manages performance and builds strong customer and supplier partnerships." },
  { role: "Director", name: "Name Here", bio: "Supports strategic initiatives and drives business development." },
];

export function LeadershipTeam() {
  return (
    <Section tone="dark" id="leadership">
      <Container>
        <div className="flex items-center justify-center gap-6">
          <span aria-hidden className="h-px w-16 bg-mec-red/50" />
          <h2 className="text-center font-display text-[clamp(1.75rem,3vw,2.75rem)] tracking-wide text-mec-pure">
            Executive Leadership Team
          </h2>
          <span aria-hidden className="h-px w-16 bg-mec-red/50" />
        </div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5"
        >
          {TEAM.map(({ role, name, bio }) => (
            <motion.li
              key={role}
              variants={{
                hidden: { opacity: 0, y: 32 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="group flex flex-col overflow-hidden rounded-md border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:border-white/30 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.25)]"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-mec-graphite">
                <Image
                  src="/images/person-placeholder.png"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 18vw, (min-width: 640px) 45vw, 90vw"
                  className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-mec-ink to-transparent p-4 pt-10">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-mec-red">
                    {role}
                  </p>
                  <p className="mt-1 font-display text-xl text-mec-pure">{name}</p>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <p className="text-sm leading-relaxed text-mec-pure/70">{bio}</p>
                <Link
                  href="/about#leadership"
                  data-cursor="View"
                  className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-mec-red transition-colors hover:text-mec-pure"
                >
                  View Profile
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sections/LeadershipTeam.tsx
git commit -m "feat(about): LeadershipTeam dark card grid"
```

---

### Task 6: `BoardOfDirectors` section

**Files:**
- Create: `minott-web/components/sections/BoardOfDirectors.tsx`

- [ ] **Step 1: Write the component**

Create `minott-web/components/sections/BoardOfDirectors.tsx`:

```tsx
"use client";
import Image from "next/image";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { motion } from "framer-motion";

const BOARD = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  name: "Name Here",
  title: "Board Member",
}));

export function BoardOfDirectors() {
  return (
    <Section tone="light" id="board">
      <Container>
        <div className="flex items-center justify-center gap-6">
          <span aria-hidden className="h-px w-16 bg-mec-red/40" />
          <h2 className="text-center font-display text-[clamp(1.75rem,3vw,2.75rem)] tracking-wide text-mec-ink">
            Board of Directors
          </h2>
          <span aria-hidden className="h-px w-16 bg-mec-red/40" />
        </div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6"
        >
          {BOARD.map((member) => (
            <motion.li
              key={member.id}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-mec-mist">
                <Image
                  src="/images/person-placeholder.png"
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 45vw"
                  className="object-cover opacity-80"
                />
              </div>
              <p className="mt-4 font-display text-lg tracking-wide text-mec-ink">
                {member.name}
              </p>
              <p className="text-xs uppercase tracking-[0.14em] text-mec-ink/60">
                {member.title}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sections/BoardOfDirectors.tsx
git commit -m "feat(about): BoardOfDirectors portrait grid"
```

---

### Task 7: `LegacyBanner` section

**Files:**
- Create: `minott-web/components/sections/LegacyBanner.tsx`

- [ ] **Step 1: Write the component**

Create `minott-web/components/sections/LegacyBanner.tsx`:

```tsx
"use client";
import { Container } from "@/components/primitives/Container";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export function LegacyBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-mec-graphite via-mec-ink to-mec-ink py-24 text-mec-pure">
      <div aria-hidden className="absolute inset-0 bg-grid opacity-20" />
      <Container>
        <RevealOnScroll className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <h2 className="font-display-tight text-[clamp(2rem,4vw,3.5rem)] leading-[1.05]">
            <span className="text-mec-red">Building on our past.</span>
            <br />
            Investing in our future.
          </h2>
          <p className="text-lg leading-relaxed text-mec-pure/75 lg:border-l lg:border-mec-red/30 lg:pl-16">
            We honor the legacy of our founder and the strength of our leaders
            today by continuing to innovate, expand, and deliver exceptional
            value to our customers. The best is yet to come.
          </p>
        </RevealOnScroll>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sections/LegacyBanner.tsx
git commit -m "feat(about): LegacyBanner closing CTA"
```

---

### Task 8: Assemble `app/about/page.tsx` + full verification

**Files:**
- Modify (full rewrite): `minott-web/app/about/page.tsx`

- [ ] **Step 1: Rewrite the page**

Replace the entire contents of `minott-web/app/about/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { AboutHero } from "@/components/sections/AboutHero";
import { OurStory } from "@/components/sections/OurStory";
import { CompanyValues } from "@/components/sections/CompanyValues";
import { LeadershipTeam } from "@/components/sections/LeadershipTeam";
import { BoardOfDirectors } from "@/components/sections/BoardOfDirectors";
import { LegacyBanner } from "@/components/sections/LegacyBanner";

export const metadata: Metadata = {
  title: "About Us — Minott Equipment & Chemicals Limited",
  description:
    "Our legacy, our family, our commitment. For over 40 years Minott Equipment & Chemicals has supplied Jamaica with quality chemicals, equipment, and janitorial solutions — a family business built on hard work and strong values.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <OurStory />
      <CompanyValues />
      <LeadershipTeam />
      <BoardOfDirectors />
      <LegacyBanner />
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (warnings tolerated only if pre-existing elsewhere).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds; `/about` listed in route output.

- [ ] **Step 5: Manual click-through**

Run: `npm run dev`, open `http://localhost:3000/about`. Confirm:
- Hero headline reveals; stat row counts up (40+, 1000+, 5000+, "Nationwide").
- "Our Story": the central red spine **draws as you scroll**; the 40 / 15 numerals count up; both milestone blocks reveal; center node visible on desktop; "Today & Beyond" paragraph centered.
- Five values render with circular red icons.
- Leadership: 5 dark cards, hover lift + red glow, "View Profile →" present.
- Board: 6 portrait cards.
- Legacy banner renders with red/white two-tone heading.
- Enable OS "reduce motion" → reload: page renders fully (spine fully drawn, all content visible), no animation.

- [ ] **Step 6: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat(about): assemble redesigned About Us page from new sections"
```

---

## Notes for the implementer

- `FounderStory`, `DualPlay`, `NumbersBar`, `TrustBar` are intentionally **no longer imported** by About but remain in the codebase for other pages — do **not** delete them.
- All new components are `"use client"` because they animate; that is consistent with existing `components/sections/`.
- The `[Successor Name]` token in `OurStory` is an intentional, client-fillable placeholder per the spec — leave it literally as-is.
- No design-token changes are required; if you ever change one, mirror it in both `globals.css` `@theme` and `lib/tokens.ts`.
