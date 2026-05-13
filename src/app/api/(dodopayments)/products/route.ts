/* src/app/api/(dodopayments)/products/route.ts */
import { NextResponse } from 'next/server';
import DodoPayments from 'dodopayments';

type SafePrice = {
  price_id: string;
  amount: number;
  currency: string;
  type: string;
  interval?: string | null;
};

type SafeProduct = {
  product_id: string;
  name: string;
  description?: string;
  prices: SafePrice[];
};

export async function GET() {
  try {
    const bearerToken = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_PAYMENTS_SECRET_KEY;
    if (!bearerToken) {
      return NextResponse.json({ error: 'Server misconfiguration: missing Dodo API key' }, { status: 500 });
    }

    const env = (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode' | undefined) ?? 'test_mode';
    const client = new DodoPayments({ bearerToken, environment: env });

    const items: SafeProduct[] = [];
    for await (const p of client.products.list({ page_size: 50 })) {
      const name = String((p as any).name ?? '');
      const description = ((p as any).description ?? undefined) as string | undefined;

      // Normalize possible price shapes from API/dashboard
      const rawPrices: any[] = Array.isArray((p as any).prices)
        ? ((p as any).prices as any[])
        : ((p as any).price ? [((p as any).price as any)] : []);

      const productCurrency = String(((p as any).currency ?? 'USD'));

      const prices: SafePrice[] = rawPrices.map((pr: any) => {
        const amountCandidate =
          pr?.amount ??
          pr?.price ??
          pr?.unit_amount ??
          pr?.recurring_pre_tax_amount ??
          0;

        const currencyCandidate =
          pr?.currency ??
          (pr?.billing_currency as string | undefined) ??
          productCurrency ??
          'USD';

        const intervalCandidate =
          pr?.interval ??
          pr?.payment_frequency_interval ??
          pr?.billing_period ??
          null;

        const typeCandidate =
          pr?.type ??
          (intervalCandidate ? 'recurring_price' : 'one_time_price');

        return {
          price_id: String(pr?.price_id ?? pr?.id ?? ''),
          amount: Number(amountCandidate),
          currency: String(currencyCandidate),
          type: String(typeCandidate),
          interval: (intervalCandidate as string | null) ?? null,
        };
      });

      items.push({
        product_id: String((p as any).product_id ?? (p as any).id ?? ''),
        name,
        description,
        prices,
      });
    }

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}
