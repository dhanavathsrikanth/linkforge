import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { fetchBioForEditor } from "@/lib/bio/page-data";
import { BioEditor } from "@/components/bio/BioEditor";

export const metadata = { title: "Edit bio page" };

export default async function BioEditPage({
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
    <div
      className="-m-4 sm:-m-6 lg:-m-10 h-screen overflow-hidden"
      style={{ position: "relative" }}
    >
      <BioEditor initialData={result.pageData} domains={result.domains} />
    </div>
  );
}
