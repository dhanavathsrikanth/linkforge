"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, UserMessages } from "./db";
import { getOrCreateDbUser } from "@/lib/auth";

export async function createUserMessage(formData: FormData) {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "User not found" };
    await getOrCreateDbUser();

    const message = formData.get("message");
    if (typeof message !== "string" || message.trim().length === 0) {
      return { error: "Message is required" };
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
    return { success: true };
  } catch (error) {
    console.error("createUserMessage failed:", error);
    return { error: "Internal server error" };
  }
}

export async function deleteUserMessage() {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "User not found" };
    await getOrCreateDbUser();

    await db.delete(UserMessages).where(eq(UserMessages.userId, userId));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("deleteUserMessage failed:", error);
    return { error: "Internal server error" };
  }
}
