"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import {
  AlertIcon,
  BoltIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  HomeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SendIcon,
  SpinnerIcon,
  WalletIcon,
} from "@/components/icons";
import EmailDraft from "@/components/EmailDraft";
import ScoreRing from "@/components/ScoreRing";
import { PRIORITY_STYLE } from "@/components/priority";
import { btnPrimary, btnSecondary, card, inputClass } from "@/components/ui";
import { downloadIcs, dueDate } from "@/lib/ics";
import { deleteLead, getLead, saveLead } from "@/lib/store";
import { STATUSES } from "@/lib/status";
import type { Lead, LeadStatus } from "@/lib/types";

const CHANNEL = {
  call: { label: "Call", Icon: PhoneIcon },
  whatsapp: { label: "WhatsApp", Icon: ChatIcon },
  email: { label: "Email", Icon: MailIcon },
} as const;

const sectionTitle = "text-base font-semibold";

const CHIPS = [
  "What should I emphasize on the call?",
  "Make my reply more assertive",
  "What is the biggest risk with this lead?",
];

function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null | undefined>(undefined);
    const router = useRouter();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLead(getLead(id) ?? null);
  }, [id]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [lead?.chat.length, sending]);

  if (lead === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-start px-4 py-12 sm:px-6">
        <p className="flex items-center gap-2 text-sm text-muted">
          <SpinnerIcon className="size-4 motion-safe:animate-spin" />
          Loading lead…
        </p>
      </main>
    );
  }
  if (lead === null) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <div className={`${card} p-6`}>
          <h1 className="text-lg font-semibold">Lead not found</h1>
          <p className="mt-1 text-sm text-muted">Leads are stored in this browser only, so this lead may have been saved on another device.</p>
          <Link href="/" className={`${btnSecondary} mt-4`}>
            <ChevronLeftIcon className="size-4" />
            Back to leads
          </Link>
        </div>
      </main>
    );
  }

  const a = lead.analysis;
  const style = PRIORITY_STYLE[a.priority];
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  function update(next: Lead) {
    setLead(next);
    saveLead(next);
  }

    function remove() {
    if (!window.confirm(`Delete ${lead!.input.name}? This cannot be undone.`)) return;
    deleteLead(lead!.id);
    router.push("/");
  }

  function toggle(followUpId: string) {
    update({
      ...lead!,
      followUps: lead!.followUps.map((f) => (f.id === followUpId ? { ...f, done: !f.done } : f)),
    });
  }

  async function copyReply() {
    await navigator.clipboard.writeText(a.suggestedResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    const before = lead!;
    const withUser: Lead = { ...before, chat: [...before.chat, { role: "user", text: message }] };
    update(withUser);
    setInput("");
    setChatError(null);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: before, history: before.chat, message }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error || "Chat failed, please retry");
      update({ ...withUser, chat: [...withUser.chat, { role: "model", text: data.reply }] });
    } catch (err) {
      update(before); // roll back the unanswered message
      setInput(message);
      setChatError(err instanceof Error ? err.message : "Chat failed, please retry");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  const facts = [
    { label: "Location", value: lead.input.location, Icon: MapPinIcon },
    { label: "Requirement", value: lead.input.requirement, Icon: HomeIcon },
    { label: "Budget", value: lead.input.budget, Icon: WalletIcon },
    { label: "Timeline", value: lead.input.timeline, Icon: ClockIcon },
  ].filter((f) => f.value);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <ChevronLeftIcon className="size-4" />
          All leads
        </Link>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            Status
            <select
              value={lead.status ?? "new"}
              onChange={(e) => update({ ...lead, status: e.target.value as LeadStatus })}
              className={`${inputClass} h-8 w-auto py-0 text-xs`}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={remove} className={`${btnSecondary} h-8 px-3 text-xs text-hot`}>
            Delete lead
          </button>
        </div>
      </div>

      <section className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-col-reverse gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{lead.input.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>{style.label}</span>
            </div>
            {facts.length > 0 ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                {facts.map(({ label, value, Icon }) => (
                  <div key={label} className="min-w-0">
                    <dt className="flex items-center gap-1.5 text-xs text-muted">
                      <Icon className="size-3.5" />
                      {label}
                    </dt>
                    <dd className="mt-0.5 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <ScoreRing score={a.score} priority={a.priority} size={104} />
        </div>
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          <span className="font-semibold text-ink">Why this score: </span>
          {a.scoreReason}
        </p>
      </section>

      <section className="flex gap-4 rounded-xl border border-primary/30 bg-primary-soft p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg">
          <BoltIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-primary-ink">Recommended next action</h2>
          <p className="mt-1 text-lg font-medium leading-snug">{a.nextAction}</p>
        </div>
      </section>

      <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Summary</h2>
        <p className="text-sm leading-relaxed">{a.summary}</p>
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">Intent: </span>
          {a.intent}
        </p>
        <details className="group text-sm">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-primary-ink [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" />
            Original customer message
          </summary>
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-sunken p-3 leading-relaxed">
            {lead.input.message}
          </p>
        </details>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className={`${card} p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Key requirements</h2>
          {a.keyRequirements.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None noted.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {a.keyRequirements.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary-ink" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`${card} p-5 sm:p-6`}>
          <h2 className={sectionTitle}>Objections to expect</h2>
          {a.objections.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None noted.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {a.objections.map((o, i) => (
                <li key={i} className="flex gap-2">
                  <AlertIcon className="mt-0.5 size-4 shrink-0 text-warm" />
                  {o}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitle}>Suggested response</h2>
          <button type="button" onClick={copyReply} className={`${btnSecondary} h-8 px-3 text-xs`}>
            {copied ? <CheckIcon className="size-3.5 text-primary-ink" /> : <CopyIcon className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="whitespace-pre-wrap rounded-lg border-l-2 border-primary bg-sunken p-4 text-sm leading-relaxed">
          {a.suggestedResponse}
        </p>
      </section>

      <EmailDraft lead={lead} onChange={update} />

      <section className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitle}>Follow-up plan</h2>
          <button type="button" onClick={() => downloadIcs(lead)} className={`${btnSecondary} h-8 px-3 text-xs`}>
            <CalendarIcon className="size-3.5" />
            Add to calendar (.ics)
          </button>
        </div>
        <ol className="flex flex-col gap-3">
          {lead.followUps.map((f) => {
            const due = dueDate(lead, f.dayOffset);
            const overdue = !f.done && due.getTime() <= endOfToday.getTime();
            const channel = CHANNEL[f.channel] ?? CHANNEL.call;
            return (
              <li
                key={f.id}
                className={`flex gap-3 rounded-lg border p-3 ${
                  overdue ? "border-warm/40 bg-warm-soft" : "border-line bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  checked={f.done}
                  onChange={() => toggle(f.id)}
                  className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary"
                  aria-label={`Mark done: ${f.action}`}
                />
                <div className={`min-w-0 flex-1 text-sm ${f.done ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">
                      {due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-muted">
                      <channel.Icon className="size-3" />
                      {channel.label}
                    </span>
                    {overdue ? (
                      <span className="rounded-full bg-warm-soft px-2 py-0.5 text-xs font-semibold text-warm ring-1 ring-warm/30">
                        Due
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-1 font-medium ${f.done ? "line-through" : ""}`}>{f.action}</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted">{f.message}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Ask about this lead</h2>
        {lead.chat.length > 0 ? (
          <div className="flex flex-col gap-2">
            {lead.chat.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "self-end rounded-br-md bg-primary text-primary-fg"
                    : "self-start rounded-bl-md bg-sunken"
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending ? (
              <div className="self-start rounded-2xl rounded-bl-md bg-sunken px-3.5 py-3" role="status">
                <span className="sr-only">Thinking…</span>
                <span className="flex gap-1" aria-hidden="true">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              </div>
            ) : null}
            <div ref={chatEnd} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={sending}
              onClick={() => send(c)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary-ink disabled:opacity-60"
            >
              {c}
            </button>
          ))}
        </div>

        {chatError ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-hot/30 bg-hot-soft px-3 py-2.5 text-sm text-hot">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            {chatError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder="Ask a question or request a rewrite…"
            aria-label="Message about this lead"
            className={`${inputClass} h-11 flex-1`}
          />
          <button type="submit" disabled={sending || !input.trim()} className={`${btnPrimary} h-11`}>
            <SendIcon className="size-4" />
            Send
          </button>
        </form>
      </section>
    </main>
  );
}

export default function LeadDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-4xl flex-1 items-start px-4 py-12 sm:px-6">
          <p className="flex items-center gap-2 text-sm text-muted">
            <SpinnerIcon className="size-4 motion-safe:animate-spin" />
            Loading lead…
          </p>
        </main>
      }
    >
      <LeadDetail />
    </Suspense>
  );
}
