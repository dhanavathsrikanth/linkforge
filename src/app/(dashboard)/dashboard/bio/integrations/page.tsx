import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getOrCreateDbUser } from "@/lib/auth";
import { BioIntegrationsPage } from "@/components/bio/standalone/BioIntegrationsPage";

export const metadata = { title: "Bio integrations" };

export default async function BioIntegrationsRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) redirect("/sign-in");

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard/bio"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to pages
      </Link>
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect accounts once. Live data blocks across all your bio pages will use them.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <BioIntegrationsPage />
      </div>
    </div>
  );
}
