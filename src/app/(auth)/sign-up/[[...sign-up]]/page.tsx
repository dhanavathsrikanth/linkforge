import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-sm border border-border bg-card",
        },
      }}
      forceRedirectUrl="/dashboard"
      signInUrl="/sign-in"
    />
  );
}
