"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRightIcon, BellIcon, InboxIcon, MapPinIcon, PlusIcon, SpinnerIcon, WalletIcon, AlertIcon } from "@/components/icons";
import ScoreRing from "@/components/ScoreRing";
import { PRIORITY_STYLE } from "@/components/priority";
import { btnPrimary, btnSecondary, card } from "@/components/ui";
import { dueDate } from "@/lib/ics";
import { clearLeads, getLeads, saveLead } from "@/lib/store";
import type { Analysis, Lead, LeadInput, Priority } from "@/lib/types";

const SAMPLES: LeadInput[] = [
  {
    name: "Asha Mehta",
    location: "Hinjewadi, Pune",
    requirement: "2 BHK for a family",
    budget: "80 lakh",
    timeline: "Within 2 months",
    message:
      "Looking for a 2 BHK near Hinjewadi for my family. Budget is about 80 lakh. We can visit this weekend if you have ready options.",
  },
  {
    name: "Rahul Deshmukh",
    location: "Baner, Pune",
    requirement: "3 BHK",
    budget: "1.2 crore",
    timeline: "4 to 5 months",
    message:
      "We are comparing 3 BHK options in Baner. Budget is around 1.2 crore. Not in a rush, maybe 4 to 5 months. Please send a few listings.",
  },
  {
    name: "Kiran Shah",
    location: "Pune",
    requirement: "Not sure",
    budget: "",
    timeline: "",
    message: "Hi, just browsing flats in Pune. Not sure about budget or when I would buy.",
  },
];

const PRIORITY_ORDER: Priority[] = ["hot", "warm", "cold"];

function dueFollowUps(leads: Lead[], now: number) {
  const cutoff = new Date(now);
  cutoff.setHours(23, 59, 59, 999);
  return leads
    .flatMap((lead) =>
      lead.followUps
        .filter((followUp) => !followUp.done && dueDate(lead, followUp.dayOffset).getTime() <= cutoff.getTime())
        .map((followUp) => ({
          key: `${lead.id}-${followUp.id}`,
          leadId: lead.id,
          name: lead.input.name,
          action: followUp.action,
          due: dueDate(lead, followUp.dayOffset),
        })),
    )
    .sort((a, b) => a.due.getTime() - b.due.getTime());
}

async function analyze(input: LeadInput): Promise<Analysis> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { analysis?: Analysis; error?: string };
  if (!res.ok || !data.analysis) {
    throw new Error(data.error || "Analysis failed, please retry");
  }
  return data.analysis;
}

function toLead(input: LeadInput, analysis: Analysis): Lead {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    input,
    analysis,
    followUps: analysis.followUps.map((followUp) => ({
      ...followUp,
      id: crypto.randomUUID(),
      done: false,
    })),
    chat: [],
  };
}

