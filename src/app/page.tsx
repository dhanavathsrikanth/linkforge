"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from "framer-motion";
import {
  Zap, Shield, Users, BarChart3, QrCode, Link2, FolderOpen,
  TrendingUp, Globe, Clock, CheckCircle2, ArrowRight, Play,
  Star, ChevronDown, Sparkles, Lock, Unlock, GitBranch,
  Target, Award, Heart, Building2, Key, Smartphone, Split,
  Database, Code2, Layers, Rocket, ChevronRight, Menu, X,
  MousePointerClick, Eye, Clock3, Share2, Fingerprint, Cpu,
  TrendingDown, Minus, Plus, Infinity as InfinityIcon, Hash, Tag, Timer,
  Crown, ShieldCheck, Headphones, MessageCircle, ArrowUpRight
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 }
  }
};

function AnimatedCounter({ end, duration = 2000, suffix = "", prefix = "" }: {
  end: number; duration?: number; suffix?: string; prefix?: string
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function IsometricCard({ children, className = "", rotation = -12 }: {
  children: React.ReactNode; className?: string; rotation?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: 15, rotateZ: rotation, y: 80, scale: 0.9 }}
      whileInView={{ opacity: 1, rotateX: 0, rotateZ: rotation, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1 }}
      className={`transform-3d ${className}`}
      style={{ perspective: "1200px" }}
    >
      {children}
    </motion.div>
  );
}

