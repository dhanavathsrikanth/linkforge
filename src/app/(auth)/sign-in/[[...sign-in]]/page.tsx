import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-sm border border-border bg-card",
        },
      }}
      forceRedirectUrl="/dashboard"
      signUpUrl="/sign-up"
    />
  );
}
