<div align="center">

# 💰 FinanceOS

### Open-source personal finance platform — self-hosted, AI-powered, zero cost

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-green?style=flat-square)](https://orm.drizzle.team)
[![NextAuth](https://img.shields.io/badge/NextAuth-v5-purple?style=flat-square)](https://authjs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<!-- Add your demo GIF here after recording -->
<!-- ![FinanceOS Demo](public/demo.gif) -->

**[Features](#-features) · [Use Cases](#-use-cases) · [Impact](#-impact) · [Getting Started](#-getting-started) · [AI Features](#-ai-features) · [Tech Stack](#-tech-stack)**

</div>

---

## 📌 What is FinanceOS?

FinanceOS is a full-stack personal finance platform you run on your own machine. No subscriptions, no cloud fees, no data leaving your computer. Track income and expenses, set budgets, import bank statements, and get AI-powered insights — all from a single dashboard.

Unlike Mint, YNAB, or other SaaS tools, FinanceOS is:
- **Free forever** — SQLite locally, no paid services
- **Private** — your financial data never leaves your machine
- **AI-powered** — Groq (Llama 3.3) analyses your spending patterns in real time
- **Import-ready** — works with CSV exports from any bank worldwide

---

## 🎯 Use Cases

| Who | How they use it |
|-----|----------------|
| **Students** | Track monthly spending vs budget, visualise where money goes each month |
| **Freelancers** | Separate income streams, monitor cash flow across multiple accounts |
| **Families** | Shared expense tracking with per-category budgets (groceries, utilities, etc.) |
| **Developers** | Portfolio project showcasing full-stack skills with real-world production patterns |
| **Finance enthusiasts** | Self-hosted alternative to Mint/YNAB with complete data ownership |
| **Small businesses** | Track business expenses and income across accounts with CSV bank import |

---

## 🚀 Impact

- **Zero running cost** — SQLite file-based DB, no cloud services, runs on any laptop
- **Privacy first** — financial data stored locally, never sent to third-party servers
- **Works with any bank** — CSV import auto-detects columns from HDFC, SBI, Chase, Barclays, and 100+ bank formats
- **AI that actually works** — Groq's Llama 3.3 analyses real transaction data (not dummy examples), gives specific dollar-amount insights
- **Instant setup** — from `git clone` to running dashboard in under 5 minutes
- **Production patterns** — built with the same tools used at real companies (Next.js App Router, Drizzle ORM, NextAuth v5, TanStack Query)

---

## ✨ Features

### 📊 Dashboard
- KPI cards — Total Balance, Monthly Income, Monthly Expenses, Net Savings
- Area chart — Income vs Expenses over last 6 months (auto-adjusts to your actual data dates)
- Pie chart — Spending breakdown by category for the active month
- Recent transactions — last 8 with category icons and correct +/− signs

### 💳 Accounts
- Multiple account types — checking, savings, credit, investment, cash
- Color-coded cards with balance display
- Balance auto-updates on every transaction add/edit/delete

### 📋 Transactions
- Add income, expenses, and transfers
- Edit any transaction — balance corrects automatically
- Delete with balance reversal
- Live search by description or category
- Date filters — This month, Last month, Last 3 months, This year, All time, Custom range
- Summary bar showing total income, expenses and net for the filtered period

### 📥 CSV Import
- Drag-and-drop or click-to-browse
- Auto-detects date, description, amount, and type columns
- Smart type detection — positive = income, negative = expense, or reads a Type column
- Handles Excel BOM, Windows line endings, MM/DD/YYYY and DD/MM/YYYY formats
- 4-step wizard: Upload → Map columns → Preview → Import
- Batch inserts up to 500 rows with automatic balance update

### 🎯 Budgets
- Create budgets per category or across all expenses
- Live progress bars — green → yellow → red as you approach limit
- Shows remaining amount or overage in real time

### 🏷️ Categories
- 12 default categories auto-seeded on register
- Custom categories with emoji icons and color pickers
- Income, expense, or both types

### 🤖 AI Assistant (Powered by Groq — Free)
- **Financial Health Score** — scores 0–100 with breakdown across 4 dimensions, all calculated in code (not hallucinated)
- **Finance Chat** — ask questions like "What was my income in December?" and get answers with exact figures from your real data
- **Anomaly Radar** — detects duplicate charges, spending spikes (2x above average), and large one-off purchases using code-based detection before AI summarises

---

## 🎬 Demo

> **Record your own GIF using [ScreenToGif](https://www.screentogif.com/) (free):**
> 1. Open the app → login → dashboard
> 2. Add an account → add a transaction → watch balance update
> 3. Import a CSV → see all transactions appear
> 4. Open AI Assistant → click Analyse → see Health Score
> 5. Save as `public/demo.gif` and uncomment the img tag at the top of this file

---

## 🛠️ Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 14 (App Router) | Server components, API routes, file-based routing |
| Language | TypeScript 5 | End-to-end type safety |
| Database | SQLite via better-sqlite3 | Zero setup, file-based, works on any OS |
| ORM | Drizzle ORM | Type-safe queries, lightweight, fast migrations |
| Auth | NextAuth v5 (JWT) | Self-hosted, no third-party auth service |
| Styling | Tailwind CSS | Utility-first dark theme |
| UI Components | Radix UI primitives | Accessible, unstyled, fully controlled |
| Charts | Recharts | Composable React charts |
| Forms | React Hook Form + Zod | Performant forms with runtime validation |
| Data fetching | TanStack Query v5 | Client-side cache and invalidation |
| AI | Groq SDK (Llama 3.3 70B) | Free tier, fast inference, finance analysis |
| Passwords | bcryptjs | Industry standard hashing |

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Git
- Windows (Git Bash / CMD / PowerShell) or Mac/Linux

### Installation

```bash
# 1. Clone
git clone https://github.com/yourusername/finance-platform.git
cd finance-platform

# 2. Install dependencies
npm install
```

> **Windows note:** `better-sqlite3` compiles a native addon. If install fails:
> ```bash
> npm install --global windows-build-tools
> ```
> Or install "Desktop development with C++" from Visual Studio Installer.

### Environment Setup

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```env
DATABASE_URL="finance.db"
AUTH_SECRET="your-random-secret"
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"
GROQ_API_KEY="gsk_your_key_here"
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Get a free Groq API key at **https://console.groq.com** → API Keys → Create (14,400 requests/day free).

### Run

```bash
# Create the database
npm run db:push

# Start dev server
npm run dev
```

Visit **http://localhost:3000** — register and you're in.

### Useful Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:push      # Sync schema to SQLite
npm run db:studio    # Visual database browser
```

---

## 🤖 AI Features

All AI features use **Groq's free tier** — Llama 3.3 70B, 14,400 requests/day, no credit card needed.

### How it works (correctly)

The key design principle: **code does all the math, AI only writes the text.**

Most AI finance apps ask the LLM to calculate totals — this causes hallucinations. FinanceOS pre-computes everything in TypeScript first:

```
Code calculates → monthly totals, averages, anomaly detection
↓
Sends pre-computed facts to Groq
↓
Groq writes human-readable insights about those facts
```

This means answers like "Your December 2025 income was $7,950" are always exactly correct.

### Health Score Calculation

| Metric | Formula |
|--------|---------|
| Savings Rate | `(avg_income - avg_expense) / avg_income × 100` |
| Score | 40%+ savings → 90, 30-40% → 75, 20-30% → 60, etc. |
| All scores | Computed in TypeScript, LLM cannot override them |

### Anomaly Detection (code-based)

Three detection passes run in TypeScript before any AI call:
1. **Duplicates** — same description + amount appearing 2+ times in a month
2. **Spikes** — current month amount ÷ historical average ≥ 2.0
3. **Large one-offs** — amount ≥ $300 with no historical data

If no anomalies are detected, the AI is bypassed entirely. Zero false positives.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Login + Register
│   ├── (dashboard)/             # Protected pages
│   │   ├── dashboard/           # Charts + KPIs
│   │   ├── transactions/        # Full transaction list
│   │   ├── accounts/            # Account management
│   │   ├── budgets/             # Budget tracking
│   │   ├── categories/          # Category management
│   │   └── ai/                  # AI Assistant (Health Score, Chat, Anomalies)
│   └── api/
│       ├── auth/                # NextAuth + register
│       ├── transactions/        # CRUD + CSV import
│       ├── accounts/            # CRUD
│       ├── budgets/             # CRUD
│       ├── categories/          # CRUD
│       └── ai/                  # health-score, chat, anomalies, categorize
├── auth.ts                      # NextAuth (Node.js)
├── auth.config.ts               # NextAuth (Edge-safe for middleware)
├── middleware.ts                 # JWT route protection
├── db/
│   ├── index.ts                 # Drizzle + better-sqlite3
│   └── schema.ts                # users, accounts, categories, transactions, budgets
├── lib/
│   ├── utils.ts                 # cn(), formatCurrency()
│   └── groq.ts                  # Groq client + askGroq helper
└── components/
    ├── layout/                  # Sidebar + TopBar
    └── ui/                      # Button, Input, Card, Dialog, Select...
```

---

## 🗄️ Database Schema

```
users           id, name, email, password
accounts        id, userId, name, type, balance, color
categories      id, userId, name, icon, color, type
transactions    id, userId, accountId, categoryId, amount, type, description, date
budgets         id, userId, categoryId, name, amount, period, startDate
```

All tables cascade-delete on user removal. Foreign keys enforced by SQLite.

---

## 🛣️ Roadmap

- [ ] Recurring transactions (auto-log monthly bills)
- [ ] Savings goals with milestone tracking
- [ ] PDF/Excel report export
- [ ] Plaid sandbox integration (real bank connection demo)
- [ ] Multi-currency with live exchange rates (ExchangeRate-API free tier)
- [ ] Mobile-responsive sidebar
- [ ] Deploy guide (Vercel + Turso free tier for cloud hosting)

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `better-sqlite3` install fails | Run `npm install --global windows-build-tools` as Administrator |
| `npm run db:push` fails | Check `.env.local` has `DATABASE_URL="finance.db"` |
| Auth redirect loop | Set `AUTH_SECRET` and `NEXTAUTH_SECRET` to same random string |
| AI returns errors | Check `GROQ_API_KEY` in `.env.local` — get free key at console.groq.com |
| CSV dates off by 1 day | Make sure you download the CSV directly — don't open and resave in Excel |
| Port in use | `npm run dev -- -p 3001` |

---

## 🤝 Contributing

```bash
git checkout -b feature/your-feature
git commit -m "feat: description"
git push origin feature/your-feature
```

---

## 📄 License

MIT © [Your Name](https://github.com/yourusername)

---

<div align="center">
  <p>Built with ❤️ · <a href="https://github.com/yourusername/finance-platform">⭐ Star on GitHub</a></p>
</div>
