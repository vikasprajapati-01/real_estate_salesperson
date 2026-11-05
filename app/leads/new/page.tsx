"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertIcon, ChevronLeftIcon, SpinnerIcon } from "@/components/icons";
import { btnPrimary, btnSecondary, card, inputClass } from "@/components/ui";
import { saveLead } from "@/lib/store";
import type { Analysis, Lead, LeadInput } from "@/lib/types";

const FIELDS = [
  { name: "name", label: "Name", required: true, placeholder: "Asha Mehta", wide: true },
  { name: "location", label: "Location", required: false, placeholder: "Hinjewadi, Pune", wide: false },
  { name: "requirement", label: "Property requirement", required: false, placeholder: "2 BHK for a family", wide: false },
  { name: "budget", label: "Budget", required: false, placeholder: "80 lakh", wide: false },
  { name: "timeline", label: "Buying timeline", required: false, placeholder: "Within 2 months", wide: false },
] as const;

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const input: LeadInput = {
      name: String(form.get("name") ?? "").trim(),
      location: String(form.get("location") ?? "").trim(),
      requirement: String(form.get("requirement") ?? "").trim(),
      budget: String(form.get("budget") ?? "").trim(),
      timeline: String(form.get("timeline") ?? "").trim(),
      message: String(form.get("message") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { analysis?: Analysis; error?: string };
      if (!res.ok || !data.analysis) {
        throw new Error(data.error || "Analysis failed, please retry");
      }

      const lead: Lead = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        input,
        analysis: data.analysis,
        followUps: data.analysis.followUps.map((followUp) => ({
          ...followUp,
          id: crypto.randomUUID(),
          done: false,
        })),
        chat: [],
      };
      saveLead(lead);
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed, please retry");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeftIcon className="size-4" />
        All leads
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">New lead</h1>
      <p className="mt-1 text-sm text-muted">
        Paste the customer details. The lead is scored and gets a follow-up plan.
      </p>

      <form onSubmit={onSubmit} aria-busy={loading} className={`${card} mt-6 grid gap-5 p-5 sm:grid-cols-2 sm:p-6`}>
        {FIELDS.map((field) => (
          <label
            key={field.name}
            className={`flex flex-col gap-1.5 text-sm font-medium ${field.wide ? "sm:col-span-2" : ""}`}
          >
            <span className="flex items-baseline justify-between">
              {field.label}
              {field.required ? null : <span className="text-xs font-normal text-muted">Optional</span>}
            </span>
            <input
              name={field.name}
              required={field.required}
              disabled={loading}
              placeholder={field.placeholder}
              className={inputClass}
            />
          </label>
        ))}

        <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
          Customer message
          <textarea
            name="message"
            required
            rows={7}
            disabled={loading}
            placeholder="Paste what the customer wrote, exactly as they wrote it."
            className={`${inputClass} resize-y`}
          />
        </label>

        {error ? (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-hot/30 bg-hot-soft px-3 py-2.5 text-sm text-hot sm:col-span-2">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 sm:col-span-2">
          <p className="text-xs text-muted" aria-live="polite">
            {loading ? "Analysis can take up to a minute." : ""}
          </p>
          <div className="flex gap-2">
            <Link href="/" className={btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? <SpinnerIcon className="size-4 motion-safe:animate-spin" /> : null}
              {loading ? "Analyzing…" : "Analyze lead"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
