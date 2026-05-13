// src/app/checkout/route.ts
import { Checkout } from '@dodopayments/nextjs';

const bearerToken = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_PAYMENTS_SECRET_KEY;
const env = (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode' | undefined) ?? 'test_mode';

export const GET = Checkout({
  bearerToken: bearerToken!,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: env,
  type: 'static',
});

export const POST = Checkout({
  bearerToken: bearerToken!,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: env,
  type: 'session',
});
