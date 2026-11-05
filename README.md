# Lead Copilot

An AI-assisted lead desk for a real-estate sales team. A salesperson adds an inbound lead, and the app scores it, explains what the customer wants, suggests what to do next, drafts the reply, and schedules the follow-ups. The salesperson can then ask questions about that lead in a chat.

- **Live app:** https://real-estate-salesperson.vercel.app/
- **Repository:** https://github.com/vikasprajapati-01/lead-copilot
- **Demo video:** ----------------------------------

To try it with no setup, open the live app and click **Load sample leads** on the dashboard. This adds three leads (one hot, one warm, one cold) so you can see the ranking straight away.

## What it does

**Required features**

1. **Lead intake.** A form for name, location, property requirement, budget, buying timeline and the customer's message (an inquiry or a pasted chat).
2. **AI analysis.** For each lead the model returns a summary, the customer's intent, key requirements, likely objections, a recommended next action and a ready-to-send reply. It also returns a score (1 to 10), a hot/warm/cold tag and one sentence explaining the score.
3. **Conversational interface.** On each lead page you can ask things like "What should I emphasize on the call?" or "Make my reply more assertive". Every question is answered using that lead's data, so replies are about this customer and not generic advice.
4. **Lead list and prioritization.** Multiple saved leads, grouped as Hot, Warm and Cold and ranked by score. Each card shows the summary and the next action, so the list can be scanned quickly.
5. **Clear display.** A score ring, colour-coded priority, a highlighted next action, short bullet lists, and light and dark themes.

**My own features (the follow-up workflow after the first reply)**

- **Follow-up scheduler.** Each lead gets a 3 to 4 step plan. The timing depends on priority: hot leads on days 0, 1 and 3, warm on days 0, 2, 5 and 10, and cold on days 0, 7 and 21. Every step names a channel (call, WhatsApp or email), an action, and the message to send, and refers to something specific in that lead. Steps can be ticked off, and the dashboard has a **Follow-ups due** strip showing what is due today or overdue. The plan can be exported as an `.ics` file for Google Calendar or Outlook.
- **Email draft generator.** Pick a purpose (first reply, follow-up with no response, or site-visit invite) and a tone (friendly, professional, assertive). The app writes an email with a subject line, which you can edit, regenerate, copy, or open in your mail app.

**Why these features.** Most deals are lost after the first reply, when a follow-up is late or forgotten. Scoring helps the salesperson decide whom to call first, but they also need to know when to follow up and what to say. These two features cover that part of the day.

## How it works

```
Browser (Next.js pages)                      Server (Next.js route handlers)           Google
-----------------------                      -------------------------------           ------
New lead form  ── POST /api/analyze ───────► build prompt + JSON schema ─────────────► Gemini
                                             validate and clean the JSON  ◄──────────
Lead page chat ── POST /api/chat ──────────► lead data as system prompt + history ───► Gemini
Email draft    ── POST /api/draft ─────────► goal + tone + lead data ─────────────────► Gemini

Leads, follow-ups, chats and drafts are saved in the browser (localStorage) through lib/store.ts
```

The API routes are stateless. The browser sends the lead data on each request and saves the result.

### Project structure

```
app/
  page.tsx                  Dashboard: due follow-ups, leads grouped by priority, sample leads
  leads/new/page.tsx        Lead intake form
  leads/[id]/page.tsx       Lead detail: analysis, reply, email, follow-ups, chat
  api/analyze/route.ts      Lead analysis
  api/chat/route.ts         Grounded chat about one lead
  api/draft/route.ts        Email draft
components/                 EmailDraft, ScoreRing, ThemeToggle, AppHeader, icons, shared styles
lib/
  gemini.ts                 Gemini client with timeout, retry and model fallback
  prompts.ts                All prompts, including the scoring rubric and follow-up rules
  store.ts                  Storage (localStorage). The only file that touches storage
  ics.ts                    Due-date logic and calendar export
  types.ts                  Shared types
```

## AI model and how it is called

- **Provider:** Google Gemini API, free tier, through the official `@google/genai` SDK.
- **Model:** set by the `GEMINI_MODEL` environment variable (default `gemini-flash-latest`). Models that fail are replaced by the ones in `GEMINI_FALLBACK_MODELS`.
- **API key:** read only on the server. It is never sent to the browser.

How each call works:

| Call | Input | Output | Temperature |
|---|---|---|---|
| Analysis | Lead form fields and message | JSON object, enforced with a response schema | 0.3 |
| Chat | Lead data in the system prompt, plus the chat history and the new question | Plain text | 0.6 |
| Email draft | Lead data and analysis, plus the chosen purpose and tone | JSON with `subject` and `body` | 0.6 |

