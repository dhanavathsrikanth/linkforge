import { PlanKey, PLANS } from "@/lib/billing/plans";
import Link from "next/link";

const colors: Record<PlanKey, string> = {
  free: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/70",
  growth: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/70",
  agency: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/70",
  business: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/70",
};

export function PlanBadge({ plan, asLink = false }: { plan: string; asLink?: boolean }) {
  const planKey = (plan || 'free') as PlanKey;
  const planData = PLANS[planKey];
  if (!planData) return null;

  const content = (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors ${colors[planKey]}`}>
      {planData.name}
    </span>
  );

  if (asLink) {
    return <Link href="/dashboard/settings/billing">{content}</Link>;
  }
  return content;
}