export default function HomePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLeads(getLeads());
    setNow(Date.now());
  }, []);

  async function loadSamples() {
    setLoading(true);
    setError(null);
    try {
      for (let i = 0; i < SAMPLES.length; i++) {
        setProgress(`Analyzing ${i + 1} of ${SAMPLES.length}…`);
        const analysis = await analyze(SAMPLES[i]);
        saveLead(toLead(SAMPLES[i], analysis));
        setLeads(getLeads());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed, please retry");
      setLeads(getLeads());
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  function clearAll() {
    if (!window.confirm(`Delete all ${leads.length} leads? This cannot be undone.`)) return;
    clearLeads();
    setLeads([]);
  }

  const ready = now !== null;
  const due = now === null ? [] : dueFollowUps(leads, now);
  const startOfToday = now === null ? 0 : new Date(now).setHours(0, 0, 0, 0);
  const hotCount = leads.filter((lead) => lead.analysis.priority === "hot").length;

  let subtitle = "Follow up on what is due, then work the hottest leads first.";
  if (ready && leads.length === 0) subtitle = "Add a lead to get a score and a follow-up plan.";
  else if (ready) subtitle = `${leads.length} ${leads.length === 1 ? "lead" : "leads"} in your pipeline, ${hotCount} marked hot.`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {leads.length > 0 && !loading ? (
            <button type="button" onClick={clearAll} className={`${btnSecondary} text-hot`}>
              Clear all
            </button>
          ) : null}
          <button type="button" onClick={loadSamples} disabled={loading} className={btnSecondary}>
            {loading ? <SpinnerIcon className="size-4 motion-safe:animate-spin" /> : null}
            {progress ?? "Load sample leads"}
          </button>
        </div>
      </header>
      {loading ? (
        <p role="status" className="text-sm text-muted">
          This can take a few seconds per lead, and up to a minute if the AI service is busy. Please keep this page open.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-hot/30 bg-hot-soft px-3 py-2.5 text-sm text-hot">
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <section
        aria-labelledby="due-heading"
        className={`rounded-xl border p-4 sm:p-5 ${due.length > 0 ? "border-primary/30 bg-primary-soft" : "border-line bg-surface shadow-card"}`}
      >
        <div className="flex items-center gap-2">
          <BellIcon className={`size-4 ${due.length > 0 ? "text-primary-ink" : "text-muted"}`} />
          <h2 id="due-heading" className={`text-sm font-semibold ${due.length > 0 ? "text-primary-ink" : "text-ink"}`}>
            Follow-ups due today{due.length > 0 ? ` (${due.length})` : ""}
          </h2>
        </div>
        {due.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted">Nothing is due. Follow-ups appear here when they come due.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-primary/15">
            {due.map((item) => (
              <li key={item.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {item.name}
                    {item.due.getTime() < startOfToday ? (
                      <span className="ml-2 rounded-full bg-warm-soft px-2 py-0.5 text-xs font-semibold text-warm">Overdue</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">{item.action}</p>
                </div>
                <Link href={`/leads/${item.leadId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-ink hover:underline">
                  Open lead
                  <ChevronRightIcon className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!ready ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 rounded-xl border border-line bg-surface motion-safe:animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className={`${card} flex flex-col items-center px-6 py-14 text-center`}>
          <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary-ink">
            <InboxIcon className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">No leads yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Add your first lead to get a score and a follow-up plan, or load three sample leads to see how it works.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/leads/new" className={btnPrimary}>
              <PlusIcon className="size-4" />
              Add a lead
            </Link>
            <button type="button" onClick={loadSamples} disabled={loading} className={btnSecondary}>
              Load sample leads
            </button>
          </div>
        </div>
      ) : (
        PRIORITY_ORDER.map((priority) => {
          const group = leads.filter((lead) => lead.analysis.priority === priority);
          if (group.length === 0) return null;
          const style = PRIORITY_STYLE[priority];
          return (
            <section key={priority} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className={`size-2.5 rounded-full ${style.dot}`} />
                {style.label}
                <span className="font-normal text-muted">{group.length}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className={`${card} group flex flex-col gap-3 p-4 transition-colors hover:border-primary`}
                  >
                    <div className="flex items-start gap-3">
                      <ScoreRing score={lead.analysis.score} priority={priority} size={44} compact />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold">{lead.input.name}</h3>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPinIcon className="size-3.5 shrink-0" />
                            <span className="truncate">{lead.input.location || "No location"}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <WalletIcon className="size-3.5 shrink-0" />
                            {lead.input.budget || "No budget"}
                          </span>
                        </p>
                      </div>
                      <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted group-hover:text-primary-ink" />
                    </div>
                    <p className="line-clamp-2 text-sm">{lead.analysis.summary}</p>
                    <p className="mt-auto line-clamp-2 rounded-lg bg-sunken px-3 py-2 text-sm text-muted">
                      <span className="font-semibold text-ink">Next: </span>
                      {lead.analysis.nextAction}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
