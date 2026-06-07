"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Check, Loader2, AlertCircle, Trash2, X,
  RefreshCw, Copy, Globe, Shield,
  ArrowRight, CheckCircle2, XCircle,
  Clock, AlertTriangle, MoreHorizontal,
  ExternalLink, Calendar, Server, Flag,
  ChevronDown, ChevronRight, Layers
} from "lucide-react";
import { useSafeFetch } from "@/hooks/useBillingError";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string;
  isDefault: boolean;
  linkCount: number;
  createdAt: string;
  role?: "links" | "bio" | "both";
  isApex?: boolean;
  status?: "active" | "suspended_billing" | "suspended_abuse";
  rootRedirectUrl?: string | null;
  cfHostnameId: string | null;
  cfHostnameStatus: string | null;
  cfSslStatus: string | null;
  cfError: string | null;
  cfVerificationErrors: string[] | null;
  cfSslValidationErrors: Array<{ message?: string }> | null;
  cfValidationRecords: Array<{
    cname?: string;
    cname_target?: string;
    txt_name?: string;
    txt_value?: string;
    http_url?: string;
    http_body?: string;
  }> | null;
}

const CNAME_TARGET = "links.pivoturl.com";

type StatusLevel = "success" | "pending" | "error" | "inactive";

function classifyStatus(status: string | null): StatusLevel {
  if (!status) return "inactive";
  if (status === "active") return "success";
  if (["validation_timed_out", "initializing_timed_out", "blocked", "test_blocked", "test_failed", "moved"].includes(status))
    return "error";
  if (["pending", "initializing", "pending_validation", "pending_issuance", "pending_deployment", "pending_provisioned", "test_pending"].includes(status))
    return "pending";
  return "inactive";
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function RowMenu({ onDelete, onSetup, onSetPrimary, isVerified, isDefault }: {
  onDelete: () => void;
  onSetup?: () => void;
  onSetPrimary?: () => void;
  isVerified: boolean;
  isDefault: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-xl shadow-black/10 py-1 z-50">
          {!isVerified && onSetup && (
            <button onClick={() => { setOpen(false); onSetup(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> View Setup
            </button>
          )}
          {isVerified && !isDefault && onSetPrimary && (
            <button onClick={() => { setOpen(false); onSetPrimary(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
              <Check className="h-3.5 w-3.5" /> Set as Primary
            </button>
          )}
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete Domain
          </button>
        </div>
      )}
    </div>
  );
}

export function DomainsClient({ workspaceId }: { workspaceId: string }) {
  const safeFetch = useSafeFetch();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usage, setUsage] = useState<{
    plan: string; limit: number; used: number;
    active: number; disabled: number; suspended: number; atLimit: boolean;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; domain: string; linkCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifySeverity, setVerifySeverity] = useState<"success" | "warning" | "error" | null>(null);
  const [canRevalidate, setCanRevalidate] = useState(false);
  const [cnameDnsVerified, setCnameDnsVerified] = useState<boolean | null>(null);
  const [cfOwnershipRecord, setCfOwnershipRecord] = useState<{ name?: string; type?: string; value?: string } | null>(null);
  const [cfValidationRecords, setCfValidationRecords] = useState<Array<{ cname?: string; cname_target?: string; txt_name?: string; txt_value?: string }> | null>(null);
  const [activeDomain, setActiveDomain] = useState<{
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
    // Refresh usage breakdown alongside the list (non-blocking).
    try {
      const ures = await fetch(`/api/domains/usage?workspaceId=${workspaceId}`);
      if (ures.ok) setUsage(await ures.json());
    } catch { /* ignore */ }
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain) return;
    setAdding(true);
    try {
      const res = await safeFetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, domain: newDomain.trim() }),
      });
      if (!res) return;
      const data = await res.json();
      if (res.ok) {
        setActiveDomain({
          id: data.id,
          domain: data.domain,
          verificationToken: data.verificationToken,
          cnameTarget: CNAME_TARGET,
          txtRecord: `_pivoturl-verify.${data.domain}`,
        });
        setVerifyMessage("");
        setVerifySeverity(null);
        setCanRevalidate(false);
        setNewDomain("");
        setShowAddForm(false);
        setExpandedId(data.id);
        fetchDomains();
      } else {
        setVerifySeverity("error");
        setVerifyMessage(data.error?.message || data.error || "Failed to add domain");
      }
    } catch {
      setVerifySeverity("error");
      setVerifyMessage("Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(id: string) {
    setVerifying(true);
    setVerifyMessage("");
    setVerifySeverity(null);
    setCanRevalidate(false);
    try {
      const res = await safeFetch(`/api/domains/${id}/verify`, { method: "POST" });
      if (!res) return;
      const data = await res.json();
      if (data.cnameVerified !== undefined) {
        setCnameDnsVerified(data.cnameVerified);
      }
      if (data.ownershipVerification) {
        setCfOwnershipRecord(data.ownershipVerification);
      }
      if (data.validationRecords) {
        setCfValidationRecords(data.validationRecords);
      }
      if (data.verified) {
        setVerifySeverity("success");
        setVerifyMessage("Domain verified successfully! SSL is active and ready.");
        fetchDomains();
      } else {
        setVerifySeverity(data.severity || "warning");
        setVerifyMessage(data.message || "TXT record not found yet.");
        setCanRevalidate(data.canRevalidate || false);
      }
    } catch {
      setVerifySeverity("error");
      setVerifyMessage("Error occurred during verification.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleRevalidate(id: string) {
    setRevalidating(true);
    try {
      const res = await safeFetch(`/api/domains/${id}/revalidate`, { method: "POST" });
      if (!res) return;
      const data = await res.json();
      if (res.ok) {
        setVerifySeverity("success");
        setVerifyMessage(data.message || "Revalidation triggered.");
        setCanRevalidate(false);
      } else {
        setVerifySeverity("error");
        setVerifyMessage(data.error || "Revalidation failed.");
      }
    } catch {
      setVerifySeverity("error");
      setVerifyMessage("Error during revalidation.");
    } finally {
      setRevalidating(false);
    }
  }

  function handleDelete(id: string, domain: string, linkCount: number) {
    setDeleteDialog({ id, domain, linkCount });
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteDialog) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await safeFetch(`/api/domains/${deleteDialog.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res) { setDeleting(false); return; }
      if (res.ok) {
        if (expandedId === deleteDialog.id) setExpandedId(null);
        if (activeDomain?.id === deleteDialog.id) { setActiveDomain(null); setVerifyMessage(""); }
        setDeleteDialog(null);
        fetchDomains();
      } else {
        const data = await res.json();
        const err = data?.error;
        setDeleteError(typeof err === "string" ? err : err?.message || "Failed to delete domain");
      }
    } catch {
      setDeleteError("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      const res = await safeFetch(`/api/domains/${id}`, { method: "PATCH" });
      if (!res) return;
      if (res.ok) fetchDomains();
      else { const data = await res.json(); alert(data.error || "Failed to set domain as primary"); }
    } catch { alert("Something went wrong"); }
  }

  async function handleSetRole(id: string, role: "links" | "bio" | "both") {
    try {
      const res = await safeFetch(`/api/domains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setRole", role }),
      });
      if (!res) return;
      if (res.ok) {
        fetchDomains();
      } else {
        const data = await res.json();
        const code = data?.error?.code;
        if (code === "ROLE_HAS_BINDINGS") {
          alert("Remove the bio page or short links on this domain before changing its role.");
        } else {
          alert(data?.error?.message || data?.error || "Failed to change role");
        }
      }
    } catch { alert("Something went wrong"); }
  }

  const toggleExpand = (id: string, d: Domain) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setVerifyMessage("");
    setVerifySeverity(null);
    setCanRevalidate(false);
    setCnameDnsVerified(null);
    setCfOwnershipRecord(null);
    setCfValidationRecords(null);
    setActiveDomain({
      id: d.id,
      domain: d.domain,
      verificationToken: d.verificationToken,
      cnameTarget: CNAME_TARGET,
      txtRecord: `_pivoturl-verify.${d.domain}`,
    });
  };

  const renderStatusBadge = (d: Domain) => {
    if (d.verified) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </span>
      );
    }
    if (d.cfError) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 border border-red-200">
          <XCircle className="h-3 w-3" />
          Error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Pending
      </span>
    );
  };

  const dnsRecords = (d: Domain) => {
    const cfCnameLevel = classifyStatus(d.cfHostnameStatus);
    // Use DNS CNAME check result if available, otherwise fall back to CF status
    const cnameLevel: StatusLevel =
      cnameDnsVerified === true ? "success" :
      cfCnameLevel === "error" ? "error" :
      cnameDnsVerified === false ? "pending" :
      cfCnameLevel;

    const records: Array<{ type: string; name: string; content: string; ttl: string; status: string; level: StatusLevel }> = [
      {
        type: "CNAME",
        name: d.domain.split(".")[0],
        content: CNAME_TARGET,
        ttl: "Auto",
        status: cnameLevel === "success" ? "Verified" : cnameLevel === "error" ? "Error" : "Pending",
        level: cnameLevel,
      },
      {
        type: "TXT",
        name: `_pivoturl-verify.${d.domain}`,
        content: d.verificationToken,
        ttl: "Auto",
        status: d.verified ? "Verified" : "Pending",
        level: d.verified ? "success" as StatusLevel : "pending" as StatusLevel,
      },
    ];

    // Cloudflare ownership verification TXT record (returned by CF API after custom hostname creation)
    if (cfOwnershipRecord?.name && cfOwnershipRecord?.value) {
      records.push({
        type: "TXT",
        name: cfOwnershipRecord.name,
        content: cfOwnershipRecord.value,
        ttl: "Auto",
        status: "Pending",
        level: "pending" as StatusLevel,
      });
    }

    // Cloudflare DCV delegation records (for SSL certificate validation)
    if (cfValidationRecords) {
      for (const vr of cfValidationRecords) {
        if (vr.cname && vr.cname_target) {
          records.push({
            type: "CNAME",
            name: vr.cname,
            content: vr.cname_target,
            ttl: "Auto",
            status: "Pending",
            level: "pending" as StatusLevel,
          });
        }
        if (vr.txt_name && vr.txt_value) {
          records.push({
            type: "TXT",
            name: vr.txt_name,
            content: vr.txt_value,
            ttl: "Auto",
            status: "Pending",
            level: "pending" as StatusLevel,
          });
        }
      }
    }

    return records;
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-5">
      {/* Plan / domain usage panel (custom-domain-assignment Req 21) */}
      {usage && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-black capitalize">{usage.plan} plan</span>
            <span className="text-gray-600">
              {usage.limit === -1
                ? `${usage.used} domains used`
                : `${usage.used} / ${usage.limit} domains used`}
            </span>
            {usage.disabled > 0 && (
              <span className="text-amber-600">{usage.disabled} disabled after downgrade</span>
            )}
            {usage.suspended > 0 && (
              <span className="text-red-600">{usage.suspended} suspended</span>
            )}
          </div>
          {usage.atLimit && (
            <a
              href="/dashboard/billings"
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              Upgrade for more domains
            </a>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-black">Custom Domains</h1>
          <p className="text-sm text-gray-500 mt-0.5">Connect your own domain to brand your links</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setActiveDomain(null); setVerifyMessage(""); setNewDomain(""); }}
          className="inline-flex items-center gap-2 rounded-lg bg-black hover:bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-all shadow-lg shadow-black/10"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      {/* Inline Add Form */}
      {showAddForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <form onSubmit={handleAddDomain} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Domain Name</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                  placeholder="go.acmecorp.com"
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:ring-1 focus:ring-black/20 outline-none transition-all"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-2 rounded-lg bg-black hover:bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50 shrink-0"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Add
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="p-2 text-gray-400 hover:text-black transition-colors">
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_140px_110px_44px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div>Domain</div>
          <div>Status</div>
          <div>Created</div>
          <div></div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 rounded-b-lg">
            <Loader2 className="h-5 w-5 animate-spin text-black" />
          </div>
        ) : domains.length === 0 ? (
          <div className="py-14 text-center">
            <Globe className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600 mb-1">No domains yet</p>
            <p className="text-xs text-gray-400 mb-4">Add a domain to brand your short links.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-black hover:bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Domain
            </button>
          </div>
        ) : (
          <div>
            {domains.map((d, index) => {
              const isExpanded = expandedId === d.id;
              const isLast = index === domains.length - 1;
              return (
                <div key={d.id} className={`border-b border-gray-100 last:border-b-0 ${isLast ? 'rounded-b-lg' : ''}`}>
                  {/* Row */}
                  <div
                    onClick={() => toggleExpand(d.id, d)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(d.id, d); }}}
                    role="button"
                    tabIndex={0}
                    className="w-full grid grid-cols-[1fr_140px_110px_44px] gap-4 px-5 py-3.5 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        d.verified ? "bg-emerald-50" : "bg-gray-100"
                      }`}>
                        {d.verified ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Globe className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-medium text-black truncate block">{d.domain}</span>
                      </div>
                      {d.isDefault && d.verified && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                          <Check className="h-2.5 w-2.5" />
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {renderStatusBadge(d)}
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="h-3 w-3 mr-1.5 text-gray-300" />
                      {timeAgo(d.createdAt)}
                    </div>
                    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        onDelete={() => handleDelete(d.id, d.domain, d.linkCount)}
                        onSetup={() => toggleExpand(d.id, d)}
                        onSetPrimary={() => handleSetPrimary(d.id)}
                        isVerified={d.verified}
                        isDefault={d.isDefault}
                      />
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && activeDomain && (
                    <div className="border-t border-gray-200 bg-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="px-5 py-5 space-y-5">
                        {/* Domain Detail Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                              <Globe className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <h2 className="text-base font-semibold text-black font-mono">{activeDomain.domain}</h2>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Created {timeAgo(d.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Server className="h-3 w-3" /> Cloudflare
                                </span>
                                <span className="flex items-center gap-1">
                                  <Flag className="h-3 w-3" /> {d.linkCount} link{d.linkCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Callout */}
                        {verifyMessage && (
                          <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm ${
                            verifySeverity === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            verifySeverity === "error" ? "bg-red-50 border-red-200 text-red-700" :
                            "bg-amber-50 border-amber-200 text-amber-700"
                          }`}>
                            {verifySeverity === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> :
                             verifySeverity === "error" ? <XCircle className="h-4 w-4 shrink-0 mt-0.5" /> :
                             <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                            <span>{verifyMessage}</span>
                          </div>
                        )}

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1.5 text-xs text-gray-600">
                            Status: {renderStatusBadge(d)}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            CNAME DNS: <span className={`font-medium ${
                              cnameDnsVerified === true ? "text-emerald-600" :
                              cnameDnsVerified === false ? "text-amber-600" :
                              "text-gray-400"
                            }`}>
                              {cnameDnsVerified === true ? "pointing correctly" : cnameDnsVerified === false ? "not pointing here" : "not checked"}
                            </span>
                          </span>
                          {d.cfHostnameId && (
                            <>
                              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                CF Hostname: <span className={`font-medium ${classifyStatus(d.cfHostnameStatus) === "success" ? "text-emerald-600" : classifyStatus(d.cfHostnameStatus) === "error" ? "text-red-600" : "text-amber-600"}`}>
                                  {d.cfHostnameStatus ? d.cfHostnameStatus.replace(/_/g, " ") : "—"}
                                </span>
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                SSL: <span className={`font-medium ${classifyStatus(d.cfSslStatus) === "success" ? "text-emerald-600" : classifyStatus(d.cfSslStatus) === "error" ? "text-red-600" : "text-amber-600"}`}>
                                  {d.cfSslStatus ? d.cfSslStatus.replace(/_/g, " ") : "—"}
                                </span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Verify / Revalidate Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerify(activeDomain.id)}
                            disabled={verifying}
                            className="inline-flex items-center gap-2 rounded-lg bg-black hover:bg-gray-800 px-3.5 py-2 text-xs font-medium text-white transition-all disabled:opacity-50"
                          >
                            {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            {verifying ? "Checking..." : "Verify Now"}
                          </button>
                          {canRevalidate && (
                            <button
                              onClick={() => handleRevalidate(activeDomain.id)}
                              disabled={revalidating}
                              className="inline-flex items-center gap-2 rounded-lg bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-medium text-amber-700 border border-amber-200 transition-all disabled:opacity-50"
                            >
                              {revalidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                              {revalidating ? "Re-validating..." : "Re-validate SSL"}
                            </button>
                          )}
                        </div>

                        {/* Routing & assignment (custom-domain-assignment) */}
                        <div>
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5" />
                            Routing &amp; Assignment
                          </h3>
                          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                            {/* Role */}
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-black">Domain mode</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {d.role === "bio"
                                    ? "Serves a bio page at the root (/)."
                                    : d.role === "both"
                                    ? "Serves a root bio and short links at /{slug}."
                                    : "Serves short links at /{slug}."}
                                </div>
                              </div>
                              <select
                                value={d.role ?? "links"}
                                disabled={!d.verified}
                                onChange={(e) => handleSetRole(d.id, e.target.value as "links" | "bio" | "both")}
                                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-black disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="links">Links only</option>
                                <option value="bio">Bio only</option>
                                <option value="both">Both</option>
                              </select>
                            </div>

                            {/* Short links summary */}
                            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                              <div className="text-sm text-gray-700">
                                {d.linkCount} short link{d.linkCount !== 1 ? "s" : ""} on this domain
                              </div>
                              <a
                                href={`/dashboard/links?domainId=${d.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-black hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Open in Links
                              </a>
                            </div>

                            {/* Apex DNS hint */}
                            {d.isApex && (
                              <div className="border-t border-gray-100 pt-3 text-xs text-gray-500">
                                This is an apex domain. Use your DNS provider&apos;s CNAME
                                flattening / ALIAS record (not a plain CNAME) pointing to{" "}
                                <span className="font-mono text-gray-700">{CNAME_TARGET}</span>.
                              </div>
                            )}

                            {!d.verified && (
                              <div className="border-t border-gray-100 pt-3 text-xs text-amber-600">
                                Verify this domain before it can serve bio pages or links.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* DNS Records Table */}
                        <div>
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5" />
                            DNS Records
                          </h3>
                          <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <div className="grid grid-cols-[70px_1fr_1fr_60px_90px] text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                              {["Type", "Name", "Content", "TTL", "Status"].map((h) => (
                                <div key={h} className="px-4 py-2.5">{h}</div>
                              ))}
                            </div>
                            {dnsRecords(d).map((rec, i) => {
                              const level = rec.level;
                              return (
                                <div key={i} className={`grid grid-cols-[70px_1fr_1fr_60px_90px] text-sm border-b border-gray-100 last:border-b-0 ${
                                  level === "success" ? "bg-emerald-50/30" : level === "error" ? "bg-red-50/30" : ""
                                }`}>
                                  <div className={`px-4 py-3 font-mono text-xs font-semibold ${
                                    rec.type === "CNAME" ? "text-gray-800" : "text-emerald-600"
                                  }`}>{rec.type}</div>
                                  <div className="px-4 py-3 font-mono text-xs text-gray-700 truncate flex items-center gap-2 group">
                                    <span className="truncate">{rec.name}</span>
                                    <button onClick={() => copyToClipboard(rec.name)} className="text-gray-300 hover:text-black shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <div className="px-4 py-3 font-mono text-xs text-gray-500 truncate flex items-center gap-2 group">
                                    <span className="truncate">{rec.content}</span>
                                    <button onClick={() => copyToClipboard(rec.content)} className="text-gray-300 hover:text-black shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <div className="px-4 py-3 text-xs text-gray-400">{rec.ttl}</div>
                                  <div className="px-4 py-3 flex items-center">
                                    {level === "success" ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                        <CheckCircle2 className="h-3 w-3" /> Verified
                                      </span>
                                    ) : level === "error" ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                        <XCircle className="h-3 w-3" /> Error
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-xs text-gray-400">
                            Add these records at your DNS provider, then click &quot;Verify Now&quot;. DNS changes may take a few minutes to propagate.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteDialog}
        onOpenChange={(open) => { if (!open) { setDeleteDialog(null); setDeleteError(null); } }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle>Delete Domain</DialogTitle>
            <DialogDescription>
              {deleteError
                ? "An error occurred while deleting the domain."
                : deleteDialog && deleteDialog.linkCount > 0
                  ? `This domain is used by ${deleteDialog.linkCount} link(s). They will revert to the default domain.`
                  : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4">
            {deleteDialog && (
              <p className="text-sm text-foreground mb-1">
                Are you sure you want to delete <span className="font-mono font-medium">{deleteDialog.domain}</span>?
              </p>
            )}
            {deleteError && (
              <p className="text-sm text-red-600 mt-2">{deleteError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteDialog(null); setDeleteError(null); }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
