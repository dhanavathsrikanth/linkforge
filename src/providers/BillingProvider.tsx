"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { PlanKey } from "@/lib/billing/plans";

type BillingContextType = {
  showUpgradeModal: (params: { feature: string; upgradeTo: PlanKey }) => void;
};

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [feature, setFeature] = useState("");
  const [upgradeTo, setUpgradeTo] = useState<PlanKey>("growth");

  const showUpgradeModal = (params: { feature: string; upgradeTo: PlanKey }) => {
    setFeature(params.feature);
    setUpgradeTo(params.upgradeTo || "growth");
    setModalOpen(true);
  };

  return (
    <BillingContext.Provider value={{ showUpgradeModal }}>
      {children}
      <UpgradeModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        feature={feature} 
        upgradeTo={upgradeTo} 
      />
    </BillingContext.Provider>
  );
}

export function useBillingContext() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error("useBillingContext must be used within a BillingProvider");
  }
  return context;
}
