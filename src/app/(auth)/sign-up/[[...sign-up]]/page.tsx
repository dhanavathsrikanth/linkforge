"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

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
      forceRedirectUrl={pendingLink ? "/dashboard/links" : "/dashboard"}
      signInUrl="/sign-in"
    />
  );
}
