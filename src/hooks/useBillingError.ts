"use client";

import { useBillingContext } from "@/providers/BillingProvider";

export function useSafeFetch() {
  const { showUpgradeModal } = useBillingContext();

  return async function safeFetch(url: string, options?: RequestInit) {
    const res = await fetch(url, options);
    if (res.status === 402) {
      try {
        const data = await res.json();
        showUpgradeModal({
          feature: data.error?.feature || data.error?.limitKey || "this feature",
          upgradeTo: data.error?.upgradeTo || "growth",
        });
      } catch (e) {
        showUpgradeModal({ feature: "this feature", upgradeTo: "growth" });
      }
      return null; // signal to caller that operation was blocked
    }
    return res;
  };
}
