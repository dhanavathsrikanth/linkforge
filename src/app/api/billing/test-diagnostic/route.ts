import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { dodo } from '@/lib/billing/dodo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      DODO_SECRET_KEY_SET: !!process.env.DODO_SECRET_KEY,
      CLERK_SECRET_KEY_SET: !!process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_SET: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
    },
    database: { status: 'unchecked', error: null },
    dodo: { status: 'unchecked', error: null },
  };

  // 1. Test Neon Database Connection
  try {
    const testQuery = await db.select().from(users).limit(1);
    diagnostics.database.status = 'connected';
    diagnostics.database.recordsFound = testQuery.length;
  } catch (err: any) {
    diagnostics.database.status = 'failed';
    diagnostics.database.error = err?.message || String(err);
  }

  // 2. Test Dodo Payments Client & Key
  if (process.env.DODO_SECRET_KEY) {
    try {
      // List customers to test authorization key validity
      const list = await dodo.customers.list({ limit: 1 } as any);
      diagnostics.dodo.status = 'authorized';
      diagnostics.dodo.data = { customersCount: (list as any)?.data?.length ?? 0 };
    } catch (err: any) {
      diagnostics.dodo.status = 'failed';
      diagnostics.dodo.error = err?.message || String(err);
      diagnostics.dodo.raw = err;
    }
  } else {
    diagnostics.dodo.status = 'failed';
    diagnostics.dodo.error = 'DODO_SECRET_KEY is missing';
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
