"use client";

import { Users, Smartphone, Monitor, Globe, Hash, ExternalLink } from "lucide-react";

interface Stat {
  label: string;
  percentage: number;
}

interface PlatformSplit {
  platform: string;
  percentage: number;
}

interface AudienceProfileProps {
  data: {
    topDevice: Stat;
    topBrowser: Stat;
    topOs: Stat;
    topCountry: Stat;
    topReferrer: Stat;
    mobileShare: number;
    desktopShare: number;
    platformSplit: PlatformSplit[];
    summary: string;
  } | undefined;
  isLoading?: boolean;
}

interface StatRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  percentage: number;
}

function StatRow({ icon: Icon, label, value, percentage }: StatRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <span className="text-xs font-semibold text-slate-900">{value}</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function AudienceProfile({ data, isLoading }: AudienceProfileProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="h-6 w-full rounded bg-slate-100" />
          <div className="h-6 w-full rounded bg-slate-100" />
          <div className="h-6 w-3/4 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500 text-center py-4">No audience data available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold text-slate-900">Audience Profile</h3>
      </div>

      <div className="space-y-3">
        <StatRow icon={Smartphone} label="Primary Device" value={data.topDevice.label} percentage={data.topDevice.percentage} />
        <StatRow icon={Globe} label="Top Browser" value={data.topBrowser.label} percentage={data.topBrowser.percentage} />
        <StatRow icon={Hash} label="Operating System" value={data.topOs.label} percentage={data.topOs.percentage} />
        <StatRow icon={Globe} label="Top Country" value={data.topCountry.label} percentage={data.topCountry.percentage} />
        <StatRow icon={ExternalLink} label="Top Referrer" value={data.topReferrer.label} percentage={data.topReferrer.percentage} />
      </div>

      {/* Platform split */}
      <div className="mt-4">
        <p className="text-xs font-medium text-slate-500 mb-2">Platform Split</p>
        <div className="flex gap-1 h-2.5 rounded-full overflow-hidden">
          {data.platformSplit.map((p) => (
            <div
              key={p.platform}
              className="h-full transition-all first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${p.percentage}%`,
                backgroundColor: p.platform === "Mobile" ? "#8b5cf6" : p.platform === "Desktop" ? "#3b82f6" : "#94a3b8",
              }}
              title={`${p.platform}: ${p.percentage}%`}
            />
          ))}
        </div>
        <div className="flex gap-4 mt-1.5">
          {data.platformSplit.map((p) => (
            <span key={p.platform} className="text-[10px] text-slate-500">
              {p.platform} {p.percentage}%
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{data.summary}</p>
    </div>
  );
}
