"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

function getDashboardUrl(pendingLink?: string | null) {
  const path = pendingLink ? "/dashboard/links" : "/dashboard";
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
  }
  return path;
}

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const pendingLink = searchParams.get("pendingLink");

  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-sm border border-border bg-card",
        },
      }}
      forceRedirectUrl={getDashboardUrl(pendingLink)}
      signInUrl="/sign-in"
    />
  );
}
