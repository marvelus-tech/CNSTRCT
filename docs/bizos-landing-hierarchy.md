# BizOS landing typographic hierarchy (implementation)

## CSS utilities (`src/app/globals.css`)

| Class | Use |
|-------|-----|
| `.landing-eyebrow` | Section kickers, plan labels, FAQ eyebrow |
| `.landing-section-title` | Section `h2`, proof H2, pricing title, step titles as `h3` |
| `.landing-section-lead` | Supporting copy, FAQ answers, proof kicker, pricing intro |
| `.landing-caption` | Hero crosshair slide labels |
| `.landing-fine-print` | Survey source lines, pricing overage note |

## Layout wrapper

`LandingSection` (`src/components/landing-section.tsx`): `px-4 sm:px-5 md:px-10`, `py-14 md:py-16`, variants `default` | `card` | `plain`, inner `max-w-6xl`.

## Copy strings (landing `/`)

| Surface | String |
|---------|--------|
| Hero eyebrow | **Business** operating system (accent on "Business") |
| Nav CTA | Find my business → `/triage` |
| Hero H1 / sub / CTA | Unchanged (Barry-approved live set) |
| Proof H2 | The market already moved. Most owners are still behind. |
| Proof kicker | Bot-led businesses are pulling ahead on enterprise AI value. BizOS gives you the same shape: work gets done, nothing sensitive ships without your yes. |
| Steps section | **How it works** (`h2`); step headlines unchanged (`h3`) |
| FAQ eyebrow | FAQ |
| FAQ title | Questions people ask first |
| FAQ chatbot Q | Why bots instead of a chatbot? |
| Pricing title | Plans to construct your desk |
| Pricing intro | Questionnaire and path recommendations stay free; paid plan to construct digital business with founding bots and specialists |
| Pricing bullets | 3 digital workers on your desk; included work credits / month |
| Footer tagline | BizOS. Business operating system for work you approve. |

## Funnel naming

Landing uses bots / founding team / digital workers only. No Bizzie, Quinn, or specialist proper names on `/`.