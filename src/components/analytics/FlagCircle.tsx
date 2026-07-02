"use client";

interface FlagCircleProps {
  countryCode: string;
  size?: number;
  className?: string;
}

export function FlagCircle({ countryCode, size = 28, className = "" }: FlagCircleProps) {
  if (!countryCode || countryCode === "Unknown" || countryCode === "XX") {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-slate-100 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-slate-400">🌍</span>
      </div>
    );
  }

  const code = countryCode.toLowerCase().slice(0, 2);
  const flagUrl = `https://flagcdn.com/w80/${code}.png`;

  return (
    <img
      src={flagUrl}
      alt={`${code} flag`}
      width={size}
      height={size}
      className={`inline-block rounded-full object-cover shadow-sm ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
