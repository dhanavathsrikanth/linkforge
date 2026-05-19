"use client";

import { useState } from "react";
import { PlanKey } from "@/lib/billing/plans";

export function UpgradeButton({ plan, billingCycle = "annual", label }: { plan: PlanKey, billingCycle?: "monthly" | "annual", label: string }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(`Checkout Failed: ${data.error || "Unknown Error"}`);
        setLoading(false);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Network Error: ${e.message || e}`);
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleUpgrade}
      disabled={loading}
      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center"
    >
      {loading ? "Loading..." : label}
    </button>
  );
}
