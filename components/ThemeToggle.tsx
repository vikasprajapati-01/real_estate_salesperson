"use client";

import { MoonIcon, SunIcon } from "@/components/icons";

export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* storage unavailable: the theme still changes for this visit */
    }
  }

  // Both icons are rendered and CSS shows the right one, so the server and
  // client markup always match (no hydration flicker).
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
      className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink transition-colors hover:border-line-strong hover:bg-sunken"
    >
      <SunIcon className="hidden size-[18px] dark:block" />
      <MoonIcon className="size-[18px] dark:hidden" />
    </button>
  );
}
