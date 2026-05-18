"use client";

import { useState } from "react";
import { PlanKey, PLANS } from "@/lib/billing/plans";

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  feature, 
  upgradeTo 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  feature: string; 
  upgradeTo: PlanKey; 
}) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const plan = PLANS[upgradeTo] || PLANS['growth'];

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: upgradeTo || 'growth', billingCycle }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">Upgrade to Unlock {feature}</h2>
          <p className="text-muted-foreground mb-6">
            You've reached the limit on your current plan. Upgrade to the <span className="font-semibold text-foreground">{plan.name}</span> plan to unlock this feature.
          </p>

          <div className="bg-muted rounded-xl p-4 mb-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Billing Cycle</span>
              <div className="flex bg-background border border-border rounded-lg p-1">
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${billingCycle === 'monthly' ? 'bg-secondary text-foreground font-medium shadow-sm' : 'text-muted-foreground'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${billingCycle === 'annual' ? 'bg-secondary text-foreground font-medium shadow-sm' : 'text-muted-foreground'}`}
                >
                  Annually
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-end border-t border-border/50 pt-4">
              <span className="text-muted-foreground">Price</span>
              <div className="text-right">
                <span className="text-3xl font-bold">${billingCycle === 'annual' ? plan.annualPrice : plan.price}</span>
                <span className="text-muted-foreground ml-1">/ mo</span>
                {billingCycle === 'annual' && (
                  <p className="text-xs text-green-600 font-medium mt-1">Billed annually (${plan.annualPrice * 12}/yr)</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center"
            >
              {loading ? "Preparing Checkout..." : "Upgrade Now"}
            </button>
            <button 
              onClick={onClose}
              disabled={loading}
              className="w-full bg-transparent hover:bg-muted text-muted-foreground font-medium py-3 rounded-lg transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
