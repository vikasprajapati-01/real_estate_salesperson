import type { Priority } from "@/lib/types";

// Tailwind needs complete class names, so each variant is written out in full.
export const PRIORITY_STYLE: Record<Priority, { label: string; text: string; badge: string; dot: string }> = {
  hot: { label: "Hot", text: "text-hot", badge: "bg-hot-soft text-hot", dot: "bg-hot" },
  warm: { label: "Warm", text: "text-warm", badge: "bg-warm-soft text-warm", dot: "bg-warm" },
  cold: { label: "Cold", text: "text-cold", badge: "bg-cold-soft text-cold", dot: "bg-cold" },
};
