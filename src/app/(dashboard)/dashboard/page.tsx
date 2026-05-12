"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { TrendingUp, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/Card";

const metrics = [
  { label: "New users",       value: "150,040", change: "+40%" },
  { label: "New messages",    value: "300",     change: "+30%" },
  { label: "Sales",           value: "$2,340",  change: "+25%" },
  { label: "Conversion rate", value: "42%",     change: "+12%" },
];

const ranges = ["1W", "1M", "3M"];

const bars = [
  { a: 50, b: 65 },
  { a: 78, b: 88 },
  { a: 32, b: 28 },
  { a: 85, b: 70 },
  { a: 42, b: 55 },
  { a: 60, b: 50 },
  { a: 80, b: 92 },
];

export default function DashboardPage() {
  const { user } = useUser();
  const [activeRange, setActiveRange] = useState("1M");
  const firstName = user?.firstName || "there";

  return (
    <div className="p-6 space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-widest font-medium">
          Good evening, {firstName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card
            key={m.label}
            className="bg-card border-0 rounded-2xl p-6 shadow-none hover:shadow-none"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{m.label}</p>
              <button className="rounded-md p-0.5 text-muted-foreground hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
              {m.value}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
              <TrendingUp className="h-4 w-4" />
              <span>{m.change}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart + promo */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Chart card */}
        <Card className="bg-card border-0 rounded-2xl p-6 shadow-none hover:shadow-none">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Page views / Revenue</p>
            <div className="flex items-center gap-1">
              {ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setActiveRange(r)}
                  className={
                    activeRange === r
                      ? "bg-primary/10 text-primary text-xs px-3 py-1 rounded-md border border-primary/20"
                      : "text-muted-foreground text-xs px-3 py-1 rounded-md"
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 h-56">
            <div className="flex h-full items-end gap-6 border-b border-border/60 pb-1">
              {bars.map((pair, i) => (
                <div key={i} className="flex flex-1 items-end gap-1.5">
                  <div
                    className="w-1/2 rounded-t-md bg-primary"
                    style={{ height: `${pair.a}%` }}
                  />
                  <div
                    className="w-1/2 rounded-t-md bg-[#3D2EE0]"
                    style={{ height: `${pair.b}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Promo card */}
        <Card className="bg-primary border-0 rounded-2xl p-6 text-primary-foreground shadow-none hover:shadow-none">
          <p className="text-base font-semibold leading-relaxed">
            <span className="font-bold">New:</span> Realtime Colors now has templates available! Have a cool template idea?
          </p>
          <button
            type="button"
            className="mt-6 rounded-lg bg-white text-primary text-sm font-semibold px-4 py-2 shadow-sm hover:bg-white/90 transition-colors"
          >
            Submit it!
          </button>
        </Card>
      </div>
    </div>
  );
}
