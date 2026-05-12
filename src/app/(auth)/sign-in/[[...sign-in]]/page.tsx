import { SignIn } from "@clerk/nextjs";
import { ArrowRight, Quote } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-[#FBFBFE]">
      {/* Left side - Dark with animated gradient background and testimonial */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-purple-500/10 to-fuchsia-600/20">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-violet-500/20 to-purple-600/10 animate-pulse" />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Welcome back to LinkForge
            </h1>
            <p className="text-xl text-gray-300 mb-12">
              The smart link management platform that grows with your business
            </p>
            
            {/* Testimonial */}
            <div className="border-l-2 border-violet-500/30 pl-6">
              <Quote className="w-6 h-6 text-violet-400 mb-3" />
              <blockquote className="text-gray-200 text-lg leading-relaxed mb-4">
                "LinkForge transformed how we manage our marketing links. The analytics are incredible and the interface is beautiful."
              </blockquote>
              <cite className="text-gray-400 text-sm not-italic">
                Sarah Chen • Marketing Director at TechCorp
              </cite>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Sign in form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">LinkForge</span>
            </div>
          </div>

          {/* Clerk SignIn component with custom appearance */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-sm p-6 shadow-2xl">
            <SignIn 
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
              signUpUrl="/sign-up"
            />
          </div>

          {/* Bottom text */}
          <p className="text-center text-gray-400 text-sm mt-6">
            By signing in, you agree to our{" "}
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
    </div>
  );
}
