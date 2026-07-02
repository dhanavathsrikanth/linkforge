"use client";

interface AnalyticsListProps {
  data: {
    label: string;
    clicks: number;
    percentage: number;
  }[];
  isLoading?: boolean;
  type: "device" | "browser" | "os" | "city" | "region";
}

const deviceIcons: Record<string, string> = {
  desktop: "M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 14h16M8 20h8",
  mobile: "M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 18h.01",
  tablet: "M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 18h.01",
  unknown: "M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0",
};

const browserIcons: Record<string, string> = {
  Chrome: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z",
  Safari: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4l4 6H8l4-6z",
  Firefox: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z",
  Edge: "M12 2a10 10 0 100 20 10 10 0 000-20zm-2 6h4v4h-4v-4z",
  Opera: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z",
  Other: "M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0",
};

const osIcons: Record<string, string> = {
  windows: "M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z",
  macos: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 15l-1 1-1-1v-3l1-1 1 1v3zm4 0l-1 1-1-1v-3l1-1 1 1v3z",
  android: "M6 18c0 .6.4 1 1 1h1v3c0 .6.4 1 1 1s1-.4 1-1v-3h2v3c0 .6.4 1 1 1s1-.4 1-1v-3h1c.6 0 1-.4 1-1V8H6v10zM3.5 8C2.7 8 2 8.7 2 9.5v7c0 .8.7 1.5 1.5 1.5S5 17.3 5 16.5v-7C5 8.7 4.3 8 3.5 8zm17 0c-.8 0-1.5.7-1.5 1.5v7c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-7c0-.8-.7-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.5 0-.7s-.5-.2-.7 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.5-.2-.7 0s-.2.5 0 .7l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z",
  ios: "M18.7 19.5c-.8 1.2-1.6 2.4-2.9 2.4-1.3 0-1.7-.8-3.2-.8s-1.9.8-3.1.8c-1.3 0-2.1-1.3-2.9-2.4C4.2 16.5 3 12.9 3 9.8c0-3.6 2.3-5.5 4.6-5.5 1.4 0 2.7.9 3.5.9.7 0 2.1-1.1 3.7-.9.6 0 2.4.3 3.6 2.1-3.1 1.8-2.6 6.4.4 7.8-.5 1.4-1 2.8-1.8 4.3zM13 3.5c.7-.8 1.2-1.9 1-3.1-1.2.1-2.4.7-3.1 1.5-.7.8-1.2 2-1 3.1 1.3 0 2.5-.6 3.1-1.5z",
  linux: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 4a2 2 0 110 4 2 2 0 010-4zm-4 8h8v2H8v-2z",
};

const deviceLabels: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Unknown",
};

function DeviceIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    desktop: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    ),
    mobile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
    tablet: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  };
  return icons[type] || (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v.01" />
      <path d="M12 8v4" />
    </svg>
  );
}

function BrowserIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    Chrome: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 8h8.5a10 10 0 00-5.3-4.6L12 12z" />
      </svg>
    ),
    Safari: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M16.24 7.76l-5.28 5.28-3.04-1.04 5.28-5.28 3.04 1.04z" />
      </svg>
    ),
    Firefox: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </svg>
    ),
    Edge: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12a4 4 0 118 0" />
        <path d="M12 8v8" />
      </svg>
    ),
  };
  return icons[type] || (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v.01" />
      <path d="M12 8v4" />
    </svg>
  );
}

function OsIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    windows: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
      </svg>
    ),
    macos: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" />
        <path d="M8.5 12.5l2 2 5-5" />
      </svg>
    ),
    android: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0012 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
      </svg>
    ),
    ios: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    linux: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12.504 0c-.155 0-.311.015-.466.045C9.902.377 8.39 2.3 8.39 4.588v2.09H6.23c-1.034 0-1.87.837-1.87 1.87v.918c0 .95.698 1.74 1.608 1.887v5.783C5.968 18.64 7.93 20.5 10.345 20.5h3.31c2.416 0 4.377-1.86 4.377-3.447V8.823c.91-.147 1.608-.937 1.608-1.887V6.02c0-1.033-.836-1.87-1.87-1.87H15.96v-2.09c0-1.44-1.01-2.64-2.36-2.91a4.266 4.266 0 00-.478-.045h-.618z" />
      </svg>
    ),
  };
  return icons[type] || (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v.01" />
      <path d="M12 8v4" />
    </svg>
  );
}

function CityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-4h6v4" />
      <path d="M9 9h1" />
      <path d="M14 9h1" />
      <path d="M9 13h1" />
      <path d="M14 13h1" />
    </svg>
  );
}

function RegionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function AnalyticsList({ data, isLoading, type }: AnalyticsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 animate-pulse rounded bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-2 w-full animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-500">No data available</div>;
  }

  const maxClicks = Math.max(...data.map((d) => d.clicks));

  const getIcon = (label: string) => {
    switch (type) {
      case "device": return <DeviceIcon type={label.toLowerCase()} />;
      case "browser": return <BrowserIcon type={label} />;
      case "os": return <OsIcon type={label.toLowerCase()} />;
      case "city": return <CityIcon />;
      case "region": return <RegionIcon />;
      default: return null;
    }
  };

  const getDisplayName = (label: string) => {
    if (type === "device") return deviceLabels[label.toLowerCase()] || label;
    return label;
  };

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="text-slate-500">
            {getIcon(item.label)}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">
                {getDisplayName(item.label)}
              </span>
              <span className="text-sm text-slate-500">{item.clicks.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.clicks / maxClicks) * 100}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              />
            </div>
          </div>
          <span className="text-sm text-slate-500 w-12 text-right">{item.percentage}%</span>
        </div>
      ))}
    </div>
  );
}
