"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, RefreshCw, Loader2 } from "lucide-react";
// Remove toast dependency for now
const toast = ({ title, description, variant }: any) => {
  alert(`${title}: ${description}`);
};

interface DomainVerificationProps {
  domainId: string;
  domainName: string;
  token: string;
  isVerified: boolean;
}

export function DomainVerification({ domainId, domainName, token, isVerified }: DomainVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleVerify() {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: "Domain Verified!",
          description: "Your custom domain is now active.",
        });
        window.location.reload();
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "DNS records not found. Please wait and try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Value copied to clipboard.",
    });
  };

  if (isVerified) {
    return (
      <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
        <div className="flex items-center gap-3 text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">Domain Verified and Active</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-3 text-violet-400">
        <AlertCircle className="h-5 w-5" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Verification Required</h3>
      </div>

      <p className="text-sm text-zinc-400">
        To use <span className="text-white font-mono">{domainName}</span>, add the following DNS record to your domain provider (e.g., Cloudflare, Namecheap).
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Record Type</label>
          <div className="flex h-10 items-center rounded-lg border border-white/10 bg-[#09090b] px-3 text-sm text-white">
            TXT
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Host / Name</label>
          <div className="flex h-10 items-center justify-between rounded-lg border border-white/10 bg-[#09090b] px-3 text-sm text-white">
            <code className="text-violet-300">_linkforge</code>
            <button onClick={() => copyToClipboard("_linkforge")} className="text-zinc-500 hover:text-white transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="col-span-full space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Value</label>
          <div className="flex h-10 items-center justify-between rounded-lg border border-white/10 bg-[#09090b] px-3 text-sm text-white">
            <code className="text-violet-300 truncate mr-2">linkforge-verification={token}</code>
            <button onClick={() => copyToClipboard(`linkforge-verification=${token}`)} className="text-zinc-500 hover:text-white transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Verification may take up to 24 hours to propagate, but usually happens in minutes.
        </p>
        <button 
          onClick={handleVerify}
          disabled={isVerifying}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-50"
        >
          {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Check Status
        </button>
      </div>
    </div>
  );
}
