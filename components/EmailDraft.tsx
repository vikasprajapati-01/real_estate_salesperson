"use client";

import { useState } from "react";
import { AlertIcon, CheckIcon, CopyIcon, MailIcon, SpinnerIcon } from "@/components/icons";
import { btnPrimary, btnSecondary, card, inputClass } from "@/components/ui";
import type { EmailDraft as Draft, Lead } from "@/lib/types";

const GOALS = [
  { value: "first_reply", label: "First reply" },
  { value: "follow_up", label: "Follow-up (no reply yet)" },
  { value: "site_visit", label: "Invite to site visit" },
];

const TONES = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "assertive", label: "Assertive" },
];

export default function EmailDraft({ lead, onChange }: { lead: Lead; onChange: (next: Lead) => void }) {
  const [goal, setGoal] = useState(GOALS[0].value);
  const [tone, setTone] = useState(TONES[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const draft = lead.emailDraft;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: { input: lead.input, analysis: lead.analysis }, goal, tone }),
      });
      const data = (await res.json()) as { draft?: Draft; error?: string };
      if (!res.ok || !data.draft) throw new Error(data.error || "Could not write the email, please retry");
      onChange({ ...lead, emailDraft: data.draft });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write the email, please retry");
    } finally {
      setLoading(false);
    }
  }

  function edit(patch: Partial<Draft>) {
    if (draft) onChange({ ...lead, emailDraft: { ...draft, ...patch } });
  }

  async function copy() {
    if (!draft) return;
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const mailto = draft
    ? `mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    : "#";

  return (
    <section className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
      <h2 className="text-base font-semibold">Email draft</h2>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Purpose
          <select value={goal} onChange={(e) => setGoal(e.target.value)} disabled={loading} className={inputClass}>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Tone
          <select value={tone} onChange={(e) => setTone(e.target.value)} disabled={loading} className={inputClass}>
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={generate} disabled={loading} className={btnPrimary}>
          {loading ? <SpinnerIcon className="size-4 animate-spin" /> : <MailIcon className="size-4" />}
          {loading ? "Writing…" : draft ? "Regenerate" : "Write email"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-hot">
          <AlertIcon className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {draft ? (
        <div className="flex flex-col gap-3">
          <input
            value={draft.subject}
            onChange={(e) => edit({ subject: e.target.value })}
            aria-label="Email subject"
            className={`${inputClass} font-medium`}
          />
          <textarea
            value={draft.body}
            onChange={(e) => edit({ body: e.target.value })}
            aria-label="Email body"
            rows={10}
            className={`${inputClass} resize-y leading-relaxed`}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={btnSecondary}>
              {copied ? <CheckIcon className="size-4 text-primary-ink" /> : <CopyIcon className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a href={mailto} className={btnSecondary}>
              <MailIcon className="size-4" />
              Open in mail app
            </a>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Pick a purpose and tone, and the email is written from this lead&apos;s details.
        </p>
      )}
    </section>
  );
}