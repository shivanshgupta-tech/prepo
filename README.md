# Prepo — AI Career Coach

**Live demo:** [https://prepo-nine.vercel.app](https://prepo-nine.vercel.app)

Prepo helps you plan a career move with AI: industry insights, an ATS-friendly resume builder, cover letters, and mock interview quizzes tailored to your role.

Built by [Shivansh Gupta](https://github.com/shivanshgupta-tech).

---

## Features

| Area | What it does |
| --- | --- |
| **Onboarding** | Saves your industry, specialization, experience, skills, and bio so every tool is personalized. |
| **Industry Insights** | Salary ranges, demand, growth, top skills, and trends for your field. |
| **Resume Builder** | Markdown resume editor with AI rewrite help and PDF export. |
| **Cover Letters** | Generates a letter from a job title, company, and job description. |
| **Interview Prep** | 10-question mock quizzes, score history, and improvement tips. |

Protected routes (dashboard, resume, interview, cover letter, onboarding) require sign-in.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| App | [Next.js 15](https://nextjs.org/) (App Router), React 19, Tailwind CSS, shadcn/ui |
| Auth | [Clerk](https://clerk.com/) |
| Database | PostgreSQL + [Prisma](https://www.prisma.io/) ([Neon](https://neon.tech/)) |
| AI | [Google Gemini](https://ai.google.dev/) |
| Jobs | [Inngest](https://www.inngest.com/) (weekly insight refresh) |
| Charts / PDF | Recharts, html2pdf.js |

---

## How the app works

```text
Sign in (Clerk)
    → Onboarding profile saved in Postgres
    → Gemini generates industry insights (or a local fallback if the API is busy)
    → Dashboard, resume, cover letters, and quizzes use that profile
```

**Auth.** `middleware.js` sends unauthenticated users to Clerk for `/dashboard`, `/resume`, `/interview`, `/ai-cover-letter`, and `/onboarding`. After login, Clerk creates a matching `User` row via `lib/checkUser.js`.

**Data.** Prisma models: `User`, `IndustryInsight`, `Resume`, `CoverLetter`, `Assessment`. The user industry field (for example `finance-venture-capital`) links to insights.

**AI.** `lib/gemini.js` tries current Gemini Flash models. If Gemini is down or overloaded, insights and quizzes still work with built-in fallbacks so the product is usable.

**Jobs.** Inngest can refresh stored industry insights on a weekly cron (`lib/inngest/function.js`).

---

## Project structure

```text
app/
  (auth)/              Sign-in and sign-up (Clerk)
  (main)/
    onboarding/        Profile form
    dashboard/         Industry insights
    resume/            Resume builder
    ai-cover-letter/   Cover letter list + generator
    interview/         Stats, history, mock quiz
  api/inngest/         Inngest webhook
actions/               Server actions (user, dashboard, resume, interview, cover letter)
lib/                   Prisma, Clerk/DB checks, Gemini, Inngest
prisma/                Schema and migrations
data/                  Industries, FAQs, landing copy
```

---

## Getting started

### Requirements

- Node.js 18+
- A Postgres database ([Neon](https://neon.tech/))
- [Clerk](https://dashboard.clerk.com/) keys
- [Gemini API key](https://aistudio.google.com/apikey)

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill in real values. Save the file before starting the server.

```env
DATABASE_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

GEMINI_API_KEY=
```

Optional: `GEMINI_MODEL` to pin a specific Gemini model.

### 3. Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). After you add or change env vars, restart the server.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

---

## Important setup notes

- **`.env.local` must be saved.** Next.js and Prisma read the file on disk, not unsaved editor text.
- **Prisma also reads `.env`.** Keep `DATABASE_URL` there as well if `prisma db push` cannot see `.env.local`.
- **Never commit secrets.** `.env*` is gitignored except `.env.example`.
- **Gemini 1.5 Flash is retired.** The app uses current Flash models and retries if one is unavailable.

---

## License

Private project. Built for learning and portfolio use.