function FloatingOrb({ size = 300, color = "violet", className = "" }: {
  size?: number; color?: string; className?: string
}) {
  const colors = {
    violet: "from-violet-600/30 to-purple-600/30",
    blue: "from-blue-600/25 to-cyan-600/25",
    pink: "from-pink-600/20 to-fuchsia-600/20",
  };
  return (
    <motion.div
      animate={{
        y: [0, -40, 0],
        scale: [1, 1.05, 1],
        opacity: [0.4, 0.6, 0.4],
      }}
      transition={{ duration: 8, repeat: Number.MAX_SAFE_INTEGER }}
      className={`absolute rounded-full blur-[100px] bg-gradient-to-br ${colors[color as keyof typeof colors]} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function GlassCard({ children, className = "", hoverGlow = false }: {
  children: React.ReactNode; className?: string; hoverGlow?: boolean
}) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent
      backdrop-blur-2xl border border-white/[0.12]
      shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]
      ${hoverGlow ? "hover:shadow-[0_8px_32px_rgba(124,58,237,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]" : ""}
      transition-all duration-500
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function TrustBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] backdrop-blur-sm"
    >
      <Icon className="w-4 h-4 text-emerald-400" />
      <span className="text-sm text-slate-300 font-medium">{text}</span>
    </motion.div>
  );
}

function ComplianceBadge({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
      <ShieldCheck className="w-4 h-4 text-emerald-400" />
      <span className="text-xs font-medium text-slate-300">{text}</span>
    </div>
  );
}

function TestimonialCard({ name, role, company, quote, metric }: {
  name: string; role: string; company: string; quote: string; metric?: { value: string; label: string }
}) {
  return (
    <GlassCard hoverGlow className="p-6 h-full group">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            {name.charAt(0)}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-900">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-white group-hover:text-violet-300 transition-colors">{name}</p>
          <p className="text-sm text-slate-400">{role}</p>
        </div>
      </div>
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-slate-300 text-sm leading-relaxed mb-4">"{quote}"</p>
      {metric && (
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {metric.value}
            </div>
            <div className="text-xs text-slate-500">{metric.label}</div>
          </div>
        </div>
      )}
      <div className="absolute top-4 right-4 text-slate-600">
        <Building2 className="w-4 h-4" />
      </div>
    </GlassCard>
  );
}

function PricingCard({ name, price, period = "/mo", features, highlighted = false, badge, cta = "Start Free", popular = false }: {
  name: string; price: string; period?: string; features: string[]; highlighted?: boolean; badge?: string; cta?: string; popular?: boolean
}) {
  return (
    <motion.div
      whileHover={{ y: -12, scale: highlighted ? 1.02 : 1 }}
      transition={{ duration: 0.4 }}
      className={`relative ${highlighted ? "scale-[1.02]" : ""} ${popular ? "z-10" : ""}`}
    >
      {badge && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-bold text-white shadow-lg shadow-amber-500/30 flex items-center gap-1.5 z-20">
          <Crown className="w-3 h-3" />
          {badge}
        </div>
      )}
      <GlassCard className={`p-8 h-full ${highlighted ? "border-violet-500/50 shadow-[0_0_60px_rgba(124,58,237,0.15)]" : ""}`}>
        {popular && (
          <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-t-2xl" />
        )}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {price}
            </span>
            {price !== "Custom" && <span className="text-slate-400 text-sm">{period}</span>}
          </div>
        </div>

        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/sign-up"
          className={`block w-full py-3.5 px-6 rounded-xl font-bold text-center transition-all duration-300 ${
            highlighted
              ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:scale-[1.02]"
              : "bg-white/[0.08] text-white hover:bg-white/[0.15]"
          }`}
        >
          {cta}
        </Link>

        {highlighted && (
          <p className="text-center text-xs text-slate-500 mt-4">
            14-day free trial • No credit card required
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, description, badge, stats }: {
  icon: React.ElementType; title: string; description: string; badge?: string; stats?: { label: string; value: string; trend?: "up" | "down" }[]
}) {
  return (
    <GlassCard hoverGlow className="p-7 h-full group">
      <div className="flex items-start justify-between mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          <Icon className="w-7 h-7 text-violet-400" />
        </div>
        {badge && (
          <span className="px-3 py-1 rounded-full bg-violet-500/20 text-xs font-semibold text-violet-300 border border-violet-500/30">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-violet-300 transition-colors">{title}</h3>
      <p className="text-slate-400 mb-5 flex-grow leading-relaxed">{description}</p>
      {stats && (
        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-white/10">
          {stats.map((stat, i) => (
            <div key={i}>
              <div className="flex items-center gap-1.5">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                {stat.trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function MiniDashboard() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-600/20 via-purple-600/10 to-transparent rounded-t-3xl" />

      <GlassCard className="overflow-hidden">
        <div className="bg-slate-900/80 px-5 py-4 flex items-center gap-3 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-red-500" />
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex-1 bg-slate-800/80 rounded-lg px-4 py-1.5 text-xs text-slate-400 flex items-center gap-2">
            <Link2 className="w-3 h-3" />
            app.pivoturl.com/dashboard
          </div>
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 border-2 border-slate-800"
              />
            ))}
            <div className="w-7 h-7 rounded-full bg-violet-500 border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
              +4
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">Marketing Campaign Q1</p>
                <p className="text-xs text-slate-500">8 links • 3 team members</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Clicks", value: "24.8K", icon: MousePointerClick, color: "text-emerald-400", change: "+12%" },
              { label: "Links", value: "1,247", icon: Link2, color: "text-violet-400", change: "+89" },
              { label: "QR Scans", value: "3.2K", icon: QrCode, color: "text-amber-400", change: "+24%" },
              { label: "Conversions", value: "847", icon: Target, color: "text-blue-400", change: "+31%" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-800/60 rounded-xl p-3 border border-white/5"
              >
                <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-xs text-emerald-400 font-medium mt-1">{stat.change}</p>
              </motion.div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Weekly Performance</span>
              <span className="text-emerald-400 font-medium">+18.4%</span>
            </div>
            <div className="h-16 flex items-end gap-1">
              {[35, 55, 45, 72, 58, 88, 65, 95, 72, 100, 78, 92].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="flex-1 bg-gradient-to-t from-violet-600 to-purple-400 rounded-t"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "72%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.5 }}
                className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">72% goal</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function UrgencyBanner() {
  const [timeLeft, setTimeLeft] = useState({ days: 14, hours: 7, minutes: 32 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes } = prev;
        minutes--;
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          days--;
        }
        if (days < 0) {
          days = 14;
          hours = 23;
          minutes = 59;
        }
        return { days, hours, minutes };
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-center gap-4 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30"
    >
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-300">Limited Time:</span>
      </div>
      <div className="flex items-center gap-3">
        {[
          { value: timeLeft.days, label: "days" },
          { value: timeLeft.hours, label: "hrs" },
          { value: timeLeft.minutes, label: "min" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="px-2 py-1 bg-slate-900/80 rounded text-sm font-bold text-amber-400">
              {String(item.value).padStart(2, "0")}
            </div>
            <span className="text-xs text-slate-500">{item.label}</span>
            {i < 2 && <span className="text-amber-500 mx-1">:</span>}
          </div>
        ))}
      </div>
      <span className="text-xs text-slate-400">Pro plan at 50% off</span>
    </motion.div>
  );
}

function SocialProofCounter() {
  const counters = [
    { value: 50000, suffix: "+", label: "Active Teams" },
    { value: 100000000, suffix: "+", label: "Links Created" },
    { value: 999, suffix: "%", label: "Uptime SLA" },
    { value: 49, suffix: "/5", label: "Average Rating" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {counters.map((counter, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="text-center"
        >
          <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            <AnimatedCounter
              end={counter.value}
              suffix={counter.suffix}
            />
          </p>
          <p className="text-sm text-slate-500 mt-2">{counter.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

function LiveSocialProof() {
  const [recentSignups] = useState([
    { name: "Alex M.", plan: "Pro", location: "San Francisco", time: "2 min ago" },
    { name: "Sarah K.", plan: "Enterprise", location: "New York", time: "5 min ago" },
    { name: "James L.", plan: "Pro", location: "London", time: "8 min ago" },
    { name: "Maria S.", plan: "Pro", location: "Berlin", time: "12 min ago" },
    { name: "David C.", plan: "Starter", location: "Toronto", time: "15 min ago" },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % recentSignups.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [recentSignups.length]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-violet-500/10" />
      <div className="relative p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">Teams joining now</span>
          </div>
          <div className="flex -space-x-1.5 ml-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border-2 border-slate-900" />
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {recentSignups[currentIndex].name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">
                <span className="text-violet-400">{recentSignups[currentIndex].name}</span> from {recentSignups[currentIndex].location}
              </p>
              <p className="text-sm text-slate-400">
                just signed up for <span className="text-emerald-400 font-medium">{recentSignups[currentIndex].plan}</span> • {recentSignups[currentIndex].time}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LossAversionBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="relative rounded-2xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-rose-600/15 to-pink-600/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(239,68,68,0.15),transparent_60%)]" />
      
      <div className="relative p-8 sm:p-10">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 mb-4">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300 font-medium">Stop Losing Links & Leads</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Every Untapped Link Is Revenue You're Leaving on the Table
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Without proper link tracking, you're blind to 73% of your audience. You're paying for ads you can't optimize, missing retargeting opportunities, and watching competitors outperform you with data you didn't collect.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/80 rounded-xl p-4 text-center border border-red-500/20">
                <p className="text-3xl font-black text-red-400">73%</p>
                <p className="text-xs text-slate-500 mt-1">Untracked clicks</p>
              </div>
              <div className="bg-slate-900/80 rounded-xl p-4 text-center border border-red-500/20">
                <p className="text-3xl font-black text-amber-400">$4,200</p>
                <p className="text-xs text-slate-500 mt-1">Avg. monthly loss</p>
              </div>
            </div>
            <Link
              href="/sign-up"
              className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-center hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] transition-shadow"
            >
              Fix This Today
            </Link>
            <p className="text-xs text-slate-500">Free for 14 days • No credit card</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ComparisonTable() {
  const features = [
    { name: "Link Tracking", PivotUrl: true, competitors: false },
    { name: "Real-time Analytics", PivotUrl: true, competitors: "Partial" },
    { name: "Custom Branded Links", PivotUrl: true, competitors: false },
    { name: "Team Collaboration", PivotUrl: true, competitors: "Basic" },
    { name: "AI-Powered A/B Testing", PivotUrl: true, competitors: false },
    { name: "Enterprise SSO/SAML", PivotUrl: true, competitors: "Expensive Add-on" },
    { name: "Priority Support", PivotUrl: true, competitors: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl overflow-hidden border border-white/[0.08]"
    >
      <div className="bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8">
        <h3 className="text-2xl font-bold text-white text-center mb-8">
          Why Teams Switch to PivotUrl
        </h3>
        <div className="space-y-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <span className="text-slate-300">{feature.name}</span>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 min-w-[120px] justify-end">
                  {typeof feature.PivotUrl === "boolean" && feature.PivotUrl ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Included</span>
                    </div>
                  ) : (
                    <span className="text-amber-400 text-sm">{feature.PivotUrl}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-[120px] justify-end">
                  {typeof feature.competitors === "boolean" && feature.competitors ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400 text-sm">Included</span>
                    </div>
                  ) : feature.competitors === "Partial" ? (
                    <span className="text-amber-400 text-sm">Partial</span>
                  ) : feature.competitors === "Basic" ? (
                    <span className="text-amber-400 text-sm">Basic</span>
                  ) : feature.competitors === "Expensive Add-on" ? (
                    <span className="text-red-400 text-sm">Extra $</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <X className="w-5 h-5 text-slate-600" />
                      <span className="text-slate-500 text-sm">Missing</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t border-white/[0.08]">
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-400">PivotUrl</p>
            <p className="text-xs text-slate-500 mt-1">Your Team</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-500">Others</p>
            <p className="text-xs text-slate-600 mt-1">Generic Tools</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AuthorityBadges() {
  const badges = [
    { icon: Award, label: "G2 Leader", sublabel: "Spring 2026" },
    { icon: Star, label: "4.9/5 Rating", sublabel: "500+ Reviews" },
    { icon: Shield, label: "SOC2 Certified", sublabel: "Enterprise Ready" },
    { icon: Zap, label: "Fastest Setup", sublabel: "30 Seconds" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {badges.map((badge, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] rounded-xl p-5 border border-white/[0.08] text-center"
        >
          <badge.icon className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-bold">{badge.label}</p>
          <p className="text-xs text-slate-500 mt-1">{badge.sublabel}</p>
        </motion.div>
      ))}
    </div>
  );
}

function UrgencyStack() {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
      >
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Timer className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">Limited Time: 50% Off Pro</p>
          <p className="text-sm text-slate-400">14 days remaining on this offer</p>
        </div>
        <UrgencyBanner />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">Free 14-Day Trial</p>
          <p className="text-sm text-slate-400">Full Pro access, no credit card required</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20"
      >
        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">30-Day Money-Back Guarantee</p>
          <p className="text-sm text-slate-400">Try risk-free, cancel anytime</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 800], [0, 200]);
  const opacityHero = useTransform(scrollY, [0, 400], [1, 0]);
  const scaleHero = useSpring(yHero, { stiffness: 100, damping: 30 });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Link2,
      title: "Smart Link Management",
      description: "Create branded short links with custom slugs, automatic redirect rules, and advanced targeting. Hide affiliate URLs with link cloaking.",
      badge: "Core Feature",
      stats: [{ label: "Links created", value: "100M+" }, { label: "Click rate increase", value: "+340%", trend: "up" as const }]
    },
    {
      icon: Shield,
      title: "Password Protection",
      description: "Secure sensitive links with password protection. Set expiration dates and control who accesses your content and when.",
      badge: "Security",
      stats: [{ label: "Security features", value: "12+" }, { label: "Encryption", value: "AES-256" }]
    },
    {
      icon: Smartphone,
      title: "Deep Link Routing",
      description: "Automatically redirect mobile users to the App Store or Play Store based on their device. Desktop users see your main link.",
      badge: "Smart Routing",
      stats: [{ label: "Device detection", value: "99.8%" }, { label: "Routing rules", value: "Unlimited" }]
    },
    {
      icon: Split,
      title: "A/B Testing",
      description: "Split traffic between multiple destinations and let AI optimize your winners. See real-time performance and statistical significance.",
      badge: "AI-Powered",
      stats: [{ label: "Test variants", value: "10+" }, { label: "Time to significance", value: "~48hrs" }]
    },
    {
      icon: QrCode,
      title: "Dynamic QR Codes",
      description: "Generate scannable QR codes with your brand colors and logo. Track every scan and update targets without reprinting.",
      badge: "Customizable",
      stats: [{ label: "Scan success", value: "99.8%" }, { label: "Design options", value: "50+" }]
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Track every click with real-time dashboards. Geographic data, device breakdown, referrer sources, and conversion funnels.",
      badge: "Real-time",
      stats: [{ label: "Data points tracked", value: "50+" }, { label: "Report retention", value: "90 days" }]
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Invite team members with granular role-based permissions. Real-time sync keeps everyone aligned. SSO and SAML supported.",
      badge: "Enterprise",
      stats: [{ label: "Team size average", value: "5-50" }, { label: "Sync latency", value: "<100ms" }]
    },
    {
      icon: Globe,
      title: "Custom Domains",
      description: "Use your own branded domain for short links. Build brand trust with every link you share across all channels.",
      badge: "White-label",
      stats: [{ label: "Domains supported", value: "Unlimited" }, { label: "SSL included", value: "Always" }]
    },
    {
      icon: Tag,
      title: "Smart Tags & Folders",
      description: "Organize links into folders and campaigns. Add tags for granular filtering and quick access. Never lose a link again.",
      badge: "Organization",
      stats: [{ label: "Time saved", value: "2hrs/day" }, { label: "Search speed", value: "-80%" }]
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marketing Director",
      company: "TechFlow",
      quote: "PivotUrl cut our campaign setup time by 70%. The A/B testing feature alone increased our conversions by 34%. It's become essential to our stack.",
      metric: { value: "+34%", label: "conversion increase" }
    },
    {
      name: "Marcus Johnson",
      role: "Head of Growth",
      company: "ScaleUp",
      quote: "The analytics depth is incredible. We discovered a major traffic source we were completely missing before. Game-changing insights in minutes.",
      metric: { value: "+127%", label: "traffic discovered" }
    },
    {
      name: "Emily Rodriguez",
      role: "Brand Manager",
      company: "NordicCo",
      quote: "Our branded links look so professional now. The custom domain feature means our links are instantly recognizable and trusted by our audience.",
      metric: { value: "+89%", label: "link trust score" }
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$0",
      features: [
        "50 links per month",
        "Basic analytics",
        "2 team members",
        "1 custom domain",
        "QR codes",
        "Password protection",
        "UTM builder",
      ],
      cta: "Get Started"
    },
    {
      name: "Pro",
      price: "$29",
      badge: "Most Popular",
      highlighted: true,
      popular: true,
      features: [
        "Unlimited links",
        "Advanced analytics",
        "10 team members",
        "5 custom domains",
        "QR codes with logo",
        "A/B testing",
        "AI optimization",
        "Priority support",
        "API access",
      ],
      cta: "Start 14-Day Trial"
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "Unlimited domains",
        "SSO & SAML",
        "Dedicated support",
        "Custom contracts",
        "99.99% SLA",
        "Onboarding assistance",
        "Custom integrations",
      ],
      cta: "Contact Sales"
    },
  ];

  const companies = ["TechCorp", "GrowthLabs", "DataFlow", "InnovateCo", "ScaleX"];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030308]">
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(3deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 10s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 6s ease infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        .transform-3d {
          transform-style: preserve-3d;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030308; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #7c3aed, #a855f7); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #8b5cf6, #c084fc); }
        @media (prefers-reduced-motion: reduce) {
          .animate-float, .animate-float-reverse, .animate-pulse-glow, .animate-gradient, .animate-shimmer {
            animation: none;
          }
        }
      `}</style>

      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <FloatingOrb size={600} color="violet" className="top-[-200px] left-[-100px]" />
        <FloatingOrb size={500} color="blue" className="bottom-[-150px] right-[-100px]" />
        <FloatingOrb size={400} color="pink" className="top-[40%] left-[60%]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#030308_70%)]" />
      </div>

      {/* Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="mx-4 mt-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/[0.08]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow">
                  <Link2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white group-hover:text-violet-300 transition-colors">PivotUrl</span>
              </Link>

              <div className="hidden md:flex items-center gap-8">
                <Link href="#features" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">Features</Link>
                <Link href="#analytics" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">Analytics</Link>
                <Link href="#pricing" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">Pricing</Link>
                <Link href="#testimonials" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">Reviews</Link>
              </div>

              <div className="hidden md:flex items-center gap-4">
                <Link href="/sign-in" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="group relative px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-white/[0.08]"
              >
                <div className="px-4 py-4 space-y-3">
                  <Link href="#features" className="block text-slate-300 hover:text-white py-2">Features</Link>
                  <Link href="#analytics" className="block text-slate-300 hover:text-white py-2">Analytics</Link>
                  <Link href="#pricing" className="block text-slate-300 hover:text-white py-2">Pricing</Link>
                  <Link href="#testimonials" className="block text-slate-300 hover:text-white py-2">Reviews</Link>
                  <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-3">
                    <Link href="/sign-in" className="text-slate-300 hover:text-white py-2">Sign in</Link>
                    <Link href="/sign-up" className="block text-center py-3 rounded-xl bg-violet-600 text-white font-semibold">
                      Start Free
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <motion.section
        style={{ y: yHero, opacity: opacityHero }}
        className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-4 sm:px-6"
      >
        {/* Rotating Rings */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Number.MAX_SAFE_INTEGER, ease: "linear" }}
            className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="absolute inset-0 border border-violet-500/[0.08] rounded-full" />
            <div className="absolute inset-8 border border-purple-500/[0.06] rounded-full" />
            <div className="absolute inset-16 border border-fuchsia-500/[0.04] rounded-full" />
          </motion.div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          {/* Urgency Banner */}
          <motion.div variants={fadeInUp} className="mb-8">
            <UrgencyBanner />
          </motion.div>

          {/* Trust Badges */}
          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <TrustBadge icon={CheckCircle2} text="No credit card required" />
            <TrustBadge icon={Zap} text="Setup in 30 seconds" />
            <TrustBadge icon={Heart} text="Loved by 50K+ teams" />
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.05] mb-8 tracking-tight"
          >
            <span className="text-white">Shorten. Brand.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent animate-gradient">
              Track. Convert.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeInUp}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The link management platform that grows with you. From solo marketers to enterprise teams — see every click, understand every customer, convert every link.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-12">
            <Link
              href="/sign-up"
              className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-lg overflow-hidden shadow-2xl shadow-violet-500/30"
            >
              <span className="relative z-10 flex items-center gap-3">
                Start Building Links Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] animate-shimmer" />
            </Link>
            <button className="flex items-center gap-3 group">
              <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center backdrop-blur-sm group-hover:bg-white/[0.1] transition-all">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
              <span className="text-slate-300 group-hover:text-white transition-colors font-medium">
                Watch 2-min Demo
              </span>
            </button>
          </motion.div>

          {/* Social Proof Stats */}
          <motion.div variants={fadeInUp}>
            <SocialProofCounter />
          </motion.div>

          {/* Live Social Proof */}
          <motion.div variants={fadeInUp} className="mt-12 max-w-md mx-auto">
            <LiveSocialProof />
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 2.5, repeat: Number.MAX_SAFE_INTEGER }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-slate-600" />
        </motion.div>
      </motion.section>

      {/* Dashboard Preview */}
      <section id="analytics" className="relative py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">Real-time Analytics</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
              See What Your Links
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent"> Can Do</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Real-time analytics that actually matter. Track clicks, locations, devices, and conversions in one beautiful dashboard.
            </p>
          </motion.div>

          <IsometricCard rotation={-8} className="max-w-5xl mx-auto">
            <MiniDashboard />
          </IsometricCard>
        </div>
      </section>

      {/* Loss Aversion Section */}
      <section className="relative py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <LossAversionBanner />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 mb-6">
              <Rocket className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-violet-300 font-medium">Powerful Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
              Everything You Need to
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent"> Dominate</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              From basic link shortening to enterprise-grade link management. PivotUrl grows with your ambitions.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </motion.div>

          {/* Comparison Table */}
          <div className="mt-24">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative py-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">Loved by Marketing Teams</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
              Trusted by
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"> Industry Leaders</span>
            </h2>
          </motion.div>

          {/* Authority Badges */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <AuthorityBadges />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6 mb-20"
          >
            {testimonials.map((testimonial, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <TestimonialCard {...testimonial} />
              </motion.div>
            ))}
          </motion.div>

          {/* Company Logos */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-slate-600 text-sm font-medium tracking-widest mb-10 uppercase">
              Trusted by innovative teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10">
              {companies.map((company, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.1, y: -3 }}
                  className="flex items-center gap-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Building2 className="w-6 h-6" />
                  <span className="font-semibold text-lg">{company}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">14-Day Free Trial</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
              Simple, Transparent
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Start free, upgrade when you need more. No hidden fees, no surprises, no contracts.
            </p>
          </motion.div>

          {/* Urgency Stack */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <UrgencyStack />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 items-start"
          >
            {pricingPlans.map((plan, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <PricingCard {...plan} />
              </motion.div>
            ))}
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-wrap items-center justify-center gap-6"
          >
            <ComplianceBadge text="SOC2 Compliant" />
            <ComplianceBadge text="GDPR Ready" />
            <ComplianceBadge text="256-bit Encryption" />
            <ComplianceBadge text="99.99% Uptime" />
          </motion.div>

          {/* Money Back Guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <Shield className="w-6 h-6 text-emerald-400" />
              <div className="text-left">
                <p className="text-white font-semibold">30-Day Money-Back Guarantee</p>
                <p className="text-slate-500 text-sm">Cancel anytime, no questions asked</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="relative p-12 sm:p-16 rounded-3xl overflow-hidden">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-fuchsia-600/20" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(124,58,237,0.3),transparent_60%)]" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYyaC0xMnYtMmMxLjYxNCAwIDItMS4zODUgMi0ydjJoLTEyYzAtMS42MTQtMS4zODUtMi0yLTJoLTEyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
                className="absolute top-10 left-10 text-violet-500/30"
              >
                <Link2 className="w-20 h-20" />
              </motion.div>
              <motion.div
                animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute bottom-10 right-10 text-purple-500/30"
              >
                <QrCode className="w-24 h-24" />
              </motion.div>

              <div className="relative z-10 text-center">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
                  Ready to Transform
                  <br />
                  <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent"> Your Links?</span>
                </h2>
                <p className="text-xl text-slate-300 mb-10 max-w-lg mx-auto leading-relaxed">
                  Join 50,000+ teams using PivotUrl to build better customer experiences, one link at a time.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <Link
                    href="/sign-up"
                    className="group relative px-12 py-5 rounded-2xl bg-white text-slate-900 font-bold text-lg shadow-2xl shadow-white/10 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Get Started Free
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <div className="flex items-center gap-3 text-slate-500">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm">No credit card required</span>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-slate-500">
                  <div className="flex items-center gap-2">
                    <InfinityIcon className="w-4 h-4" />
                    <span className="text-sm">Unlimited links on Pro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    <span className="text-sm">24/7 Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm">Setup in 30 seconds</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/[0.08] py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">PivotUrl</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/security" className="hover:text-white transition-colors">Security</Link>
              <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>

            <div className="flex items-center gap-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/[0.05] text-center">
            <p className="text-slate-600 text-sm">
              © 2026 PivotUrl. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
