import { SignIn } from "@clerk/nextjs";

function getDashboardUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
  }
  return "/dashboard";
}

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-sm border border-border bg-card",
        },
      }}
      forceRedirectUrl={getDashboardUrl()}
      signUpUrl="/sign-up"
    />
  );
}
