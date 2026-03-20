# 🌟 HabitFlow — Daily Habit & Reflection Tracker

A production-ready daily habit tracking and reflection application built with vanilla JavaScript and Supabase.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/habitflow)

---

## ✨ Features

- **Daily Reflection Form** — Yes/No questions with optional notes, duplicate submission guard
- **Dashboard** — Streak tracking, 30-day trend charts, habit performance analytics
- **History** — Calendar heatmap + list view with drill-down responses
- **Question Manager** — Add/Edit/Delete/Toggle/Drag-to-reorder habits
- **Settings** — Reminder time picker, timezone, Zapier webhook integration
- **Auth** — Secure sign up / sign in via Supabase Auth
- **Mobile-first** — Fully responsive with bottom nav on mobile

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS (no framework, no build step) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Notifications | Zapier (scheduled webhooks) |
| Hosting | Vercel (static) |

---

## 🗄️ Database Schema

```
profiles          — User profile + reminder settings
questions         — User-created habit questions  
daily_entries     — One row per user per day (duplicate guard)
responses         — One row per question per entry
v_daily_summary   — Analytics view (yes%, streaks)
v_question_stats  — Per-habit all-time stats
```

Full Row Level Security (RLS) — users can only access their own data.

---

## 🚀 Deploy to Vercel

### Option 1: One-click (after pushing to GitHub)
Click the "Deploy with Vercel" button above.

### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Clone the repo
git clone https://github.com/YOUR_USERNAME/habitflow.git
cd habitflow

# Deploy
vercel

# Deploy to production
vercel --prod
```

---

## ⚡ Zapier Integration

1. Create a new Zap → **Trigger:** Schedule by Zapier (daily at your reminder time)
2. **Action 1:** Webhooks by Zapier → POST → your webhook URL
3. **Action 2 (optional):** Gmail → send reminder email to yourself
4. Paste the Catch Hook URL in **Settings → Zapier Webhook URL** in the app

---

## 🔧 Local Development

No build step needed — just open `public/index.html` in any browser.

```bash
# Or use any static server:
npx serve public
# Then open http://localhost:3000
```

---

## 📁 Project Structure

```
habitflow/
├── public/
│   └── index.html      # Complete app (single file)
├── vercel.json         # Vercel deployment config
├── .gitignore
└── README.md
```

---

## 🔐 Environment

The app uses a Supabase anon key (safe to expose publicly — protected by Row Level Security).

- **Supabase Project:** `umgnwpoiuvftylzvubhb`
- **Region:** ap-southeast-1 (Singapore)

---

## 📄 License

MIT — built with ❤️ using Claude + Supabase + Zapier
