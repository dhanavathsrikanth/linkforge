// src/app/pricing/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from '@/components/ui';

type Price = {
  price_id: string;
  amount: number;
  currency: string;
  type: string; // 'recurring_price' | 'one_time_price'
  interval?: string | null;
};

type Product = {
  product_id: string;
  name: string;
  description?: string;
  prices: Price[];
};

function formatAmount(amountMinor: number, currency: string) {
  const amount = amountMinor / 100;
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export default function PricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const loadProducts = async () => {
    const r = await fetch('/api/products', { cache: 'no-store' });
    if (!r.ok) throw new Error('Failed to load products');
    const j = await r.json();
    setProducts(Array.isArray(j.items) ? j.items : []);
  };

  const loadUserWorkspace = async () => {
    const r = await fetch('/api/user/me', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    const ws = j?.currentWorkspace?.id || (Array.isArray(j?.workspaces) ? j.workspaces[0]?.id : null);
    if (ws) setWorkspaceId(ws);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([loadProducts(), loadUserWorkspace()]);
      } catch (e) {
        setError('Unable to load pricing right now. Please try again later.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const displayed = useMemo(() => {
    const isMonthly = (v?: string | null) => {
      const s = (v || '').toLowerCase();
      return s === 'month' || s === 'monthly' || s === 'mo';
    };
    const isYearly = (v?: string | null) => {
      const s = (v || '').toLowerCase();
      return s === 'year' || s === 'yearly' || s === 'yr';
    };
    return products.map((p) => {
      const prices = Array.isArray(p.prices) ? p.prices : [];
      // Prefer recurring monthly with amount > 0, then any recurring > 0, then any recurring,
      // then any > 0, then first available.
      const primary =
        prices.find(x => x.type === 'recurring_price' && isMonthly(x.interval) && typeof x.amount === 'number' && x.amount >= 0) ??
        prices.find(x => x.type === 'recurring_price' && typeof x.amount === 'number' && x.amount >= 0) ??
        prices.find(x => x.type === 'recurring_price') ??
        prices.find(x => typeof x.amount === 'number' && x.amount >= 0) ??
        prices[0] ??
        null;

      return { ...p, primaryPrice: primary };
    });
  }, [products]);

  const startCheckout = async (productId: string) => {
    try {
      setSubmitting(productId);
      const body: Record<string, unknown> = {
        product_cart: [{ product_id: productId, quantity: 1 }],
      };
      if (workspaceId) {
        // Pass workspaceId so webhook can upgrade the correct workspace
        body.metadata = { workspaceId };
      }
      const r = await fetch('/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.checkout_url) {
        window.location.href = j.checkout_url;
      } else {
        alert('Failed to start checkout');
      }
    } catch {
      alert('Failed to start checkout');
    } finally {
      setSubmitting(null);
    }
  };


  if (loading) {
    return <div className="p-8">Loading plans…</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  // Empty state: instruct to create products in Dodo dashboard and refresh
  if (!error && displayed.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold mb-3">No products found</h1>
        <p className="text-sm text-neutral-600 mb-6">
          No active products are available. Create products and prices in your Dodo Payments dashboard,
          then refresh this page to load them.
        </p>
        <button
          onClick={async () => {
            try {
              (document.activeElement as HTMLElement | null)?.blur();
              await loadProducts();
            } catch { }
          }}
          className="inline-flex h-10 items-center justify-center rounded-md bg-black text-white px-4 text-sm font-medium hover:opacity-90"
        >
          Refresh products
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold mb-2">Choose a plan</h1>
      <p className="text-sm text-neutral-500 mb-8">Upgrade anytime. Cancel anytime.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayed.map((p) => {
          const price = (p as any).primaryPrice as Price | null;
          const amountMinor = price && typeof price.amount === 'number' ? price.amount : 0;
          const amountLabel = price ? (amountMinor > 0 ? formatAmount(amountMinor, price.currency) : 'Free') : '—';
          const intervalLabel = (() => {
            if (!price || price.type !== 'recurring_price') return '';
            const s = (price.interval || '').toLowerCase();
            if (s === 'month' || s === 'monthly' || s === 'mo') return '/mo';
            if (s === 'year' || s === 'yearly' || s === 'yr') return '/yr';
            return price.interval ? `/${price.interval}` : '';
          })();
          const canCheckout = !!price;
          const isPopular = /pro|premium|growth/i.test(p.name);

          return (
            <Card key={p.product_id} className="flex flex-col">
              <CardHeader>
                {isPopular && (
                  <span className="mb-2 inline-flex items-center rounded-full bg-[var(--ds-accent-muted,#eef2ff)] px-2 py-0.5 text-xs font-medium text-[var(--ds-accent-foreground,#3730a3)]">
                    Most popular
                  </span>
                )}
                <CardTitle>{p.name}</CardTitle>
                {p.description && <CardDescription>{p.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tight">
                  {amountLabel}
                  {price && (
                    <span className="ml-1 text-base font-normal text-[var(--ds-text-muted)]">{intervalLabel}</span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button
                  onClick={() => canCheckout && startCheckout(p.product_id)}
                  disabled={!canCheckout || submitting === p.product_id}
                >
                  {submitting === p.product_id ? 'Redirecting…' : 'Get started'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-sm text-neutral-600">
        After purchase you will be redirected back to your dashboard. To manage an existing subscription, open the customer portal from your account menu.
      </div>
    </div>
  );
}
