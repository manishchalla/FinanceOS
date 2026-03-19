<div align="center">

# FinanceOS

**Self-hosted personal finance platform with multi-agent AI**

https://github.com/user-attachments/assets/41e29ee5-b9e7-4227-810f-03fa848693a9


</div>

---

## What it does

FinanceOS is a full-stack finance tracking app that runs locally on your machine. You import your bank transactions via CSV, track budgets and accounts, and ask an AI questions about your spending using your real data.

No cloud database. No subscriptions. No data leaving your machine except AI API calls.

---

## Use Cases

**Personal finance tracking**
Import your bank CSV, categorize transactions, set monthly budgets, and see where your money goes across months.

**Multiple income streams**
Track income and expenses across separate accounts. The dashboard shows per-month breakdowns so you can see which months were profitable.

**Anyone replacing Mint or YNAB**
Self-hosted alternative. Your data stays in a local SQLite file. You own it completely.

**Developers building a portfolio**
The codebase demonstrates Next.js App Router, Drizzle ORM, NextAuth v5, multi-agent AI with tool calling, streaming responses, and HITL approval patterns — all in one repo.

---

## What it actually does (no hype)

**Dashboard**
- Shows total balance, income, expenses, and net savings for the month containing your latest transaction
- Area chart of income vs expenses over last 6 months
- Pie chart of spending by category for active month
- Last 8 transactions

**Accounts**
- Create checking, savings, credit, investment, or cash accounts
- Balance updates automatically when you add, edit, or delete transactions

**Transactions**
- Add income, expense, or transfer transactions manually
- Edit any transaction — balance corrects automatically on save
- Delete with balance reversal
- Filter by date range (presets + custom), type, and search by description
- Summary bar shows total income, expenses, net for the filtered period

**CSV Import**
- Upload any bank CSV export
- Auto-detects date, description, amount, and type columns
- Handles Excel BOM, Windows line endings, MM/DD/YYYY and YYYY-MM-DD formats
- After import, AI automatically categorizes transactions by matching descriptions to your categories
- Up to 500 rows per import

**Budgets**
- Create monthly, weekly, or yearly budgets per category
- Progress bars show actual spend vs limit in real time
- After every expense transaction, a background agent checks if any budget hit 80% and generates an alert

**Categories**
- 12 default categories seeded on registration
- Add custom categories with emoji icons and colors

**AI Assistant — 3 tabs**

*Health Score*
Calculates a score 0-100 based on your actual transaction history. Four components: savings rate, spending control, budget adherence, account diversity. All math is done in TypeScript — the LLM only writes the descriptions. Scores are deterministic and always correct.

*Finance Chat (Multi-Agent)*
Three agents with different models:
- Router (Groq Llama 3.1 8B) classifies your message in ~300ms
- Accountant (OpenRouter Hunter Alpha) handles data questions using tool calling to query your SQLite database
- Strategist (OpenRouter Healer Alpha) handles what-if and planning questions

The AI can read your transactions, create budgets (with your approval), and categorize transactions. Chat history persists across sessions in SQLite.

*Anomaly Radar*
Compares latest month spending against 4-month historical averages. Flags duplicate charges (same description + amount twice in a month), spending spikes (2x above average), and large one-off expenses. Detection logic runs in TypeScript — AI only writes the descriptions of what was found.

---

## How to Run

### Prerequisites
- Node.js 18+
- Git
- Windows (Git Bash / CMD) or Mac / Linux

### 1. Clone and install

```bash
git clone https://github.com/manishchalla/FinanceOS.git
cd finance-platform
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```env
DATABASE_URL="finance.db"

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH_SECRET="your-random-32-char-string"
NEXTAUTH_SECRET="same-value-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Free key at console.groq.com
GROQ_API_KEY="gsk_your_key"

# Free key at openrouter.ai
OPENROUTER_API_KEY="sk-or-your-key"
```

### 3. Create the database

```bash
npm run db:push
```

Creates `finance.db` in the project root. Run this again any time you pull new schema changes.

### 4. Start

```bash
npm run dev
```

Visit **http://localhost:3000** — register an account and you're in.

### Other commands

```bash
npm run build        # Production build
npm run db:studio    # Visual database browser at localhost:4983
```
---

## License

MIT
