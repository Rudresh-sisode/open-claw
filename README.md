# OpenClaw — AI Agent Platform

A Next.js SaaS UI that lets non-technical users run an OpenClaw AI agent 24/7 on Vercel Sandboxes with Telegram integration.

## What it does

- **No CLI required** — everything is managed through a beautiful UI
- **Telegram integration** — connect a bot via BotFather using a step-by-step wizard
- **24/7 uptime** — hybrid strategy: auto-extend timeout every 4h + auto-restart from snapshot if it dies
- **Access control** — pairing codes, allowlists, group policies — all configurable from the UI
- **Real-time dashboard** — live sandbox status, activity logs, health indicators

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Cron Jobs**: Vercel Cron (auto-extend + health check)
- **Sandbox**: Vercel Sandbox API (OpenClaw runs here)

## Setup

### 1. Clone & Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for cron jobs) |
| `VERCEL_API_TOKEN` | Vercel API token for sandbox management |
| `VERCEL_TEAM_ID` | Vercel team ID (optional) |
| `CRON_SECRET` | Random string to secure cron endpoints |
| `OPENCLAW_SNAPSHOT_ID` | Pre-configured OpenClaw snapshot ID |

### 3. Supabase Database

Run the migration in Supabase SQL editor:

```bash
# Copy and run: supabase/migrations/001_initial_schema.sql
```

### 4. OpenClaw Snapshot

Create a Vercel Sandbox with OpenClaw pre-installed and configured, then save the snapshot ID as `OPENCLAW_SNAPSHOT_ID`.

### 5. Run Locally

```bash
npm run dev
```

## Uptime Strategy

This app implements the **hybrid uptime strategy** from `24-7-UPTIME-STRATEGY.txt`:

### Primary: Auto-Extend (every 4 hours)
- Vercel Cron calls `/api/cron/extend-sandboxes`
- Finds all sandboxes expiring within 1 hour
- Extends each by 5 hours via Vercel API
- Logs the action to activity_logs

### Backup: Health Check + Auto-Restart (every minute)
- Vercel Cron calls `/api/cron/health-check`
- Probes each sandbox via Vercel API
- If dead → creates new sandbox from snapshot
- Updates DB with new sandbox ID
- User's URL stays the same (proxied)

**Result: 99.9%+ uptime, fully automated, user never notices**

## Telegram Setup Flow (User Perspective)

1. User signs up and creates AI sandbox
2. Goes to **Channels → Telegram → Set Up**
3. Creates bot with @BotFather, copies token
4. Pastes token in wizard — we validate it live against Telegram API
5. Chooses DM policy: Pairing / Allowlist / Open
6. Configures streaming, link previews, reply threading
7. Reviews and activates — config syncs to sandbox
8. Done! User messages bot on Telegram, AI responds

## Project Structure

```
src/
├── app/
│   ├── (auth)/login|signup/     # Auth pages
│   ├── (dashboard)/             # Protected dashboard
│   │   ├── layout.tsx           # Auth guard + sidebar
│   │   ├── dashboard/           # Main dashboard + stats
│   │   ├── setup/telegram/      # Telegram setup wizard
│   │   ├── channels/            # Channel management
│   │   ├── activity/            # Full activity log
│   │   └── settings/            # Account & sandbox settings
│   ├── api/
│   │   ├── cron/
│   │   │   ├── extend-sandboxes/ # Strategy 1: auto-extend
│   │   │   └── health-check/     # Strategy 2: auto-restart
│   │   ├── sandbox/create|status|restart/
│   │   └── telegram/configure|validate/
│   └── page.tsx                 # Landing page
├── components/
│   ├── ui/                      # Reusable UI components
│   ├── dashboard/               # Dashboard-specific components
│   └── telegram/                # Telegram wizard + status card
├── lib/
│   ├── supabase/client.ts       # Browser Supabase client
│   └── supabase/server.ts       # Server Supabase client
└── types/index.ts               # TypeScript types
```

## Deployment

Deploy to Vercel — cron jobs are configured in `vercel.json` and run automatically.

Make sure to set all environment variables in your Vercel project settings.
