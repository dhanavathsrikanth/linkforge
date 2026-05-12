import { auth } from "@clerk/nextjs/server";
import { createUserMessage, deleteUserMessage } from "./actions";
import { db } from "./db";
import { getOrCreateDbUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Database, MessageSquareText, ShieldCheck, Trash2 } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) throw new Error("User not found");
  await getOrCreateDbUser();

  const existingMessage = await db.query.UserMessages.findFirst({
    where: (messages, { eq }) => eq(messages.userId, userId),
  });

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden ds-surface-gradient px-6 py-12">
      <div className="absolute right-[-12rem] top-20 h-96 w-96 rounded-full bg-[var(--ds-secondary)]/40 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-[-10rem] h-80 w-80 rounded-full bg-[var(--ds-neutral-100)]/60 blur-3xl" />
      <section className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="gap-2 px-4 py-1.5 text-sm bg-[var(--ds-secondary)] text-[var(--ds-primary)] border-[var(--ds-border)]">
            <ShieldCheck className="h-4 w-4" />
            Authenticated with Clerk
          </Badge>
          <h1 className="ds-text-display text-[var(--ds-text-primary)]">
            Store user data in Neon
          </h1>
          <p className="mx-auto mt-4 max-w-xl ds-text-body-md text-[var(--ds-text-secondary)]">
            A polished Clerk + Neon example using Server Actions, Drizzle, Tailwind CSS, and shadcn-style components.
          </p>
        </div>

      {existingMessage ? (
        <Card variant="elevated" className="w-full ds-card-elevated">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ds-success)]/10 text-[var(--ds-success)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle>Your saved message</CardTitle>
            <CardDescription>
              This message is stored in Neon and associated with your Clerk user ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-[var(--ds-border-strong)] bg-[var(--ds-neutral-50)] p-6 text-center shadow-inner">
              <p className="text-xl font-medium leading-relaxed text-[var(--ds-text-primary)]">
                {existingMessage.message}
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-4 max-sm:flex-col">
            <div className="flex items-center gap-2 text-sm text-[var(--ds-text-muted)]">
              <Database className="h-4 w-4" />
              Synced to Neon Postgres
            </div>
            <form action={deleteUserMessage}>
              <Button type="submit" variant="destructive" className="gap-2 rounded-xl">
                <Trash2 className="h-4 w-4" />
                Delete Message
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <Card variant="elevated" className="w-full ds-card-elevated">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ds-text-primary)] text-white">
              <MessageSquareText className="h-7 w-7" />
            </div>
            <CardTitle>Create your message</CardTitle>
            <CardDescription>
              Save a message to Neon using your authenticated Clerk user ID.
            </CardDescription>
          </CardHeader>
          <form action={createUserMessage}>
            <CardContent>
              <Input
                type="text"
                name="message"
                placeholder="Enter a message"
                className="h-12"
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="h-11 w-full">
                Save Message
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      </section>
    </main>
  );
}