Analysis uses a low temperature so scores are more consistent. Chat and email use a higher one so the writing sounds natural.

## Key technical decisions

**The scoring rubric is in the prompt.** The prompt defines what hot (8 to 10), warm (5 to 7) and cold (1 to 4) mean: how clear the budget is, how specific the requirement is, and how soon the customer wants to buy. The model also has to give a one-sentence reason for the score, so the salesperson can see why a lead ranks where it does.

**The model's output is checked, not trusted.** Analysis uses Gemini's structured output with a response schema, so the reply is JSON with fixed fields. The server then runs it through a `clean()` function that clamps the score to 1 to 10, falls back to a score-based tag if the tag is invalid, restricts channels to the three allowed values, and replaces missing fields with empty values. This stops one bad response from breaking the page.

**Chat is grounded in the lead.** Every chat request puts that lead's data and analysis into the system prompt and tells the model to say what is missing instead of guessing. The model never answers from a general-purpose prompt.

**The free tier can be overloaded, so the AI client handles it.** During development Gemini returned `503 high demand` errors. `lib/gemini.ts` now:
- gives each request a 20-second timeout, so the page never hangs;
- retries each model once;
- moves to the next model in the fallback list on a 404 or 429, or after retries fail;
- stops straight away on 400, 401 and 403, because those are our own errors and retrying cannot help;
- returns a clear "service is busy" message to the user.

**Browser storage instead of server memory.** The brief allows in-memory storage or a database. The app is deployed on Vercel, where each request can run in a different short-lived serverless instance, so memory kept on the server can disappear between requests. Leads are therefore saved in the browser's `localStorage`, and the API routes stay stateless. All storage code is in `lib/store.ts`, so moving to a database means changing one file.

**Follow-ups are saved as real dates.** Each follow-up stores a day offset from when the lead was created. The due date is worked out from that, which is how the dashboard finds what is due today and how the `.ics` file gets its dates.

## Run it locally

Requirements: Node.js 20 or newer and a free Gemini API key from https://aistudio.google.com.

```bash
git clone https://github.com/vikasprajapati-01/lead-copilot.git
cd lead-copilot
npm install
cp .env.example .env.local     # then add your key
npm run dev
```

Open http://localhost:3000.

Environment variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key (required) |
| `GEMINI_MODEL` | Main model name |
| `GEMINI_FALLBACK_MODELS` | Comma-separated models to try if the main one is busy or unavailable |

Model names change over time. If you get a model error, check the current names in Google AI Studio and update these variables. No code change is needed.

## Deployment

The app is deployed on Vercel (free plan). Set the three environment variables above in the project settings, then deploy.

## Known limitations

- **Leads are stored per browser.** They don't sync between devices or people, and clearing site data removes them. A team product would need a database, such as Postgres, with a leads table and a follow-ups table.
- **Leads are entered by hand.** In a real deployment, leads would arrive from WhatsApp, email and web forms through webhooks and be created automatically.
- **No login and no rate limiting.** The public URL uses my free-tier API key. Messages are capped at 4,000 characters, but a production version would need authentication and per-user limits.
- **Follow-ups are reminders, not notifications.** The app shows what is due when you open it, and exports a calendar file. It does not send push notifications, emails or WhatsApp messages by itself.
- **Calendar events are set to 10:00 local time** on the due date. The time is not chosen from the customer's availability.
- **Scores come from a language model.** The rubric makes them reasonably consistent, but the same lead can score a point higher or lower on a re-run. A real deployment would check the scores against actual deal outcomes.
- **Email drafts have no recipient.** The intake form doesn't collect an email address, so "Open in mail app" opens a blank To field. Drafts end with a `[Your name]` placeholder.
- **Long chats are not shortened.** The full chat history is sent each time. This is fine for a demo, but very long conversations would need trimming or summarizing.
- **Free-tier availability.** If Gemini is overloaded for longer than the retries and fallbacks cover, the user sees a "service is busy" message and can retry.

## What I would build next

1. A database and login, so a team can share one lead pool.
2. Lead intake through WhatsApp and email webhooks.
3. Real notifications for due follow-ups.
4. Tracking deal outcomes, so the scoring rubric can be tuned against what actually closed.

## Tech stack

Next.js 16 (App Router, route handlers), React 19, TypeScript, Tailwind CSS 4, `@google/genai`.

## AI tools used

See the AI usage disclosure submitted with this project. The AI model inside the product is Gemini; the AI tools used to build it are listed there.