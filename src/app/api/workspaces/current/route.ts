import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { workspaces, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }

    const userWorkspaces = await db.query.workspaces.findMany({
      where: eq(workspaces.ownerId, dbUser.id),
    });

    if (!userWorkspaces.length) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    return NextResponse.json({ workspace: userWorkspaces[0] });
  } catch (error) {
    console.error('Workspace fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
