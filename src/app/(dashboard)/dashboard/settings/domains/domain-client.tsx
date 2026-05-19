"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Loader2, AlertCircle, Trash2, X, RefreshCw, Copy } from "lucide-react";

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string;
  isDefault: boolean;
  linkCount: number;
}

export function DomainsClient({ workspaceId }: { workspaceId: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [addedDomainData, setAddedDomainData] = useState<{
    id: string;
    domain: string;
    verificationToken: string;
    cnameTarget: string;
    txtRecord: string;
  } | null>(null);

  useEffect(() => {
    fetchDomains();
  }, [workspaceId]);

  async function fetchDomains() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/domains?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain) return;

    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, domain: newDomain.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setAddedDomainData(data);
        setStep(2);
        fetchDomains(); // refresh list
      } else {
        alert(data.error || "Failed to add domain");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  }

  async function handleVerify(id: string) {
    setVerifying(true);
    setVerifyMessage("");
    try {
      const res = await fetch(`/api/domains/${id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (data.verified) {
        setVerifyMessage("Verified successfully!");
        fetchDomains();
        setTimeout(() => {
          setIsSlideOverOpen(false);
          setStep(1);
          setNewDomain("");
          setAddedDomainData(null);
          setVerifyMessage("");
        }, 2000);
      } else {
        setVerifyMessage(data.message || "TXT record not found yet.");
      }
    } catch (err) {
      console.error(err);
      setVerifyMessage("Error occurred during verification.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this domain? All links using it will revert to the default domain.")) return;
    
    try {
      const res = await fetch(`/api/domains/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (res.ok) {
        fetchDomains();
      } else {
        alert(data.error || "Failed to delete domain");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      const res = await fetch(`/api/domains/${id}`, {
        method: "PATCH",
      });
      if (res.ok) {
        fetchDomains();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to set domain as primary");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Custom Domains</h1>
          <p className="text-sm text-slate-400">Connect your own domain to brand your short links</p>
        </div>
        <button
          onClick={() => {
            setStep(1);
            setNewDomain("");
            setAddedDomainData(null);
            setIsSlideOverOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : domains.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-12 text-center">
          <p className="text-slate-400">No custom domains added yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {domains.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-mono text-lg font-semibold text-white truncate">{d.domain}</h3>
                  {d.verified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      <Check className="h-3 w-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Pending DNS
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">{d.linkCount} active link{d.linkCount !== 1 ? 's' : ''}</p>
              </div>
              
              <div className="mt-6 flex items-center justify-between">
                {d.verified ? (
                  d.isDefault ? (
                    <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="h-4 w-4" /> Primary
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleSetPrimary(d.id)}
                      className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Set as Primary
                    </button>
                  )
                ) : (
                  <button 
                    onClick={() => {
                      setAddedDomainData({
                        id: d.id,
                        domain: d.domain,
                        verificationToken: d.verificationToken,
                        cnameTarget: "links.linkforge.app",
                        txtRecord: `_linkforge-verify.${d.domain}`
                      });
                      setStep(2);
                      setIsSlideOverOpen(true);
                    }}
                    className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View Setup Instructions
                  </button>
                )}
                
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                  title="Delete domain"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Panel */}
      {isSlideOverOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">Add Custom Domain</h2>
              <button 
                onClick={() => setIsSlideOverOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step === 1 ? (
              <form onSubmit={handleAddDomain} className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Domain Name</label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                    placeholder="go.acmecorp.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500">Do not include http:// or trailing slashes.</p>
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                  >
                    Next Step
                  </button>
                </div>
              </form>
            ) : addedDomainData && (
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-400 mb-1">DNS Configuration Required</h4>
                    <p className="text-sm text-slate-400">Add these records to your domain's DNS settings.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">1. CNAME Record</h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <div className="grid grid-cols-3 text-xs font-semibold text-slate-500 border-b border-slate-800 bg-slate-900/50 px-4 py-2">
                      <div>Type</div>
                      <div>Name</div>
                      <div>Value</div>
                    </div>
                    <div className="grid grid-cols-3 text-sm text-slate-300 px-4 py-3 font-mono items-center">
                      <div>CNAME</div>
                      <div>go <span className="text-slate-600 text-xs">(or @)</span></div>
                      <div className="flex items-center justify-between">
                        <span className="truncate">{addedDomainData.cnameTarget}</span>
                        <button onClick={() => copyToClipboard(addedDomainData.cnameTarget)} className="text-slate-500 hover:text-white">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">2. Verification TXT Record</h4>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                    <div className="grid grid-cols-3 text-xs font-semibold text-slate-500 border-b border-slate-800 bg-slate-900/50 px-4 py-2">
                      <div>Type</div>
                      <div>Name</div>
                      <div>Value</div>
                    </div>
                    <div className="grid grid-cols-3 text-sm text-slate-300 px-4 py-3 font-mono items-center">
                      <div>TXT</div>
                      <div className="flex items-center justify-between pr-2">
                        <span className="truncate" title={addedDomainData.txtRecord}>{addedDomainData.txtRecord}</span>
                        <button onClick={() => copyToClipboard(addedDomainData.txtRecord)} className="text-slate-500 hover:text-white">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="truncate">{addedDomainData.verificationToken}</span>
                        <button onClick={() => copyToClipboard(addedDomainData.verificationToken)} className="text-slate-500 hover:text-white">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <button
                    onClick={() => handleVerify(addedDomainData.id)}
                    disabled={verifying}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Check Verification Status
                  </button>
                  {verifyMessage && (
                    <p className={`mt-3 text-center text-sm ${verifyMessage.includes("success") ? "text-emerald-400" : "text-amber-400"}`}>
                      {verifyMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
