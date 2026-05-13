// src/app/customer-portal/route.ts
import { CustomerPortal } from '@dodopayments/nextjs';

const bearerToken = process.env.DODO_PAYMENTS_API_KEY || process.env.DODO_PAYMENTS_SECRET_KEY;
const env = (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode' | undefined) ?? 'test_mode';

export const GET = CustomerPortal({
  bearerToken: bearerToken!,
  environment: env,
});
