import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden ds-surface-gradient px-6 py-12">
      <div className="absolute right-[-12rem] top-20 h-96 w-96 rounded-full bg-[var(--ds-secondary)]/40 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-[-10rem] h-80 w-80 rounded-full bg-[var(--ds-neutral-100)]/60 blur-3xl" />
      <section className="relative z-10 w-full max-w-3xl text-center">
        <div className="mb-8">
          <h1 className="ds-text-display text-[var(--ds-text-primary)] mb-4">
            Shorten, brand, and track links at scale
          </h1>
          <p className="mx-auto mt-4 max-w-xl ds-text-body-md text-[var(--ds-text-secondary)]">
            LinkForge is the most powerful link management platform for teams.
            Create branded short links, track every click, and generate QR codes.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-[var(--ds-primary)] text-white font-medium px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Get started free
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 bg-[var(--ds-neutral-100)] text-[var(--ds-text-primary)] font-medium px-8 py-3 rounded-xl hover:bg-[var(--ds-neutral-200)] transition-colors"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-neutral-50)] p-6">
            <h3 className="font-semibold mb-2">Smart Links</h3>
            <p className="text-sm text-muted-foreground">Custom slugs, UTM builders, password protection, expiry dates, and A/B testing.</p>
          </div>
          <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-neutral-50)] p-6">
            <h3 className="font-semibold mb-2">Deep Analytics</h3>
            <p className="text-sm text-muted-foreground">Real-time clicks, country breakdown, device stats, referrer tracking, and 7-day trends.</p>
          </div>
          <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-neutral-50)] p-6">
            <h3 className="font-semibold mb-2">QR Codes</h3>
            <p className="text-sm text-muted-foreground">Generate custom QR codes with your brand colours, logos, and error correction levels.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
