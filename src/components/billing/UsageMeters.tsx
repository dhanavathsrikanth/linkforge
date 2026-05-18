import { PlanKey, PLANS } from "@/lib/billing/plans";

type UsageSummary = Record<string, { current: number; limit: number; allowed: boolean }>;

export function UsageMeters({ summary, plan }: { summary: UsageSummary; plan: PlanKey }) {
  const planData = PLANS[plan] || PLANS.free;
  
  const limitLabels: Record<string, string> = {
    linksPerMonth: "Short Links",
    clicksTrackedPerMonth: "Clicks Tracked",
    customDomains: "Custom Domains",
    teamMembers: "Team Members",
    bioPages: "Link in Bio Pages",
    qrCodesPerMonth: "QR Codes",
  };

  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const daysUntilReset = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(summary).map(([key, data]) => {
          if (!limitLabels[key]) return null;
          
          const isUnlimited = data.limit === -1;
          const percentage = isUnlimited ? 0 : Math.min(100, Math.round((data.current / data.limit) * 100));
          
          let color = "bg-green-500";
          if (!isUnlimited) {
            if (percentage >= 90) color = "bg-red-500";
            else if (percentage >= 70) color = "bg-amber-500";
          }

          return (
            <div key={key} className="bg-background border border-border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-foreground">{limitLabels[key]}</span>
                {isUnlimited ? (
                  <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">Unlimited</span>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {data.current} of {data.limit} used
                  </span>
                )}
              </div>
              
              {!isUnlimited && (
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${color} transition-all duration-500`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        Monthly limits reset in {daysUntilReset} days
      </p>
    </div>
  );
}
