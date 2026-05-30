import Link from "next/link";
import { LinkSafetyClient } from "./LinkSafetyClient";

export const metadata = { title: "Link Safety" };

export default function LinkSafetyPage() {
  return (
    <>
      {/* Sub-nav: Safety | Abuse */}
      <div className="flex items-center gap-1 mb-6 border-b border-border pb-3">
        <Link
          href="/dashboard/link-safety"
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary/10 text-primary"
        >
          Safety Overview
        </Link>
        <Link
          href="/dashboard/link-safety/abuse"
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Abuse Dashboard
        </Link>
      </div>
      <LinkSafetyClient />
    </>
  );
}
