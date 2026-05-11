"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Clock, 
  Navigation,
  ArrowRight,
  Activity
} from "lucide-react";

interface Click {
  ip: string;
  country: string;
  city: string;
  device: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  browser: string;
  os: string;
  referrer: string;
  ts: number;
}

interface RealtimeStats {
  today: number;
  total: number;
}

export function RealtimeClicks({ slug }: { slug: string }) {
  const [clicks, setClicks] = useState<Click[]>([]);
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRealtimeData = async () => {
      try {
        const res = await fetch(`/api/analytics/realtime?slug=${slug}`);
        const result = await res.json();
        
        if (result.success) {
          setClicks(result.data.recentClicks);
          setStats(result.data.stats);
        }
      } catch (err) {
        console.error("Failed to fetch realtime data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 5000); // Poll every 5s

    return () => clearInterval(interval);
  }, [slug]);

  const getDeviceIcon = (device: Click["device"]) => {
    switch (device) {
      case "mobile": return <Smartphone className="h-4 w-4" />;
      case "tablet": return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoading && clicks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading live data...</p>
        </div>
      </div>
    );
  }

    return (
    <div className="space-y-8">
      {/* Realtime Stats Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-white/5 p-4 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Today</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.today || 0}</div>
          <div className="absolute -right-2 -bottom-2 opacity-5 transition-transform group-hover:scale-110">
            <Activity className="h-16 w-16" />
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-4 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-violet-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total (Live)</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
          <div className="absolute -right-2 -bottom-2 opacity-5 transition-transform group-hover:scale-110">
            <Globe className="h-16 w-16" />
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-4 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Mobile %</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {clicks.length > 0 
              ? Math.round((clicks.filter(c => c.device === 'mobile').length / clicks.length) * 100) 
              : 0}%
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-4 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="h-4 w-4 text-orange-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Direct %</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {clicks.length > 0 
              ? Math.round((clicks.filter(c => !c.referrer).length / clicks.length) * 100) 
              : 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Live Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              Live Activity
            </h4>
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Recent 50</span>
          </div>

          {clicks.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-zinc-500 bg-white/[0.02]">
              <Navigation className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">Waiting for first clicks...</p>
            </div>
          ) : (
            <div className="relative space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
              <AnimatePresence initial={false}>
                {clicks.map((click, idx) => (
                  <motion.div
                    key={click.ts}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-[#141418] p-3 transition-colors hover:bg-white/5 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 group-hover:bg-violet-500/10 group-hover:text-violet-400 transition-colors">
                        {getDeviceIcon(click.device)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white truncate max-w-[120px]">
                            {click.city ? `${click.city}, ` : ''}{click.country || "Unknown"}
                          </span>
                          <span className="text-[10px] text-zinc-600">|</span>
                          <span className="text-[10px] text-zinc-500 truncate">{click.os} • {click.browser}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500">
                          {click.referrer ? (
                            <span className="truncate opacity-60">from {click.referrer.replace(/^https?:\/\//, '')}</span>
                          ) : (
                            <span className="opacity-40 italic">Direct access</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono">
                      {new Date(click.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Top Referrers (derived from recent 50) */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-white">Top Referrers</h4>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            {clicks.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-zinc-600">
                No referrers yet
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  clicks.reduce((acc, click) => {
                    const ref = click.referrer ? new URL(click.referrer).hostname : "Direct";
                    acc[ref] = (acc[ref] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([name, count]) => (
                    <div key={name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300 truncate max-w-[200px]">{name}</span>
                        <span className="text-zinc-500 font-medium">{count}</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / clicks.length) * 100}%` }}
                          className="h-full bg-violet-500/50 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <h4 className="text-sm font-semibold text-white pt-2">Top Countries</h4>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            {clicks.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-zinc-600">
                No location data yet
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  clicks.reduce((acc, click) => {
                    const country = click.country || "Unknown";
                    acc[country] = (acc[country] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-2.5 py-1">
                      <span className="text-[10px] font-medium text-white">{name}</span>
                      <span className="text-[10px] text-zinc-500">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

