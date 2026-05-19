import { SignUp } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] p-8">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">LinkForge</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-sm p-6 shadow-2xl">
          <SignUp
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none bg-transparent border-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium transition-all duration-200",
                socialButtonsBlockButtonText: "text-white",
                formButtonPrimary: "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-medium shadow-lg transition-all duration-200",
                formFieldInput: "bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200",
                formFieldLabel: "text-gray-300 font-medium",
                footerActionLink: "text-violet-400 hover:text-violet-300 transition-colors",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-violet-400 hover:text-violet-300",
                verifiableFieldInput: "bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200",
                verifiableFieldButton: "text-violet-400 hover:text-violet-300",
              },
              layout: {
                socialButtonsVariant: "iconButton",
                showOptionalFields: false,
              },
              variables: {
                colorPrimary: "#8b5cf6",
                colorBackground: "#FBFBFE",
                colorInputBackground: "rgba(255, 255, 255, 0.05)",
                colorInputText: "#ffffff",
              },
            }}
            forceRedirectUrl="/dashboard"
            signInUrl="/sign-in"
          />
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          By creating an account, you agree to our{" "}
          <a href="/terms" className="text-violet-400 hover:text-violet-300 transition-colors">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-violet-400 hover:text-violet-300 transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
