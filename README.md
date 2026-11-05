# Lead Copilot

An AI lead desk for real-estate salespeople. Add an inbound lead and the app tells you how hot it is, what the customer wants, what to do next, and what to say. It also plans the follow-ups and drafts the email.

- **Live app:** https://real-estate-salesperson.vercel.app/
- **Demo video:** <add video link>
- **Repository:** https://github.com/vikasprajapati-01/lead-copilot

**Quick try:** open the live app and click **Load sample leads**. You get three leads (hot, warm, cold) ranked on the dashboard. Open one to see the analysis, chat, email draft and follow-up plan.

## The problem and my approach

A sales team gets hundreds of leads a day. The salesperson needs to know three things fast: which leads matter, what each customer wants, and what to do next.

I built the product around one idea: **the AI should do the reading, so the salesperson only has to act.** Each lead is turned into a score, a short summary, a next action and a ready reply. The dashboard shows only what helps a decision.

I then added features for what happens *after* the first reply. Most deals are lost there, when a follow-up is late or forgotten. That is why I built the follow-up scheduler and the email draft generator.

## Features

**Core**
- **Lead intake:** name, location, requirement, budget, timeline, and the customer's message.
- **AI analysis:** summary, intent, key requirements, objections, next action, suggested reply, a 1 to 10 score, a hot/warm/cold tag and the reason for the score.
- **Chat per lead:** ask "What should I emphasize on the call?" or "Make my reply more assertive". Answers use only that lead's data.
- **Lead list:** leads grouped as Hot, Warm and Cold, ranked by score. Delete one lead, or clear all.

**My own features**
- **Follow-up scheduler:** a 3 to 4 step plan for each lead, timed by priority (hot leads are chased on days 0, 1 and 3; cold leads on days 0, 7 and 21). Each step has a channel, an action and the message to send. Tick steps off, see what is due today on the dashboard, and export the plan to Google Calendar or Outlook as an `.ics` file.
- **Email draft generator:** choose a purpose (first reply, follow-up, site visit) and a tone (friendly, professional, assertive). You get an editable email with a subject, ready to copy or open in your mail app.

## How it works

```
Browser (Next.js)              Server (Next.js API routes)          Google
-----------------              ---------------------------          ------
New lead  ── /api/analyze ───► prompt + JSON schema, clean output ─► Gemini
Chat      ── /api/chat ──────► lead data as system prompt ─────────► Gemini
Email     ── /api/draft ─────► lead data + purpose + tone ─────────► Gemini

Leads are saved in the browser (localStorage) through lib/store.ts
```

```
app/               pages (dashboard, new lead, lead detail) and the 3 API routes
components/        EmailDraft, ScoreRing, header, theme toggle, icons
lib/gemini.ts      Gemini client: timeout, retry, model fallback
lib/prompts.ts     all prompts, including the scoring rubric
lib/store.ts       storage (the only file that touches localStorage)
lib/ics.ts         due dates and calendar export
lib/rateLimit.ts   per-IP request limit
```

## AI model

- **Gemini** (Google AI, free tier) through the official `@google/genai` SDK, called only from the server.
- The model name is an environment variable, with fallback models, so it can be changed without touching code.
- **Analysis** returns JSON in a fixed shape (temperature 0.3, for consistent scores). **Chat** and **email** use temperature 0.6, for natural writing.

## Key decisions and why

- **The scoring rules are written in the prompt.** Hot, warm and cold are defined by how clear the budget is, how specific the requirement is and how soon the customer wants to buy. The model must also explain each score in one sentence, so the salesperson can trust it.
- **The AI output is checked before it is used.** The API enforces a JSON schema, and the server then cleans the result: the score is kept between 1 and 10, the tag and channel must be valid values, and missing fields get safe defaults. One odd response cannot break the page.
- **Chat is tied to the lead.** Every question is sent with that lead's data and analysis, and the model is told to say what is missing instead of guessing.
- **The AI client is built for a busy free tier.** Gemini returned "high demand" errors while I was building, so each call has a 20-second timeout, one retry, and a switch to a fallback model. Users see a clear message instead of a spinner.
- **Leads are stored in the browser.** The app runs on Vercel serverless functions, where server memory can reset between requests. The API routes stay stateless and the browser keeps the data. All storage code sits in one file, so a database can replace it easily.
- **Follow-ups are stored as day offsets.** Due dates are calculated from them, which drives both the "due today" list and the calendar file.
- **A basic rate limit protects the public link.** Each IP gets 30 AI requests per 10 minutes, and messages are capped at 4,000 characters.

## Run locally

You need Node.js 20+ and a free Gemini API key from [Google AI Studio](https://aistudio.google.com).

```bash
git clone https://github.com/vikasprajapati-01/lead-copilot.git
cd lead-copilot
npm install
cp .env.example .env.local    # add your key
npm run dev
```

Open http://localhost:3000.

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `GEMINI_MODEL` | Main model |
| `GEMINI_FALLBACK_MODELS` | Comma-separated backup models |

Deployed on Vercel (free plan) with the same three variables.

## What I would build next

1. **Database and login** (for example Postgres), so a team shares one lead pool across devices.
2. **Automatic lead intake** from WhatsApp, email and web forms through webhooks.
3. **Real reminders** by push, email or WhatsApp, with the best contact time chosen from the customer's availability.
4. **Outcome tracking**, so the scoring rubric can be tuned against the deals that actually closed.
5. **Email address on the lead**, so "Open in mail app" fills the recipient.
6. **A shared rate limiter** (for example Redis) to protect the API across all server instances.

**Built with:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Gemini API.