# FinanceOS — Phase 2 & 3 Changes

## New Files

### Database
- `src/db/schema.ts` — Added `userArchetype` to users, `accountPurpose` to accounts, `userId` to anomaly_feedback, new `decisions` table

### Lib
- `src/lib/confidence.ts` — Confidence ladder (HIGH/MEDIUM/LOW/UNKNOWN) based on tx count + days of history
- `src/lib/spendable.ts` — Daily spendable number: income − bills − savings goal − spent ÷ days remaining
- `src/lib/analytics.ts` — YoY comparison helper
- `src/lib/archetypes/index.ts` — 4 archetype definitions + KPI lists

### Components
- `src/components/spendable-hero.tsx` — Big daily spendable card with expandable breakdown
- `src/components/confidence-badge.tsx` — HIGH/MEDIUM/LOW/UNKNOWN badge on AI outputs
- `src/components/yoy-badge.tsx` — Year-over-year delta badge (green/red %)
- `src/components/bulk-action-bar.tsx` — Bulk recategorize/delete bar for transactions
- `src/components/archetype-switcher.tsx` — Dropdown to switch dashboard mode
- `src/components/kpi/runway-days-card.tsx` — Cash runway in days
- `src/components/kpi/savings-rate-card.tsx` — Savings rate % with trend
- `src/components/kpi/fire-timeline-card.tsx` — FIRE progress (25x rule)
- `src/components/kpi/income-concentration-card.tsx` — Income source concentration risk

### Pages
- `src/app/(onboarding)/onboarding/page.tsx` — 4-card archetype selector shown after registration

### API Routes
- `src/app/api/transactions/bulk/route.ts` — PATCH bulk recategorize/delete (with ownership check + balance reversal)

## Modified Files

### API Routes
- `src/app/api/ai/chat/route.ts` — 12-month tx limit, confidence level injected, confidence returned in response
- `src/app/api/ai/anomalies/route.ts` — Reads feedback to tune thresholds per user (3+ false alarms raises threshold)
- `src/app/api/anomaly-feedback/route.ts` — Added userId column write
- `src/app/api/transactions/import/route.ts` — Raised limit from 500 → 5000 rows, batched in chunks of 200
- `src/app/api/user-preferences/route.ts` — Now handles archetype read/write in addition to privacyMode

### Dashboard
- `src/app/(dashboard)/dashboard/page.tsx` — Fetches archetype, spendable, YoY, income sources, savings rate trend
- `src/app/(dashboard)/dashboard/client.tsx` — Archetype-aware KPI rendering, SpendableHero, ArchetypeSwitcher, YoY badge
- `src/app/(dashboard)/ai/page.tsx` — ConfidenceBadge on chat messages, tuning note on anomaly summary
- `src/app/(dashboard)/transactions/page.tsx` — Bulk select checkboxes + BulkActionBar

### Settings
- `src/app/(settings)/settings/page.tsx` — Archetype selector + privacy mode in one page

### Auth
- `src/app/(auth)/register/page.tsx` — Redirects to /onboarding after signup

## Test Data
- `test-data-3years.csv` — 808 transactions across Jan 2022–Dec 2024. Includes:
  - Regular salary (2× monthly), freelance (irregular), consulting (rare)
  - All recurring subscriptions (Netflix, Spotify, AWS, Gym, Phone, Internet, Adobe)
  - Fixed rent + variable expenses across 10 categories
  - **Anomaly test cases:**
    - Duplicate Netflix charge in Oct 2024 (Oct 8 + Oct 18)
    - Amazon spending spike Oct 2024 ($480 vs avg $20–150)
    - Large one-off: Apple Store $2,199 in Sep 2024
    - Duplicate Doctor Visit same day Nov 2024
    - Income gap: March 2023 has no freelance income
    - High freelance month: Dec 2024 ($3,500 + $1,800 consulting)

## Schema Migration
Run after pulling: `npm run db:push`
