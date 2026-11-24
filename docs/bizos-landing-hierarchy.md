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
| `.landing-section-lead` | Supporting copy, FAQ answers, pricing intro |
| `.how-step-lead` | How-it-works step body copy |
| `.hero-gradient-brand` | Gradient hero `h1` (“BizOS”) behind hex |
| `.hero-overlap-stage` | Centered hero stage container |
| `.hero-overlap-brand-core` | H1 + hex overlap context (`top: %` = cap height only) |
| `.hero-overlap-hex-spacer` | In-flow reserve for hex silhouette below wordmark |
| `.hero-overlap-brand` | Gradient word layer (`z-index: 0`, full **BizOS** under hex) |
| `.hero-overlap-hex` | Black hex overlap layer (`z-index: 10`) |
| `.hero-overlap-copy-stack` | Lead + CTA below the hex footprint (separate layer from brand stack) |
| `.landing-caption` | Hero crosshair slide labels |
| `.landing-fine-print` | Survey source lines, pricing overage note |

## Hero (`LandingHero`)

Single centered column (`max-w-3xl`): brand stack (single `h1` **BizOS** at `z-index: 0`; hex at `z-index: 10`; `overflow: visible` on stack/stage/core + end padding on stack/`h1` so **S** curve is not flattened; hex spacer reserves descent), then copy stack (lead + **Start a BIZ**, `.hero-overlap-copy-stack`, no z-index). E2E: `pnpm test:hero-e2e` asserts copy gap, hex in front on overlap, and **S** not clipped. No hero eyebrow.

## Layout wrapper

`LandingSection` (`src/components/landing-section.tsx`): horizontal `px-4 sm:px-5 md:px-10`; vertical padding from CSS tokens `--landing-section-pad-y` (5rem) and `--landing-section-pad-y-md` (6.5rem) via `.landing-section-shell`. First main block (`How it works`) may set `afterHero` for an extra `--landing-section-after-hero-extra` top inset below the hero viewport. Unified `bg-card` (same as hero / `--card` `#f5f5f7`, lightest grey — not `--background` `#e8e9ec`); no section `border-y` dividers. Variants `default` | `card` | `plain` remain for API compat and resolve to the same surface. Inner `max-w-6xl`. Plan cards and controls keep their own borders; FAQ uses spacing only (no `divide-y`). Landing footer: `SiteFooter` with `border-t-0 bg-card`.

## How it works rhythm (`LandingFoundingTeam`)

- **Mobile:** each step reads as index + title + lead, then that step’s visual (01 + solo hex, 02 + founding cluster). Step 1 DOM order is copy before hex.
- **Desktop (`md+`):** two-column stagger; step 1 hex left / copy right (`md:col-start-*`); step 2 copy left / cluster right (unchanged).
- **Hub hex token:** `--landing-hub-hex-size` (4.125rem → 5.875rem at `sm` / `md` / `lg`) sizes the step 01 solo mark, founding cluster hub, and connectors planet footprint. Tablet QA: 744×1133, 820×1180.
- **Regression:** `pnpm test:how-it-works-e2e` asserts vertical order at 390px; `pnpm test:landing-hub-hex-e2e` asserts solo + connectors hub width and visibility at 744px and 820px.

## Copy strings (landing `/`)

| Surface | String |
|---------|--------|
| Nav CTA | Start a BIZ → `/triage` |
| Hero H1 | Gradient **BizOS** in overlap stage (single `h1`, hex on top) |
| Hero lead | Start a custom biz with AI working on your behalf from day one. |
| Hero CTA | Start a BIZ |
| Proof H2 | AI is default. New businesses are forming faster than ever. |
| Proof chart | `LandingProofTrendChart`: narrow centered figure (`max-w-md` / `max-w-lg`), dual-line SVG (McKinsey AI % + Census BFS), sparse x ticks 2017/2020/2023/2026, faint 0 baseline only (no Y tick labels), sr-only legend + data table, endpoint labels at 2026 line ends (`89%` / `AI adoption (2026)` above AI dot; `5.7M` / `New applications, US (2026)` below BFS dot), AI stroke gradient ends green (`#16a34a`), `prefers-reduced-motion` respected |
| Proof stat 1 | **89%** — Orgs using AI in at least one function |
| Proof stat 2 | **28%** — Reporting AI revenue gains |
| Proof stat 3 | **2.4×** — AI leaders' revenue growth vs. laggards |
| Proof sources | McKinsey State of AI (2026), Deloitte State of AI in the Enterprise (2026), BCG Applied AI Index (2026), US Census Bureau Business Formation Statistics |
| Connectors H2 | All your favorite tools, accessible to your biz |
| Steps section | **How it works** (`h2` Match, then start.); 01 Custom Business / 02 Start your business |
| FAQ eyebrow | FAQ |
| FAQ title | Questions people ask first |
| FAQ chatbot Q | Why bots instead of a chatbot? |
| Pricing title | Plans to construct your desk |
| Pricing intro | Questionnaire free. You pay when BizOS spins up your bots and desk. |
| Pricing bullets | 3 digital workers on your desk; included work credits / month |
| Footer tagline | BizOS. Business operating system for work you approve. |

## Funnel naming

Landing uses bots / founding team / digital workers only. No Bizzie, Quinn, or specialist proper names on `/`.