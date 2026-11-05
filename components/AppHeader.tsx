import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { PlusIcon, TargetIcon } from "@/components/icons";
import { btnPrimary } from "@/components/ui";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg">
            <TargetIcon className="size-[18px]" />
          </span>
          Lead Copilot
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/leads/new" className={`${btnPrimary} h-9`}>
            <PlusIcon className="size-4" />
            New lead
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
