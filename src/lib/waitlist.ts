import { db } from "./db";
import { waitlist } from "./db/schema";
import { count, eq, and, lt, sql } from "drizzle-orm";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateReferralCode(): string {
  let code = "";
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export async function getPosition(
  feature: string,
  createdAt: Date
): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(waitlist)
    .where(
      and(
        eq(waitlist.feature, feature),
        lt(waitlist.createdAt, createdAt)
      )
    );
  return (result[0]?.value ?? 0) + 1;
}

export async function getTotalSignups(feature: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(waitlist)
    .where(eq(waitlist.feature, feature));
  return result[0]?.value ?? 0;
}

export const REFERRAL_POINTS = 20;
export const SIGNUP_POINTS = 50;

export const MILESTONES = [
  { points: 100, label: "Early Adopter" },
  { points: 250, label: "Beta Tester" },
  { points: 500, label: "VIP" },
  { points: 1000, label: "Power User" },
] as const;

export function getMilestone(points: number) {
  let current: (typeof MILESTONES)[number] | null = null;
  let next: (typeof MILESTONES)[number] | null = MILESTONES[0];

  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (points >= MILESTONES[i].points) {
      current = MILESTONES[i];
      next = MILESTONES[i + 1] ?? null;
      break;
    }
  }

  if (!current && points < MILESTONES[0].points) {
    next = MILESTONES[0];
  }

  return { current, next };
}
