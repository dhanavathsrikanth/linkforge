import { useState, useEffect, useCallback, useRef } from "react";
import { getApiKey, setApiKey as saveKey, removeApiKey, getApiUrl, setApiUrl, getRecentLinks, addRecentLink } from "../../shared/storage";
import { createShortLink, ApiError, type ShortLink } from "../../shared/api";

type View = "main" | "settings" | "recent";

interface PageInfo {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
}

const LINKFORGE_DOMAIN = "https://linkforge.app";

export default function App() {
  const [view, setView] = useState<View>("main");
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [apiUrl, setApiUrlState] = useState<string>(LINKFORGE_DOMAIN);
  const [destination, setDestination] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentLinks, setRecentLinks] = useState<ShortLink[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const key = await getApiKey();
      setApiKeyState(key);
      const url = await getApiUrl();
      if (url) setApiUrlState(url);
      const recent = await getRecentLinks();
      setRecentLinks(recent);
    })();
  }, []);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        setDestination(tab.url);
        setTitle(tab.title || "");
      }
    });

    chrome.runtime.sendMessage({ type: "GET_PAGE_INFO" }, (response: PageInfo | null) => {
      if (response?.url) {
        setPageInfo(response);
        if (response.url !== destination) {
          setDestination(response.url);
        }
        if (response.title) setTitle(response.title);
      }
    });
  }, []);

  const handleShorten = useCallback(async () => {
    if (!destination.trim()) return;
    if (!apiKey) {
      setView("settings");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await createShortLink(
        apiKey,
        {
          destination: destination.trim(),
          slug: slug.trim() || undefined,
          title: title.trim() || undefined,
        },
        apiUrl,
      );
      setResult(res.shortUrl);
      await addRecentLink(res.data);
      setRecentLinks(await getRecentLinks());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid API key. Update it in settings.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create link");
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [destination, slug, title, apiKey, apiUrl]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [result]);

  const handleSaveKey = useCallback(async () => {
    if (!keyInput.trim()) return;
    await saveKey(keyInput.trim());
    setApiKeyState(keyInput.trim());
    setView("main");
  }, [keyInput]);

  const handleSaveUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    await setApiUrl(urlInput.trim());
    setApiUrlState(urlInput.trim());
  }, [urlInput]);

  const handleClearKey = useCallback(async () => {
    await removeApiKey();
    setApiKeyState(null);
    setView("main");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleShorten();
  }, [handleShorten]);

  const handleOpenDashboard = useCallback(() => {
    chrome.tabs.create({ url: `${apiUrl}/dashboard/links` });
  }, [apiUrl]);

  const handleUseDetected = useCallback(() => {
    if (pageInfo?.url && pageInfo.url !== destination) {
      setDestination(pageInfo.url);
    }
  }, [pageInfo, destination]);

  if (view === "settings") {
    return (
      <SettingsView
        apiKey={apiKey}
        keyInput={keyInput}
        setKeyInput={setKeyInput}
        apiUrl={apiUrl}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        onSave={handleSaveKey}
        onSaveUrl={handleSaveUrl}
        onClear={handleClearKey}
        onBack={() => setView("main")}
      />
    );
  }

  if (view === "recent") {
    return (
      <RecentLinksView
        links={recentLinks}
        onBack={() => setView("main")}
      />
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <Header
        hasKey={!!apiKey}
        onSettings={() => {
          setKeyInput(apiKey || "");
          setUrlInput(apiUrl);
          setView("settings");
        }}
        onRecent={() => {
          setRecentLinks(prev => prev);
          getRecentLinks().then(setRecentLinks);
          setView("recent");
        }}
      />

      <div style={{ marginTop: "12px" }}>
        <label style={labelStyle}>Destination URL</label>
        <input
          ref={inputRef}
          type="url"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          style={inputStyle}
          autoFocus
        />

        {pageInfo && pageInfo.url !== destination && (
          <button onClick={handleUseDetected} style={detectedStyle}>
            Use detected canonical URL: {truncate(pageInfo.url, 40)}
          </button>
        )}
      </div>

      <div style={{ marginTop: "8px" }}>
        <label style={labelStyle}>Custom slug (optional)</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="my-custom-slug"
          style={inputStyle}
        />
      </div>

      <div style={{ marginTop: "8px" }}>
        <label style={labelStyle}>Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={pageInfo?.title || "Link title"}
          style={inputStyle}
        />
      </div>

      {error && (
        <div style={{ marginTop: "8px", padding: "8px 10px", background: "#3b0a0a", borderRadius: "6px", fontSize: "12px", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "8px", padding: "10px", background: "#0a2e1a", borderRadius: "8px", border: "1px solid #166534" }}>
          <div style={{ fontSize: "11px", color: "#86efac", marginBottom: "4px" }}>Short link created</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <a href={result} target="_blank" style={{ color: "#a78bfa", fontSize: "14px", fontWeight: 600, textDecoration: "none", flex: 1, wordBreak: "break-all" }}>
              {result}
            </a>
            <button onClick={handleCopy} style={copyBtnStyle}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleShorten}
        disabled={!destination.trim() || loading}
        style={{
          ...shortenBtnStyle,
          opacity: !destination.trim() || loading ? 0.5 : 1,
        }}
      >
        {loading ? "Creating..." : "Shorten"}
      </button>

      <div style={{ marginTop: "12px", textAlign: "center" }}>
        <button onClick={handleOpenDashboard} style={dashboardLinkStyle}>
          Open dashboard
        </button>
      </div>
    </div>
  );
}

function Header({
  hasKey,
  onSettings,
  onRecent,
}: {
  hasKey: boolean;
  onSettings: () => void;
  onRecent: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "24px", height: "24px", borderRadius: "6px",
          background: "linear-gradient(135deg, #7c3aed, #c026d3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: 700, color: "white",
        }}>
          L
        </div>
        <span style={{ fontWeight: 600, fontSize: "15px" }}>LinkForge</span>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <button onClick={onRecent} style={iconBtnStyle} title="Recent links">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
        <button onClick={onSettings} style={iconBtnStyle} title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </div>
  );
}

