/**
 * src/app/api/(dodopayments)/seed-products/route.ts
 * Seeding disabled by request — manage products in the Dodo Payments dashboard.
 */
import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Seeding disabled. Create products in Dodo dashboard and refresh /pricing.' },
        { status: 404 }
    );
}