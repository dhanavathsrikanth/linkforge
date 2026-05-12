"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, UserMessages } from "./db";
import { getOrCreateDbUser } from "@/lib/auth";

export async function createUserMessage(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("User not found");
  await getOrCreateDbUser();

  const message = formData.get("message");
  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("Message is required");
  }

  await db
    .insert(UserMessages)
    .values({
      userId,
      message: message.trim(),
    })
    .onConflictDoUpdate({
      target: UserMessages.userId,
      set: {
        message: message.trim(),
        createTs: new Date(),
      },
    });

  revalidatePath("/");
}

export async function deleteUserMessage() {
  const { userId } = await auth();
  if (!userId) throw new Error("User not found");
  await getOrCreateDbUser();

  await db.delete(UserMessages).where(eq(UserMessages.userId, userId));

  revalidatePath("/");
}