function SettingsView({
  apiKey,
  keyInput,
  setKeyInput,
  apiUrl,
  urlInput,
  setUrlInput,
  onSave,
  onSaveUrl,
  onClear,
  onBack,
}: {
  apiKey: string | null;
  keyInput: string;
  setKeyInput: (v: string) => void;
  apiUrl: string;
  urlInput: string;
  setUrlInput: (v: string) => void;
  onSave: () => void;
  onSaveUrl: () => void;
  onClear: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <button onClick={onBack} style={iconBtnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
        </button>
        <span style={{ fontWeight: 600, fontSize: "15px" }}>Settings</span>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>API Key {apiKey ? "(configured)" : "(required)"}</label>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="lf_sk_..."
          style={inputStyle}
        />
        <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
          Generate from LinkForge Dashboard → Developers → API Keys
        </p>
        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
          <button onClick={onSave} disabled={!keyInput.trim()} style={{ ...smallBtnStyle, flex: 1 }}>Save</button>
          {apiKey && <button onClick={onClear} style={{ ...smallBtnStyle, flex: 1, background: "#3b0a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }}>Remove</button>}
        </div>
      </div>

      <div>
        <label style={labelStyle}>API URL</label>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://linkforge.app"
          style={inputStyle}
        />
        <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
          Custom self-hosted URL (leave default for LinkForge Cloud)
        </p>
        <button onClick={onSaveUrl} disabled={!urlInput.trim()} style={{ ...smallBtnStyle, marginTop: "6px", width: "100%" }}>
          Save
        </button>
      </div>
    </div>
  );
}

function RecentLinksView({
  links,
  onBack,
}: {
  links: ShortLink[];
  onBack: () => void;
}) {
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <button onClick={onBack} style={iconBtnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
        </button>
        <span style={{ fontWeight: 600, fontSize: "15px" }}>Recent Links</span>
      </div>

      {links.length === 0 ? (
        <p style={{ textAlign: "center", color: "#64748b", fontSize: "13px", marginTop: "40px" }}>
          No links created yet
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {links.map((link) => (
            <div
              key={link.id}
              style={{
                padding: "10px",
                background: "#1a1a2e",
                borderRadius: "8px",
                border: "1px solid #1e293b",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa", wordBreak: "break-all", marginBottom: "2px" }}>
                {link.domain ? `https://${link.domain}/${link.slug}` : `https://lf.ee/${link.slug}`}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {link.title || link.destination}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#94a3b8",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "36px",
  padding: "0 10px",
  fontSize: "13px",
  background: "#1a1a2e",
  border: "1px solid #1e293b",
  borderRadius: "6px",
  color: "#e2e8f0",
  outline: "none",
};

const shortenBtnStyle: React.CSSProperties = {
  width: "100%",
  height: "40px",
  marginTop: "12px",
  border: "none",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #7c3aed, #c026d3)",
  color: "white",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const smallBtnStyle: React.CSSProperties = {
  height: "32px",
  padding: "0 12px",
  border: "none",
  borderRadius: "6px",
  background: "#7c3aed",
  color: "white",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
};

const copyBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  border: "none",
  borderRadius: "4px",
  background: "#166534",
  color: "#86efac",
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const iconBtnStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: "6px",
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
};

const dashboardLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#64748b",
  fontSize: "12px",
  cursor: "pointer",
  textDecoration: "underline",
};

const detectedStyle: React.CSSProperties = {
  display: "block",
  marginTop: "4px",
  background: "none",
  border: "none",
  color: "#a78bfa",
  fontSize: "11px",
  cursor: "pointer",
  textAlign: "left",
  padding: "4px 0",
};
