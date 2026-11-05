import { Lead } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function dueDate(lead: Lead, dayOffset: number) {
  const d = new Date(lead.createdAt);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(10, 0, 0, 0);
  return d;
}

export function buildIcs(lead: Lead) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const events = lead.followUps
    .filter((f) => !f.done)
    .map((f) => {
      const start = dueDate(lead, f.dayOffset);
      const end = new Date(start.getTime() + 15 * 60000);
      return [
        "BEGIN:VEVENT",
        `UID:${lead.id}-${f.id}@lead-copilot`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${esc(`${f.channel.toUpperCase()}: ${lead.input.name} - ${f.action}`)}`,
        `DESCRIPTION:${esc(f.message)}`,
        "END:VEVENT",
      ].join("\r\n");
    });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//lead-copilot//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

export function downloadIcs(lead: Lead) {
  const blob = new Blob([buildIcs(lead)], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${lead.input.name}-followups.ics`;
  a.click();
}