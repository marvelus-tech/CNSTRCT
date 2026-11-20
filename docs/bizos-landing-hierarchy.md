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
| Hero H1 | Your founding team ships on day one. |
| Hero sub | BizOS finds a business that fits you, then starts your bots. They do the work. You approve it. |
| Hero CTA | Find my business |
| Proof H2 | Most people are still guessing. You do not have to. |
| Proof card 4 label | Bots on your desk. They work. You approve. |
| Proof kicker | Bot-led businesses are pulling ahead. BizOS gives you the same shape: work gets done, nothing sensitive ships without your yes. |
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