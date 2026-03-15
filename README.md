# FinanceOS - Personal Finance Platform

A full-stack personal finance app built with Next.js 14, Drizzle ORM, SQLite (better-sqlite3), and NextAuth v5.

## Tech Stack
| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | SQLite via **better-sqlite3** (local .db file) |
| ORM | Drizzle ORM |
| Auth | NextAuth.js v5 (JWT, credentials) |
| Styling | Tailwind CSS + Radix UI primitives |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query |

---

## Setup (Windows - Git Bash, CMD, or PowerShell)

### 1. Install dependencies
```bash
npm install
```
> Note: `better-sqlite3` compiles a native Node.js addon.
> If you get a build error, install windows build tools first:
> `npm install --global windows-build-tools` or install Visual Studio Build Tools.

### 2. Configure your environment
Open `.env.local` and replace the `AUTH_SECRET` value:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the output as your `AUTH_SECRET`.

### 3. Create the database
```bash
npm run db:push
```
This creates `finance.db` in your project root automatically.

### 4. Start the dev server
```bash
npm run dev
```
Visit **http://localhost:3000** — register an account and you're in!

### 5. (Optional) Browse the database visually
```bash
npm run db:studio
```

---

## Project Structure
```
src/
├── app/
│   ├── (auth)/           # Login + Register pages (public)
│   ├── (dashboard)/      # Protected pages
│   │   ├── dashboard/    # Overview with charts
│   │   ├── accounts/     # Manage bank accounts
│   │   ├── transactions/ # Income & expenses log
│   │   ├── budgets/      # Budget tracking with progress bars
│   │   └── categories/   # Transaction categories
│   ├── api/              # REST API routes
│   ├── layout.tsx        # Root layout
│   └── providers.tsx     # Session + Query providers
├── auth.ts               # NextAuth full config (Node.js only)
├── auth.config.ts        # NextAuth edge-safe config (middleware)
├── middleware.ts          # Route protection (Edge Runtime safe)
├── db/
│   ├── index.ts          # better-sqlite3 + Drizzle client
│   └── schema.ts         # Tables: users, accounts, categories, transactions, budgets
├── components/
│   ├── layout/           # Sidebar + TopBar
│   └── ui/               # Radix-based components
└── lib/utils.ts          # Helpers: cn(), formatCurrency()
```

---

## Troubleshooting

**`better-sqlite3` install fails on Windows**
Install build tools (run as Administrator):
```bash
npm install --global windows-build-tools
```
Or install "Desktop development with C++" from Visual Studio Installer.

**`npm run db:push` fails**
Make sure `.env.local` exists with `DATABASE_URL="finance.db"`.

**Auth not working / redirect loops**
Make sure `AUTH_SECRET` in `.env.local` is set to a long random string.

**Port already in use**
```bash
npm run dev -- -p 3001
```
