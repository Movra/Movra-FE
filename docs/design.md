## Overview

The brand reads as a calm, friendly, growth-oriented product experience built around a fresh green system and a small sprout-like character. The base canvas is **soft leaf cream** (`{colors.canvas}` — #f4f8f1), carrying warm deep green ink (`{colors.ink}` — #1f2a21) for display and body text. The main brand voltage is **Sprout Green** (`{colors.primary}` — #2f9e5b), used for primary CTAs, the wordmark accent, focus states, and key brand moments.

Type uses **Pretendard** as the primary sans family for strong Korean and Latin support. Fallback: `Inter, system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif`. Display typography stays calm and rounded, with moderate negative letter-spacing for editorial polish rather than hard technical sharpness. Code surfaces, when present, use **JetBrains Mono**.

The brand's strongest visual signature is the **Sprout Character System**: a small friendly 새싹 character with two leaves, a rounded seed body, subtle blush, and simple ink-line expressions. The character acts as a guide, helper, empty-state companion, success mascot, and footer sign-off. It should feel organic and lightweight, never childish or visually noisy.

**Key Characteristics:**
- Green-first brand system anchored by `{colors.primary}` (Sprout Green #2f9e5b).
- Soft leaf cream canvas instead of pure white.
- Warm deep-green ink, not pure black.
- A recurring 새싹 character appears in hero, onboarding, empty states, success states, and footer.
- Rounded, organic shapes with gentle hairline depth.
- Primary CTA color is green; avoid competing accent colors.
- Display weight remains calm, usually 400–500.
- No heavy drop shadows; use hairlines, soft fills, and character illustration for warmth.
- 80px section rhythm for spacious editorial pacing.

## Colors

### Brand & Accent
- **Sprout Green** (`{colors.primary}` — #2f9e5b): Primary CTA buttons, wordmark accent, key links, selected states, and brand highlights.
- **Sprout Green Active** (`{colors.primary-active}` — #247a47): Pressed state for primary CTAs and active controls.
- **Sprout Green Hover** (`{colors.primary-hover}` — #288d51): Hover state for primary actions.
- **Sprout Green Soft** (`{colors.primary-soft}` — #dff3e6): Soft background for highlights, banners, selected chips, and character callouts.
- **Sprout Green Pale** (`{colors.primary-pale}` — #eef9f1): Very light green wash for calm section bands.

### Character Palette
- **Sprout Leaf** (`{colors.character-leaf}` — #54c879): Main leaf fill for the 새싹 character.
- **Sprout Leaf Dark** (`{colors.character-leaf-dark}` — #2f9e5b): Leaf shadow, stem, and small decorative leaf marks.
- **Seed Body** (`{colors.character-body}` — #fff4d8): Rounded seed/body fill.
- **Seed Body Shade** (`{colors.character-body-shade}` — #f6dfad): Soft body shading.
- **Character Ink** (`{colors.character-ink}` — #275033): Face, outline, and tiny expression marks.
- **Character Blush** (`{colors.character-blush}` — #f4a6a6): Cheeks and friendly emotional accents.

### Surface
- **Canvas** (`{colors.canvas}` — #f4f8f1): Soft leaf-cream page floor.
- **Canvas Soft** (`{colors.canvas-soft}` — #f8fbf5): Pale green-white pane background inside mockups.
- **Surface Card** (`{colors.surface-card}` — #ffffff): Pure white card surface, used sparingly for readable content blocks.
- **Surface Tinted** (`{colors.surface-tinted}` — #eef9f1): Gentle green-tinted card or section surface.
- **Surface Strong** (`{colors.surface-strong}` — #dbe9d8): Badges, tag pills, subtle status chips.

### Hairlines
- **Hairline** (`{colors.hairline}` — #dce7d8): 1px divider and standard card border.
- **Hairline Soft** (`{colors.hairline-soft}` — #e9f0e5): Lighter divider on pale surfaces.
- **Hairline Strong** (`{colors.hairline-strong}` — #b9cdb3): Stronger panel outline or active card border.

### Text
- **Ink** (`{colors.ink}` — #1f2a21): Display, body emphasis, primary text.
- **Body** (`{colors.body}` — #4d5a4e): Default running text.
- **Body Strong** (`{colors.body-strong}` — #1f2a21): Same as ink.
- **Muted** (`{colors.muted}` — #738071): Subtitles and supporting descriptions.
- **Muted Soft** (`{colors.muted-soft}` — #9aa696): Disabled text and quiet captions.
- **On Primary** (`{colors.on-primary}` — #ffffff): White text on Sprout Green.
- **On Soft Green** (`{colors.on-soft-green}` — #1f4a30): Text on pale green fills.

### Growth Stages
Use these only for in-product progress, learning, or growth-state visualizations. Do not use them as broad system action colors.
- **Seed** (`{colors.stage-seed}` — #f3d99b): Starting, draft, waiting.
- **Sprout** (`{colors.stage-sprout}` — #9fd8a7): New progress, first result, early success.
- **Leaf** (`{colors.stage-leaf}` — #6fcf8f): Active growth, current step.
- **Bloom** (`{colors.stage-bloom}` — #c9dca8): Review, refinement, maturing.
- **Harvest** (`{colors.stage-harvest}` — #88a95b): Completed, shipped, ready.

### Semantic
- **Success** (`{colors.semantic-success}` — #258a57): Confirmation indicators.
- **Warning** (`{colors.semantic-warning}` — #b47a1c): Caution and non-blocking warnings.
- **Error** (`{colors.semantic-error}` — #cf3d4f): Validation errors.
- **Info** (`{colors.semantic-info}` — #3f7f9f): Informational notices.

## Typography

### Font Family
**Pretendard** is the preferred primary typeface because it supports Korean and Latin UI text cleanly. Fallback: `Inter, system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif`. Code surfaces switch to **JetBrains Mono**.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---:|---:|---:|---:|---|
| `{typography.display-mega}` | 72px | 500 | 1.1 | -1.8px | Homepage hero h1 |
| `{typography.display-lg}` | 40px | 500 | 1.2 | -0.8px | Section heads |
| `{typography.display-md}` | 28px | 500 | 1.25 | -0.35px | Sub-section heads |
| `{typography.display-sm}` | 22px | 500 | 1.3 | -0.1px | Card group titles |
| `{typography.title-md}` | 18px | 600 | 1.4 | 0 | Component titles |
| `{typography.title-sm}` | 16px | 600 | 1.4 | 0 | List labels |
| `{typography.body-md}` | 16px | 400 | 1.6 | 0 | Default body |
| `{typography.body-tracked}` | 16px | 400 | 1.6 | 0.04px | Editorial body |
| `{typography.body-sm}` | 14px | 400 | 1.5 | 0 | Footer body |
| `{typography.caption}` | 13px | 400 | 1.4 | 0 | Captions |
| `{typography.caption-uppercase}` | 11px | 600 | 1.4 | 0.72px | Section labels, small badges |
| `{typography.code}` | 13px | 400 | 1.5 | 0 | Code blocks — JetBrains Mono |
| `{typography.button}` | 14px | 600 | 1.0 | 0 | CTA pill labels |
| `{typography.nav-link}` | 14px | 500 | 1.4 | 0 | Top-nav menu |

### Principles
- **Display type feels soft and confident.** Use 400–500 weights; avoid heavy 700+ display unless the product context demands it.
- **Negative letter-spacing on display only.** Keep body text highly readable.
- **Korean UI text must remain balanced.** Avoid excessive tracking on Korean labels.
- **JetBrains Mono on every code surface.**

### Note on Font Substitutes
If Pretendard is unavailable, use **Inter** for Latin-heavy interfaces or **SUIT** for a softer Korean-first interface.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.base}` 16px · `{spacing.md}` 20px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 80px.
- **Section padding:** 80px desktop, 56px tablet, 40px mobile.

### Grid & Container
- Max content width: ~1200px.
- Editorial body: 12-column grid.
- Feature card grids: 2-up at desktop for splits, 3-up for benefits.
- Character-led hero sections may use an asymmetrical 7:5 split: copy on the left, 새싹 character scene on the right.
- Footer: 5-column at desktop with a small character sign-off area.

### Whitespace Philosophy
Generous, calm, and friendly. Leave enough breathing room around the 새싹 character so it feels like a companion rather than decoration. Cards may sit close together, but mascot scenes need open space.

## Elevation & Depth

The system uses **hairline depth plus soft organic layering**. Avoid heavy shadows. Depth comes from white cards on green-tinted canvas, 1px borders, overlapping leaf shapes, and subtle character illustration.

| Level | Treatment | Use |
|---|---|---|
| Flat canvas | `{colors.canvas}` (#f4f8f1) | Body bands, footer |
| Tinted section | `{colors.primary-pale}` (#eef9f1) | Soft brand bands, onboarding sections |
| Card | `{colors.surface-card}` (#ffffff) | Content cards |
| Hairline border | 1px `{colors.hairline}` | Card outlines, dividers |
| Character layer | Flat vector illustration with 1px–2px ink outline | Hero, empty states, onboarding |
| Pane | `{colors.canvas-soft}` (#f8fbf5) | Mockup panes and editor-like surfaces |

### Decorative Depth
- **Sprout character scenes** are the main emotional depth device.
- **Leaf-shaped soft blobs** may sit behind the character or hero CTA, using `{colors.primary-soft}` and `{colors.primary-pale}`.
- **No heavy drop shadows.** If separation is required, use a 1px hairline and a very subtle background contrast.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---:|---|
| `{rounded.none}` | 0px | Reserved |
| `{rounded.xs}` | 4px | Inline tags |
| `{rounded.sm}` | 6px | Compact rows |
| `{rounded.md}` | 10px | CTA buttons, form inputs |
| `{rounded.lg}` | 16px | Cards, mockup panes |
| `{rounded.xl}` | 24px | Larger feature cards, character callouts |
| `{rounded.organic}` | 32px 20px 28px 22px | Leaf-like soft containers |
| `{rounded.pill}` | 9999px | Badges, chips, stage pills |
| `{rounded.full}` | 9999px | Avatars, circular character frames |

### Organic Shape Rules
- Use slightly larger radii than strict developer UI systems.
- Leaf blobs should be asymmetrical but simple.
- Avoid overly childish cloud shapes; the tone should stay polished.

## Character System

### `sprout-character`
A friendly 새싹 mascot with a rounded seed body, two leaves, small dot eyes, subtle smile, and blush. It should be simple enough to scale down to 48px while still recognizable.

**Core anatomy:**
- Two leaves growing from the head, filled with `{colors.character-leaf}`.
- Rounded seed body filled with `{colors.character-body}`.
- Thin outline in `{colors.character-ink}`.
- Minimal facial expression: dot eyes, small smile, optional cheek blush.
- Small stem detail using `{colors.character-leaf-dark}`.

**Personality:**
- Helpful, calm, optimistic.
- Curious rather than loud.
- Encourages growth, progress, and care.

**Usage sizes:**
- **Hero:** 220–360px tall, may include leaf blobs or tiny soil/ground shape.
- **Empty state:** 96–160px tall with one short message.
- **Success state:** 72–120px tall, smiling or holding a small leaf/check mark.
- **Inline helper:** 32–48px icon-like variant without complex details.
- **Footer:** 56–80px small sign-off variant.

### Character Variants

**`sprout-character-default`** — Neutral standing pose. Used in hero, onboarding, and intro surfaces.

**`sprout-character-helper`** — One leaf slightly tilted, small hand/leaf gesture. Used in tips, guidance, and tooltips.

**`sprout-character-success`** — Smiling with a small green check leaf. Used after completion, submission, or successful setup.

**`sprout-character-empty`** — Sitting or peeking from a small soil shape. Used for empty states.

**`sprout-character-loading`** — Subtle bobbing pose. Used for loading states only when wait time is noticeable.

### Character Motion
- Idle motion may gently bob 2–4px vertically.
- Leaf wiggle should be slow and subtle, 300–500ms ease-out.
- Avoid constant looping motion near long-form content.
- Motion must respect reduced-motion preferences.

## Components

### Top Navigation

**`top-nav`** — Background `{colors.canvas}`, text `{colors.ink}`, height 64px. Layout: wordmark left with a small sprout mark, primary horizontal menu center, Sign In + primary CTA right.

**`wordmark-sprout`** — Text wordmark in `{colors.ink}` with a small two-leaf icon using `{colors.primary}`. The icon may replace a dot, sit before the wordmark, or appear as a compact app mark.

### Buttons

**`button-primary`** — Signature green CTA. Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}` (14px / 600), padding 10px × 18px, height 40px, rounded `{rounded.md}` (10px).

**`button-primary-hover`** — Hover state. Background `{colors.primary-hover}`.

**`button-primary-active`** — Press state. Background `{colors.primary-active}`.

**`button-secondary`** — White card pill on green-cream canvas. Background `{colors.surface-card}`, text `{colors.ink}`, 1px `{colors.hairline-strong}` border.

**`button-soft-green`** — Gentle secondary action. Background `{colors.primary-soft}`, text `{colors.on-soft-green}`, no shadow, optional 1px `{colors.hairline}` border.

**`button-tertiary-text`** — Inline deep-green text link. Text `{colors.primary-active}`; underline only on hover or focus.

**`button-download`** — Strong ink CTA. Background `{colors.ink}`, text `{colors.canvas}`, padding 12px × 20px, height 44px. Use sparingly when a dark contrast CTA is needed beside the green primary CTA.

### Hero & Product Mockups

**`hero-band`** — Background `{colors.canvas}`, full-width or split layout. Headline uses `{typography.display-mega}`. Subhead uses `{typography.body-md}`. Main CTA uses `button-primary`; secondary CTA uses `button-soft-green` or `button-tertiary-text`. A large `sprout-character-default` or `sprout-character-helper` appears beside or below the hero copy.

**`hero-character-scene`** — A focused illustration scene using the 새싹 character, soft green leaf blob, and one tiny product hint such as a card, checklist, or message bubble. Keep the scene lightweight and uncrowded.

**`product-mockup-card`** — A white card containing product UI preview panes. Background `{colors.surface-card}`, rounded `{rounded.lg}` (16px), 1px `{colors.hairline}` border, no heavy shadow.

**`product-pane`** — Individual pane inside a mockup. Background `{colors.canvas-soft}`, text `{colors.body}`, rounded `{rounded.md}` (10px), padding 16px.

### Cards

**`feature-card`** — Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.title-md}`, rounded `{rounded.lg}`, padding 24px, 1px `{colors.hairline}` border. Optional small leaf icon in `{colors.primary}`.

**`feature-card-sprout`** — Feature card with a small `sprout-character-helper` peeking from a corner. Use for high-empathy features only; do not place the character in every card.

**`comparison-card`** — Side-by-side comparison card. Same surface and rounding; internally split into 2 columns. Use green check leaves instead of generic check icons.

**`testimonial-card`** — Quote card. Background `{colors.surface-card}`, text `{colors.body}`, rounded `{rounded.lg}`, padding 24px. Optional tiny sprout mark, not full mascot.

**`empty-state-card`** — Background `{colors.surface-tinted}`, centered `sprout-character-empty`, title, description, and optional CTA. Use for first-run, no data, or completed cleanup states.

### Growth Stage Pills

**`stage-pill-seed`** — Background `{colors.stage-seed}`, text `{colors.ink}`, type `{typography.caption-uppercase}`, rounded `{rounded.pill}`, padding 4px × 10px. Marks start or draft state.

**`stage-pill-sprout`** — Background `{colors.stage-sprout}`, text `{colors.ink}`, same shape. Marks early progress.

**`stage-pill-leaf`** — Background `{colors.stage-leaf}`, text `{colors.ink}`, same shape. Marks active step.

**`stage-pill-bloom`** — Background `{colors.stage-bloom}`, text `{colors.ink}`, same shape. Marks review or refinement.

**`stage-pill-harvest`** — Background `{colors.stage-harvest}`, text `{colors.on-primary}`, same shape. Marks completed or ready state.

### Code

**`code-block`** — Inline code block. Background `{colors.surface-card}`, text `{colors.ink}` in `{typography.code}`, rounded `{rounded.lg}`, padding 20px, 1px `{colors.hairline}` border.

**`code-inline`** — Background `{colors.primary-pale}`, text `{colors.primary-active}`, rounded `{rounded.xs}`, padding 2px × 5px, type `{typography.code}`.

### Pricing

**`pricing-tier-card`** — Background `{colors.surface-card}`, rounded `{rounded.lg}`, padding 32px, 1px `{colors.hairline}` border.

**`pricing-tier-featured`** — Featured tier uses a green-tinted emphasis instead of dark inversion. Background `{colors.primary-soft}`, text `{colors.ink}`, border 1px `{colors.primary}`. Optional small `sprout-character-success` near the plan badge.

**`pricing-feature-check`** — Use a small leaf-check icon in `{colors.primary}` instead of a standard check mark.

### Forms & Tags

**`text-input`** — Background `{colors.surface-card}`, text `{colors.ink}`, rounded `{rounded.md}` (10px), padding 12px × 16px, height 44px, border 1px `{colors.hairline}`.

**`text-input-focus`** — Border `{colors.primary}`, soft outline 3px `{colors.primary-soft}`.

**`badge-pill`** — Small uppercase pill. Background `{colors.surface-strong}`, text `{colors.ink}`, type `{typography.caption-uppercase}`, rounded `{rounded.pill}`, padding 4px × 10px.

**`badge-green`** — Brand badge. Background `{colors.primary-soft}`, text `{colors.on-soft-green}`, same shape.

**`helper-bubble`** — Small guidance bubble paired with `sprout-character-helper`. Background `{colors.surface-card}`, border 1px `{colors.hairline}`, rounded `{rounded.xl}`, padding 12px × 16px.

### CTA / Footer

**`cta-band`** — Pre-footer conversion band. Background `{colors.primary-pale}`, centered display headline in `{typography.display-lg}`, supporting body copy, single green CTA, and optional `sprout-character-success`. 96px vertical padding.

**`footer`** — Closing footer. Background `{colors.canvas}`, text `{colors.body}`. 5-column link list. Include a small `sprout-character-default` or sprout mark as a friendly sign-off. 64×48px padding.

**`footer-link`** — Background transparent, text `{colors.body}`, type `{typography.body-sm}`. Hover/focus may use `{colors.primary-active}`.

## Illustration & Iconography

### Illustration Style
- Flat vector shapes with simple 1px–2px outlines.
- Rounded corners and soft curves.
- Minimal internal detail.
- Use green as the dominant hue, with warm seed-body neutrals and small blush accents.
- Keep background blobs pale and low contrast.

### Icon Style
- 1.75px stroke, rounded caps and joins.
- Icons may include tiny leaf endings where appropriate.
- Use `{colors.primary}` for active icons and `{colors.muted}` for inactive icons.
- Do not overuse leaf icons; reserve them for key affordances and brand moments.

## Do's and Don'ts

### Do
- Use `{colors.primary}` as the main CTA, brand accent, and focus color.
- Keep the overall palette green-first and calm.
- Include the 새싹 character in major emotional moments: hero, onboarding, empty states, success states, and footer.
- Use the character as a helper or companion, not just decoration.
- Keep character expressions simple and friendly.
- Use the soft leaf-cream `{colors.canvas}` page floor instead of pure white.
- Use hairlines and pale green surfaces for depth.
- Keep display type calm, rounded, and readable.

### Don't
- Do not keep Cursor Orange as the primary action color.
- Do not introduce a competing secondary brand color for CTAs.
- Do not place the 새싹 character on every component; it should remain special.
- Do not make the character overly childish, overly detailed, or mascot-heavy.
- Do not use heavy drop shadows or glossy 3D effects.
- Do not use pure black text unless required by a specific accessibility context.
- Do not use growth-stage colors outside progress or stage visualizations.
- Do not let decorative leaves reduce text readability.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---:|---|
| Mobile | < 640px | Hero h1 72→34px; hero character moves below copy; mockups collapse to single pane preview; feature grid 1-up; nav hamburger. |
| Tablet | 640–1024px | Hero h1 56px; character scene scales to 180–240px; feature grid 2-up. |
| Desktop | 1024–1280px | Full hero h1 72px; character scene 260–360px; full mockup; feature grid 3-up. |
| Wide | > 1280px | Content caps at 1200px; character scene may expand slightly but should not dominate the page. |

### Touch Targets
- Primary CTA at 40px height minimum.
- Download or major CTA at 44px minimum.
- Icon-only buttons at 40×40px minimum.

### Collapsing Strategy
- Top nav switches to hamburger below 768px.
- Hero character moves from side-by-side layout to centered below hero copy on mobile.
- Product mockup multi-pane collapses to a single primary pane preview on mobile.
- Feature grid: 3-up → 2-up → 1-up.
- Character helper bubbles stack above or below related copy instead of floating beside it.

## Accessibility

- Maintain WCAG AA contrast for text and interactive controls.
- Do not rely on green alone to communicate success or active state; pair color with labels, icons, or position.
- Character illustrations must never replace essential text instructions.
- Provide alt text for mascot illustrations, for example: “smiling sprout character waving” or “small sprout character beside an empty state message.”
- Respect `prefers-reduced-motion` for character bobbing, leaf wiggle, and loading animation.

## Iteration Guide

1. Start with the green-first token system before changing components.
2. Replace all orange primary CTA references with `{colors.primary}`.
3. Add the 새싹 character to hero, empty state, success state, and footer first.
4. Use `{token.refs}` everywhere — never inline hex inside component specs.
5. Keep cards at `{rounded.lg}` and CTAs at `{rounded.md}`.
6. Use `feature-card-sprout` sparingly; not every feature needs the mascot.
7. Growth-stage pills remain scoped to progress or learning visualizations.
8. Motion should be subtle and optional.
9. Keep the page calm: green does the branding, the character does the warmth.

## Known Gaps

- Final character artwork needs a dedicated SVG/illustration pass.
- Character motion timing and Lottie/SVG animation specs are not fully defined.
- Exact wordmark lockup with the sprout mark is not finalized.
- Product-specific UI surfaces are only partially captured through generic mockup components.
- Dark mode is not defined in this version.
