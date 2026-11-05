import { Lead } from "./types";

const KEY = "lead-copilot:leads";

export function getLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const leads: Lead[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return leads.sort((a, b) => b.analysis.score - a.analysis.score);
  } catch {
    return [];
  }
}

export function getLead(id: string): Lead | undefined {
  return getLeads().find((l) => l.id === id);
}

export function saveLead(lead: Lead) {
  const rest = getLeads().filter((l) => l.id !== lead.id);
  localStorage.setItem(KEY, JSON.stringify([...rest, lead]));
}

export function deleteLead(id: string) {
  localStorage.setItem(KEY, JSON.stringify(getLeads().filter((l) => l.id !== id)));
}