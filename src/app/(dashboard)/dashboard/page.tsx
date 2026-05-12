"use client";

import {
  ArrowUpRight, ArrowDownRight, BarChart3, Copy, ExternalLink,
  Globe2, Link2, MousePointerClick, Plus, QrCode, TrendingUp,
  Activity, MoreHorizontal, Download, Filter, CheckCircle2,
  Clock, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

/* ── static data ─────────────────────────────────────────────────── */
const metrics = [
  { label: "Total Links",     value: "128",    change: "+12.5%", trend: "up",   delta: "15 this month",   icon: Link2,           gradient: "from-[#433BFF] to-[#7C6BFF]" },
  { label: "Total Clicks",    value: "24,839", change: "+18.2%", trend: "up",   delta: "vs last month",   icon: MousePointerClick,gradient: "from-[#27CE7A] to-[#22B566]"  },
  { label: "Active Domains",  value: "6",      change: "+2",     trend: "up",   delta: "domains verified",icon: Globe2,           gradient: "from-[#F59E0B] to-[#F97316]"  },
  { label: "Avg. CTR",        value: "8.4%",   change: "-0.3%",  trend: "down", delta: "vs last week",    icon: Activity,         gradient: "from-[#EC4899] to-[#A855F7]"  },
];

const links = [
  { id:1, title:"Product Launch",  shortUrl:"forge.link/launch",  dest:"acme.com/products/v2",   clicks:8234, status:"active", created:"May 10, 2026" },
  { id:2, title:"Pricing Campaign",shortUrl:"forge.link/pricing", dest:"acme.com/pricing",       clicks:5102, status:"active", created:"May 7, 2026"  },
  { id:3, title:"Docs Portal",     shortUrl:"forge.link/docs",    dest:"docs.acme.com",           clicks:2981, status:"active", created:"May 4, 2026"  },
  { id:4, title:"Twitter Bio",     shortUrl:"forge.link/t",       dest:"twitter.com/acme",        clicks:1204, status:"active", created:"Apr 28, 2026" },
  { id:5, title:"Newsletter",      shortUrl:"forge.link/news",    dest:"acme.com/newsletter",     clicks:887,  status:"paused", created:"Apr 20, 2026" },
];

const activity = [
  { label:"forge.link/launch reached 8K clicks", time:"2m ago",  icon:TrendingUp,   color:"#27CE7A" },
  { label:"New domain go.acme.com verified",      time:"1h ago",  icon:CheckCircle2, color:"#433BFF" },
  { label:"QR code for /pricing downloaded",      time:"3h ago",  icon:QrCode,       color:"#7C6BFF" },
  { label:"forge.link/news paused manually",      time:"5h ago",  icon:Clock,        color:"#F59E0B" },
  { label:"Campaign report exported",             time:"1d ago",  icon:Download,     color:"#94A3B8" },
];

const bars = [38, 62, 48, 80, 70, 95, 57, 74, 82, 91, 65, 85];
const barLabels = ["Feb","","","Mar","","","Apr","","","May","",""];

function fmt(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }

/* ── Metric Card ─────────────────────────────────────────────────── */
function MetricCard({ label, value, change, trend, delta, icon: Icon, gradient }: typeof metrics[0]) {
  const up = trend === "up";
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 30px -8px rgba(67,59,255,0.15)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
    >
      {/* subtle gradient wash top-right */}
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] blur-xl`} />

      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>

      <div>
        <p className="text-[28px] font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
            up ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-600 ring-red-200"
          }`}>
            {up ? <ArrowUpRight className="h-3 w-3"/> : <ArrowDownRight className="h-3 w-3"/>}
            {change}
          </span>
          <span className="text-xs text-slate-400">{delta}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Status Badge ────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"/>Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400"/>Paused
    </span>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [copied, setCopied] = useState<number|null>(null);
  const [activeRange, setActiveRange] = useState("1M");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";

  function copyUrl(id: number, url: string) {
    navigator.clipboard.writeText("https://" + url);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8 space-y-6">

        {/* ── Page header ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {greeting}, {firstName} 👋
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
              <Filter className="h-3.5 w-3.5 text-slate-400"/>Filter
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
              <Download className="h-3.5 w-3.5 text-slate-400"/>Export
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/dashboard/links/new")}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#433BFF] px-4 text-sm font-semibold text-white shadow-md shadow-[#433BFF]/30 hover:bg-[#3730E8] transition-colors"
            >
              <Plus className="h-4 w-4"/>Create Link
            </motion.button>
          </div>
        </motion.div>

        {/* ── Metric cards ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.4 }}
            >
              <MetricCard {...m} />
            </motion.div>
          ))}
        </motion.div>

        {/* ── Main grid ─────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">

          {/* LEFT */}
          <div className="flex flex-col gap-5">

            {/* Chart card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">Click Performance</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Last 12 weeks · All links</p>
                </div>
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
                  {["1W","1M","3M"].map(r => (
                    <button
                      key={r}
                      onClick={() => setActiveRange(r)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                        activeRange === r
                          ? "bg-[#433BFF] text-white shadow-sm shadow-[#433BFF]/30"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-4 pt-5">
                {/* Summary row */}
                <div className="mb-6 flex items-stretch gap-6 divide-x divide-slate-100">
                  {[
                    { label:"Total Clicks", val:"24,839", sub:"all links" },
                    { label:"Avg / Week",   val:"2,070",  sub:"per week" },
                    { label:"Peak Day",     val:"Friday", sub:"best day" },
                  ].map(({ label, val, sub }) => (
                    <div key={label} className="flex flex-col gap-0.5 pl-6 first:pl-0">
                      <p className="text-xs font-medium text-slate-400">{label}</p>
                      <p className="text-xl font-bold tabular-nums text-slate-900">{val}</p>
                      <p className="text-[11px] text-slate-400">{sub}</p>
                    </div>
                  ))}
                  <div className="ml-auto flex items-center pl-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <Zap className="h-3 w-3 fill-emerald-600 stroke-none"/>+18.2% vs prev
                    </span>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="relative">
                  {/* Y-axis gridlines */}
                  <div className="absolute inset-x-0 top-0 flex flex-col justify-between h-[100px]">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="w-full border-t border-slate-100 border-dashed"/>
                    ))}
                  </div>
                  <div className="relative flex h-[100px] items-end gap-1.5">
                    {bars.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ scaleY: 0, originY: 1 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.3 + i * 0.04, duration: 0.4, ease: "easeOut" }}
                        className="group relative flex flex-1 flex-col items-center"
                        style={{ height: `${h}%` }}
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                          {Math.round(h * 260)} clicks
                        </div>
                        <div
                          className="w-full rounded-t-md transition-all duration-200"
                          style={{
                            height: "100%",
                            background: i === 5
                              ? "linear-gradient(to top, #433BFF, #7C6BFF)"
                              : "linear-gradient(to top, #DEDCFF, #E8E6FF)",
                            boxShadow: i === 5 ? "0 -2px 8px rgba(67,59,255,0.35)" : "none",
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-between">
                  {barLabels.map((l, i) => (
                    <span key={i} className="flex-1 text-center text-[10px] text-slate-300">{l}</span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Links table */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.4 }}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">Links</h2>
                  <p className="mt-0.5 text-xs text-slate-400">All short links in this workspace</p>
                </div>
                <button
                  onClick={() => router.push("/dashboard/links")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#433BFF] hover:text-[#3730E8] transition-colors"
                >
                  View all <ArrowUpRight className="h-3.5 w-3.5"/>
                </button>
              </div>

              {/* Column labels */}
              <div className="grid grid-cols-[2fr_1.5fr_80px_100px_80px] border-b border-slate-100 bg-slate-50/60 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Link</span><span>Destination</span>
                <span className="text-right">Clicks</span>
                <span className="text-center">Status</span>
                <span/>
              </div>

              <div className="divide-y divide-slate-100">
                {links.map((link, idx) => (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + idx * 0.05 }}
                    className="group grid grid-cols-[2fr_1.5fr_80px_100px_80px] items-center px-6 py-4 transition-colors hover:bg-slate-50/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#433BFF] to-[#7C6BFF] shadow-sm shadow-[#433BFF]/20">
                        <Link2 className="h-4 w-4 text-white"/>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{link.title}</p>
                        <p className="truncate text-xs font-medium text-[#433BFF]">{link.shortUrl}</p>
                      </div>
                    </div>
                    <p className="truncate pr-4 text-xs text-slate-500">{link.dest}</p>
                    <p className="text-right text-sm font-bold tabular-nums text-slate-900">{fmt(link.clicks)}</p>
                    <div className="flex justify-center">
                      <StatusBadge status={link.status}/>
                    </div>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyUrl(link.id, link.shortUrl)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-[#433BFF]/40 hover:text-[#433BFF] transition-colors shadow-xs"
                      >
                        {copied === link.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/> : <Copy className="h-3.5 w-3.5"/>}
                      </button>
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-[#433BFF]/40 hover:text-[#433BFF] transition-colors shadow-xs">
                        <ExternalLink className="h-3.5 w-3.5"/>
                      </button>
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 transition-colors shadow-xs">
                        <MoreHorizontal className="h-3.5 w-3.5"/>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination footer */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-6 py-3">
                <p className="text-xs text-slate-400">Showing <span className="font-semibold text-slate-600">5</span> of <span className="font-semibold text-slate-600">128</span> links</p>
                <div className="flex items-center gap-1">
                  {[1,2,3,"…",12].map((p,i) => (
                    <button key={i} className={`flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5 text-xs font-semibold transition-colors ${
                      p===1 ? "bg-[#433BFF] text-white shadow-sm shadow-[#433BFF]/30" : "text-slate-500 hover:bg-slate-100"
                    }`}>{p}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT column */}
          <div className="flex flex-col gap-5">

            {/* Quick actions */}
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-slate-900">Quick Actions</h2>
              </div>
              <div className="flex flex-col gap-2 p-4">
                {[
                  { label:"New Short Link",  sub:"Create a branded link",     icon:Plus,       grad:"from-[#433BFF] to-[#7C6BFF]", action:"/dashboard/links/new"   },
                  { label:"Generate QR Code",sub:"Scannable for any URL",     icon:QrCode,     grad:"from-[#27CE7A] to-[#22B566]", action:"/dashboard/qr/new"     },
                  { label:"View Analytics",  sub:"Clicks, geo & devices",     icon:BarChart3,  grad:"from-[#F59E0B] to-[#F97316]", action:"/dashboard/analytics"  },
                ].map(({ label, sub, icon: Icon, grad, action }) => (
                  <motion.button
                    key={label}
                    whileHover={{ x: 2 }}
                    onClick={() => router.push(action)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left transition-all hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} shadow-sm`}>
                      <Icon className="h-4 w-4 text-white"/>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
                    </div>
                    <ArrowUpRight className="ml-auto h-4 w-4 text-slate-300"/>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Activity feed */}
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28, duration: 0.4 }}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-slate-900">Recent Activity</h2>
              </div>
              <div className="relative p-5">
                <div className="absolute left-[32px] top-8 h-[calc(100%-48px)] w-px bg-gradient-to-b from-slate-200 to-transparent"/>
                <div className="flex flex-col gap-5">
                  {activity.map(({ label, time, icon: Icon, color }, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.07 }}
                      className="relative flex items-start gap-4"
                    >
                      <div
                        className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: color + "18" }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color }}/>
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs font-medium leading-snug text-slate-700">{label}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Upgrade card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.4 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#433BFF] via-[#5B55FF] to-[#7C6BFF] p-5 text-white shadow-lg shadow-[#433BFF]/25"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-sm"/>
              <div className="absolute -bottom-6 right-4 h-20 w-20 rounded-full bg-white/5"/>
              <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.08),transparent_60%)]"/>
              <div className="relative">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                  <Zap className="h-3 w-3 fill-white stroke-none"/> Pro Plan
                </span>
                <p className="mt-3 text-sm font-semibold leading-snug">
                  Unlock unlimited links, custom domains & advanced analytics
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#433BFF] shadow-sm hover:bg-[#DEDCFF] transition-colors">
                    Upgrade Plan
                  </button>
                  <button className="text-xs font-medium text-white/60 hover:text-white transition-colors">
                    Learn more →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
