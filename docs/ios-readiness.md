# iOS readiness gate (P25)

Checklist before SwiftUI shell work. **Go/no-go: conditional go** once Supabase auth and Neon are stable on production.

## Required for App Store class clients

| Item | Status | Notes |
| --- | --- | --- |
| Account deletion path | Partial | Contact flow on `/privacy`; wire formal deletion queue later. |
| Privacy policy | Done | `/privacy` on production. |
| Custom domain on Vercel | Optional | `cnstrct-mu.vercel.app` is canonical today. |
| API surface documented | Done | `docs/API.md`. |
| No embedded Orgo/Composio secrets | Done | Server-only keys. |

## Auth for native

| Item | Status | Notes |
| --- | --- | --- |
| Magic link in Safari | Done | Opens web session cookie. |
| Bearer token refresh API | Not started | Optional spike; cookie may suffice for WKWebView shell first. |

## Push notifications

Decision: **defer**. Use email (Resend) and in-app until APNs provider is chosen.

## Go / no-go

**Go** for a WKWebView-first shell targeting command center + workspace with existing cookie auth. **No-go** for pure native agent loop until bearer auth is specified.