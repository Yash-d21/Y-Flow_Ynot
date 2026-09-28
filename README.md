# Y-Flow

Local Next.js portals for Y-Not Design & Manufacturing.

- **Staff / Admin portal** — orders, stage filters, inbox (chat handoffs), clients, users
- **Client portal** — my orders, approvals, files, help + **Claude chat bubble** (client only)
- **Local SQLite + disk files** · **SMTP** · **magic links** for login / proof review

## Setup

```bash
cd web
npm install
cp .env.example .env
# set AUTH_SECRET, ANTHROPIC_API_KEY, SMTP_* as needed
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Seed logins

| Email | Password | Portal |
|---|---|---|
| staff@y-not.com | password123 | Staff |
| client@y-not.com | password123 | Client · **Google** |

New clients sign up at `/signup` — SMTP emails staff + welcome/magic link to the client.

Clients create orders from **Catalog / Create Order** — pick from **136** in-stock Y-Not Premium Brands SKUs (imported from `y-not-export`) or submit a custom brief.

## Env

- `DATABASE_URL` — `file:./dev.db`
- `AUTH_SECRET` — session secret
- `ANTHROPIC_API_KEY` — Claude for client chat (optional; falls back to knowledge snippets)
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — real email. If `SMTP_HOST` is empty/unset, mail is logged to the console (dry-run).
- `APP_URL` — base URL for magic links

## Key flows

1. Client signs up at `/signup` or logs in at `/login`
2. Staff creates/moves orders; status **PROOF** emails clients a magic link
3. Client opens Approvals / order detail → Approve Proof or Request Changes
4. Client chat bubble → Hand to human → Staff Inbox → Convert to order
