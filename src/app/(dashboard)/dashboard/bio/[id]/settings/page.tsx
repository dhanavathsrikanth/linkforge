import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { fetchBioForEditor } from "@/lib/bio/page-data";
import { BioSettingsPage } from "@/components/bio/standalone/BioSettingsPage";

export const metadata = { title: "Bio settings" };

export default async function BioSettings({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) redirect("/sign-in");

  const { id } = await params;
  const result = await fetchBioForEditor(id, dbUser.id);
  if (!result) notFound();

  return (
    <BioSettingsPage initialData={result.pageData} domains={result.domains} />
  );
}
