"use client";

import { useState } from "react";
import { PLANS } from "@/lib/billing/plans";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const { isSignedIn } = useUser();

  const planEntries = Object.entries(PLANS);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Start for free and upgrade as you grow. No hidden fees.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <span className={`font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
            <button 
              onClick={() => setBillingCycle(billingCycle === 'annual' ? 'monthly' : 'annual')}
              className="relative inline-flex h-7 w-14 items-center rounded-full bg-blue-600 transition-colors focus:outline-none"
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${billingCycle === 'annual' ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <span className={`font-medium flex items-center gap-2 ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annually
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800 tracking-wide uppercase">
                Save 26%
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-20 animate-in fade-in duration-1000 delay-150 fill-mode-both">
          {planEntries.map(([key, plan]) => {
            const isMostPopular = key === 'growth';
            
            return (
              <div 
                key={key} 
                className={`relative flex flex-col bg-background rounded-2xl border ${isMostPopular ? 'border-amber-500 shadow-xl lg:scale-105 z-10' : 'border-border shadow-sm'} p-6`}
              >
                {isMostPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-extrabold tracking-tight">
                      ${billingCycle === 'annual' ? plan.annualPrice : plan.price}
                    </span>
                    <span className="text-muted-foreground font-medium mb-1">/mo</span>
                  </div>
                  {billingCycle === 'annual' && plan.annualPrice > 0 ? (
                    <p className="text-sm text-green-600 font-medium">Billed annually (${plan.annualPrice * 12}/yr)</p>
                  ) : (
                    <p className="text-sm text-muted-foreground font-medium min-h-[20px]">{plan.price > 0 && billingCycle === 'monthly' ? 'Billed monthly' : ''}</p>
                  )}
                </div>

                <div className="mt-auto pt-6 mb-6">
                  {key === 'free' ? (
                    <Link href="/signup" className="flex w-full justify-center items-center py-2.5 px-4 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg transition-colors">
                      Start for free
                    </Link>
                  ) : (
                    <UpgradeButton 
                      plan={key as keyof typeof PLANS} 
                      billingCycle={billingCycle} 
                      label={isSignedIn ? "Get started" : "Sign up to buy"} 
                    />
                  )}
                </div>

                <ul className="space-y-4 flex-1">
                  <li className="flex items-start gap-3 text-sm">
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>{plan.limits.linksPerMonth === -1 ? 'Unlimited' : plan.limits.linksPerMonth.toLocaleString()} Links / mo</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>{plan.limits.clicksTrackedPerMonth === -1 ? 'Unlimited' : (plan.limits.clicksTrackedPerMonth >= 1000000 ? (plan.limits.clicksTrackedPerMonth / 1000000).toFixed(1) + 'M' : plan.limits.clicksTrackedPerMonth.toLocaleString())} Clicks / mo</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <svg className={`w-5 h-5 shrink-0 ${plan.limits.customDomains > 0 ? 'text-green-500' : 'text-muted-foreground/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {plan.limits.customDomains > 0 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                    <span className={plan.limits.customDomains === 0 ? 'text-muted-foreground' : ''}>
                      {plan.limits.customDomains} Custom Domains
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <svg className={`w-5 h-5 shrink-0 ${plan.limits.teamMembers > 1 ? 'text-green-500' : 'text-muted-foreground/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {plan.limits.teamMembers > 1 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                    <span className={plan.limits.teamMembers <= 1 ? 'text-muted-foreground' : ''}>
                      {plan.limits.teamMembers} Team Members
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <svg className={`w-5 h-5 shrink-0 ${plan.limits.abTestingEnabled ? 'text-green-500' : 'text-muted-foreground/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {plan.limits.abTestingEnabled ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                    <span className={!plan.limits.abTestingEnabled ? 'text-muted-foreground' : ''}>A/B Testing</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <svg className={`w-5 h-5 shrink-0 ${plan.limits.whiteLabelEnabled ? 'text-green-500' : 'text-muted-foreground/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {plan.limits.whiteLabelEnabled ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                    <span className={!plan.limits.whiteLabelEnabled ? 'text-muted-foreground' : ''}>White-labeling</span>
                  </li>
                </ul>
              </div>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I cancel my subscription at any time?", a: "Yes, you can cancel your subscription at any time from your billing dashboard. You'll retain access to your plan's features until the end of your current billing cycle." },
              { q: "What happens if I exceed my monthly link limits?", a: "Your links will continue to redirect normally! However, you won't be able to create new links until your monthly cycle resets or you upgrade your plan." },
              { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee for all new annual subscriptions. Monthly subscriptions are non-refundable." },
              { q: "Is there a free trial for paid plans?", a: "We don't offer trials by default since we have a generous Free plan. Contact support if you need to test specific Enterprise features." },
              { q: "How are clicks tracked?", a: "We track every unique click that passes through our redirect engine. Bots and web crawlers are automatically filtered out to ensure your analytics remain accurate." }
            ].map((faq, i) => (
              <div key={i} className="border border-border rounded-lg p-5 bg-background shadow-sm">
                <h4 className="font-semibold mb-2">{faq.q}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center bg-secondary/30 rounded-2xl p-10 border border-border shadow-sm">
          <h2 className="text-2xl font-bold mb-3">Need more than the Business plan?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Get dedicated support, custom SLAs, unlimited usage overrides, and SSO integration for large organizations.
          </p>
          <a href="mailto:enterprise@linkforge.app" className="inline-flex items-center gap-2 bg-foreground text-background font-medium px-6 py-3 rounded-lg hover:bg-foreground/90 transition-colors">
            Talk to sales
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </a>
        </div>

      </div>
    </div>
  );
}
