import type { LeadStatus } from "./types";

export const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "visit_booked", label: "Visit booked" },
  { value: "closed", label: "Closed" },
];

export function statusLabel(status?: LeadStatus) {
  return STATUSES.find((s) => s.value === (status ?? "new"))?.label ?? "New";
}