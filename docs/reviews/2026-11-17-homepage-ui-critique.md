# Homepage UI critique (17 Nov 2026)

Scope: the current homepage (`minott-web/app/page.tsx`) against the client's final review and their layout mockup (`assets/client-review-2026-10/current-homepage-annotated.png`). The fixes are specified in Task 3 of `docs/superpowers/plans/2026-11-17-final-client-review.md`.

Basis: the section source code, the owner's screenshot of the live stats section, the client mockup and the new hero backdrop. The dev server was not run for this review, so points about sections other than the stats band come from the code, not from a screenshot.

## 1. Stats section (`NumbersBar`)

This is the weakest section on the page. The problems, in order of how much damage they do:

1. **The "3D" effect reads as a rendering fault.** The grey digit is a separate glyph set at a larger font size (up to 9rem against 6.5rem), then scaled 1.3× from its centre and nudged 12px up and left. Nothing ties its position to the red digit, so the two never share a baseline, a left edge or a centre. In the screenshot the red "35+" sits low and right inside a grey "35" roughly twice its height. A depth effect only works when the back layer is the same shape at a small, constant offset.
2. **The grey layer omits the suffix.** The ghost is "35" and the face is "35+", so the plus sign hangs off the edge of the ghost and collides with it.
3. **Contrast is inverted.** The ghost is white at 35% on ink, a mid grey that is larger and nearly as bright as the red on top of it. Red (#E10600) on ink is only about 4.4:1, so the background layer wins the eye and the real number is harder to read than its shadow.
4. **The ghost overlaps the label.** It extends below the red number's box, so the grey "35" touches the first line of the label.
5. **Dividers are off-centre and the wrong colour.** Each column has `border-r` with `pr-8` and no left padding, on a grid with `gap-12`. The line sits 32px from the content on its left and 48px from the content on its right. At 30% red on black it is also barely visible.
6. **Too much empty space.** The section uses the global section padding, 172px top and bottom at 1440. The band is about 750px tall for about 300px of content.
7. **Labels are too long and too loud.** 14px semibold caps at 0.16em tracking in an 18-character measure wrap to three or four lines. Four ragged blocks of wide-tracked caps compete with the numbers.
8. **Uneven optical weight.** "35+" and "15+" are wide, "5" and "8" are single digits, and all are left-aligned in equal columns, so the right half of the band looks empty.
9. **Reduced motion.** `AnimatedNumber` tweens with framer's imperative `animate()`, which the global `reducedMotion="user"` setting does not cover. The count-up runs for users who asked for no motion.

## 2. Hero (`CinematicHero`)

- At `100svh` the hero takes the whole first screen. The promotions the client wants above the fold are a full scroll away.
- It stacks eight effects on one photo: two gradients, a veil, a light sweep, 18 particles, an outlined watermark, a trust strip and a glass chip. On the new backdrop, which is full of labelled drums and jugs, that will be noisy.
- The content is bottom-aligned with a 108px headline. The mockup has a headline of about 66px on two lines, vertically centred in a hero about 420px tall.
- The bottom vignette fades to 85% ink. Under a short hero that ends on a white strip, it will look like a dirty edge.
- The left gradient is 70% ink at its darkest. The new backdrop has white wall and bright labels on the left, so the text needs about 95%.

## 3. Partner strip (`TrustBar`)

- A marquee needs enough items to justify scrolling. With Purell removed there are three, duplicated to six, in 208×80 bordered chips. It will read as filler.
- With its heading it is about 170px tall. The mockup's strip is about 88px, one static row with a label on the left.

## 4. Featured deals (`FeaturedDeals`, `DealCardView`)

- Dark section, with 172px padding again. The cards are 3% white on ink with a 10% white border, so they barely separate from the background.
- Together with the hero, stats, legacy banner and footer, five of the page's seven bands are black. The client asked for the opposite.
- `DealCardView` is shared with `/deals`, so its colours cannot simply be flipped.

## 5. Legacy banner and closing CTA (`LegacyBanner`, `QuoteCTA`)

- The legacy banner is another dark band sitting directly under the dark stats band, with only a faint grid to separate them. It is correctly removed from home.
- In the CTA, the primary button is red on a red section. "Browse Products" is visible only as white text with a shadow.
- "Talk to a Consultant" hovers to red text and a red border on red, so it vanishes. This is the bug the client reported.
- The headline scales up to 112px and the section has 172px padding. It is taller than it needs to be for one sentence and two buttons.
- Supporting text is white at 80–90% on red, which falls under 4.5:1 for small text.

## 6. Page rhythm

Current order: dark hero, grey strip, dark deals, dark stats, dark legacy banner, red CTA, and no footer on home. That is one light band out of six, with three dark bands back to back and no change of pace between them.

Target order: white nav, photo hero, white partner strip, grey spotlight, white deals, one dark stats band, red CTA, grey showroom, dark footer. Dark is used once in the body, as punctuation before the CTA.

Two smaller system issues feed the "no white space" impression even on light sections: every section uses the same 96–192px padding token regardless of how much content it holds, and section headings use a 72px size that leaves little room for anything else above the fold.
