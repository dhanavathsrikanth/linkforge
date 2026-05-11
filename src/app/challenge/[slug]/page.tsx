"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Lock, ShieldAlert, ArrowRight } from "lucide-react";

export default function ChallengePage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/links/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password }),
      });

      if (res.ok) {
        // Password verified and cookie set by server
        // Redirect back to the short link (which will now pass the worker check)
        // Or if we know the domain, we could redirect there.
        // But the simplest is to reload or redirect to /:slug
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Incorrect password");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-500 shadow-xl shadow-violet-500/10">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Password Protected Link
          </h1>
          <p className="mt-2 text-zinc-400">
            This link is protected. Please enter the password to proceed.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141418] p-8 shadow-2xl shadow-black/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-12 w-full rounded-lg border border-white/10 bg-[#09090b] px-4 py-2 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 border border-red-500/20">
                  <ShieldAlert className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-700 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Access Link
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            Powered by{" "}
            <a href="/" className="font-medium text-zinc-400 hover:text-white transition-colors">
              LinkForge
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
