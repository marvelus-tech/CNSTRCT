# BizOS landing typographic hierarchy (implementation)

## Type system

- **Font:** Inter Tight (`next/font/google`), CSS variable `--font-inter-tight`, wired as `--font-sans` in `@theme`.
- **Weights:** body `400` (`--type-body-weight`), display headlines `500` (`--type-display-weight`). Stat/price numerals may use `font-semibold` locally.
- **Muted copy:** `--type-muted` (`#6f7177`), aligned with theme `--muted`.
- **Headlines:** `letter-spacing: -0.02em`, display line-height ~`1.15`; leads `1.55`–`1.6`.
- **HUD / triage:** `.hud-readout` and `Button` HUD frames keep uppercase + wide tracking; app surfaces inherit body weight only.

## CSS utilities (`src/app/globals.css`)

| Class | Use |
|-------|-----|
| `.landing-eyebrow` | Section kickers, plan labels, FAQ eyebrow (sentence case, weight 500) |
| `.landing-section-title` | Section `h2`, proof H2, pricing title, connectors headline |
| `.how-step-title` | How-it-works step titles (`h3`) |
| `.landing-section-lead` | Supporting copy, FAQ answers, proof kicker, pricing intro |
| `.how-step-lead` | How-it-works step body copy |
| `.hero-gradient-brand` | Gradient hero `h1` (“BizOS”) behind hex |
| `.hero-overlap-stage` | Centered hero stage container |
| `.hero-overlap-brand-core` | H1 + hex overlap context (`top: %` = cap height only) |
| `.hero-overlap-hex-spacer` | In-flow reserve for hex silhouette below wordmark |
| `.hero-overlap-brand` | Gradient word layer (`z-index: 0`) |
| `.hero-overlap-hex` | Black hex overlap layer (`z-index: 10`) |
| `.hero-overlap-copy-stack` | Lead + CTA below the hex footprint (separate layer from brand stack) |
| `.landing-caption` | Hero crosshair slide labels |
| `.landing-fine-print` | Survey source lines, pricing overage note |

## Hero (`LandingHero`)

Single centered column (`max-w-3xl`): brand stack (`.hero-overlap-brand-core`: gradient `h1` + partial hex; `.hero-overlap-hex-spacer` = computed descent; `overflow: hidden` + `contain: paint` so hex never paints on copy), then copy stack (lead + **Start a BIZ**, `.hero-overlap-copy-stack`, no z-index). E2E: `pnpm test:hero-e2e` asserts `leadTop` / button `top` ≥ hex bottom + 8px. No hero eyebrow.

## Layout wrapper

`LandingSection` (`src/components/landing-section.tsx`): `px-4 sm:px-5 md:px-10`, `py-14 md:py-16`, unified `bg-background` (same as hero / `--background`); no section `border-y` dividers. Variants `default` | `card` | `plain` remain for API compat and resolve to the same surface. Inner `max-w-6xl`. Plan cards and controls keep their own borders; FAQ uses spacing only (no `divide-y`). Landing footer: `SiteFooter` with `border-t-0`.

## Copy strings (landing `/`)

| Surface | String |
|---------|--------|
| Nav CTA | Start a BIZ → `/triage` |
| Hero H1 | Gradient **BizOS** in overlap stage (single `h1`, hex on top) |
| Hero lead | BizOS matches a business that fits you, gives you a founding team, so you can start being productive on day one. |
| Hero CTA | Start a BIZ |
| Proof H2 | The world is no longer guessing. |
| Proof subhead | AI is now the default in business. New companies are forming at record pace. The winners are the ones that start with AI already working for them. |
| Proof chart | `LandingProofTrendChart`: dual-axis SVG (McKinsey AI % + Census BFS applications), endpoint callouts 89% and 5.7M, legend sentence case, `prefers-reduced-motion` respected |
| Proof stat 1 | **89%** — Organizations already use AI in at least one business function |
| Proof stat 2 | **28%** — Companies reporting revenue gains from AI (up from 20% earlier in the year) |
| Proof stat 3 | **2.4×** — Revenue growth of future-built AI leaders vs. laggards |
| Proof closing | Bot-led businesses are already pulling ahead. BizOS gives you the same shape on day one: work gets done, nothing sensitive ships without your approval. |
| Proof sources | McKinsey State of AI (2026), Deloitte State of AI in the Enterprise (2026), BCG Applied AI Index (2026), US Census Bureau Business Formation Statistics |
| Steps section | **How it works** (`h2`); 01 Tell us who you are / 02 Get a business that fits / 03 Turn the key |
| FAQ eyebrow | FAQ |
| FAQ title | Questions people ask first |
| FAQ chatbot Q | Why bots instead of a chatbot? |
| Pricing title | Plans to construct your desk |
| Pricing intro | Questionnaire free. You pay when BizOS spins up your bots and desk. |
| Pricing bullets | 3 digital workers on your desk; included work credits / month |
| Footer tagline | BizOS. Business operating system for work you approve. |

## Funnel naming

Landing uses bots / founding team / digital workers only. No Bizzie, Quinn, or specialist proper names on `/`.