# HabitTrace— Daily Habit & Reflection Tracker

A production-ready daily habit tracking and reflection application with **React**, **Vite**, and **Supabase**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/habitflow)

---

## Features

- **Daily Reflection Form** — Yes/No questions with optional notes, duplicate submission guard
- **Dashboard** — Streak tracking, 30-day trend charts, habit performance analytics
- **History** — Calendar heatmap + list view with drill-down responses
- **Question Manager** — Add/Edit/Delete/Toggle/Drag-to-reorder habits
- **Settings** — Reminder time picker, timezone, Zapier webhook integration
- **Auth** — Sign up / sign in via Supabase Auth
- **Mobile-first** — Responsive layout with bottom nav on small screens

---

## Tech stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Frontend     | React 19, TypeScript, Vite, pnpm    |
| Routing      | React Router                        |
| Database     | Supabase PostgreSQL                 |
| Auth         | Supabase Auth                       |
| Notifications | Zapier (scheduled webhooks)        |
| Hosting      | Vercel                              |

---

## Database schema

```
profiles          — User profile + reminder settings
questions         — User-created habit questions
daily_entries     — One row per user per day (duplicate guard)
responses         — One row per question per entry
v_daily_summary   — Analytics view (yes%, streaks)
v_question_stats  — Per-habit all-time stats
```

Row Level Security (RLS) — users can only access their own data.

---

## Local development

**Requirements:** Node 20+, [pnpm](https://pnpm.io/)

```bash
pnpm install
```

Create `.env.local` from `.env.example` and set:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon (public) key

```bash
pnpm dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

```bash
pnpm build    # production build → dist/
pnpm preview  # serve dist locally
```

---

## Deploy to Vercel

1. Push the repo to GitHub and import the project in Vercel, **or** use `vercel` CLI from the repo root.
2. Set the same `VITE_SUPABASE_*` environment variables in the Vercel project settings.
3. Build command: `pnpm run build` (default for Vite). Output directory: `dist`.

---

## Zapier integration

1. Create a Zap → **Trigger:** Schedule by Zapier (daily at your reminder time)
2. **Action 1:** Webhooks by Zapier → POST → your webhook URL
3. **Action 2 (optional):** Gmail → send reminder email to yourself
4. Paste the Catch Hook URL in **Settings → Zapier Webhook URL** in the app

---

## Environment

The app uses the Supabase **anon** key in the browser (safe to expose — protected by RLS). Do not put the **service role** key in the client.

Example project: `umgnwpoiuvftylzvubhb` (region: ap-southeast-1).

---

## License

MIT
