export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    let badgeCount = 0;

    function detectPageInfo() {
      const url = getCanonicalUrl();
      const title = getMetaContent("og:title") || getMetaContent("twitter:title") || document.title;
      const description = getMetaContent("og:description") || getMetaContent("twitter:description");
      const image = getMetaContent("og:image") || getMetaContent("twitter:image");

      return { url, title, description, image };
    }

    function getCanonicalUrl(): string {
      const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (link?.href) return link.href;
      return window.location.href;
    }

    function getMetaContent(property: string): string | null {
      const el =
        document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`) ||
        document.querySelector<HTMLMetaElement>(`meta[name="${property}"]`);
      return el?.getAttribute("content") || null;
    }

    function detectExternalLinks(): HTMLLinkElement[] {
      const links = Array.from(document.querySelectorAll<HTMLLinkElement>("a[href]"));
      return links.filter((a) => {
        try {
          const url = new URL(a.href);
          return url.hostname !== window.location.hostname && url.protocol.startsWith("http");
        } catch {
          return false;
        }
      });
    }

    function addShortenButton(link: HTMLLinkElement) {
      if (link.dataset.linkforgeProcessed) return;
      link.dataset.linkforgeProcessed = "true";

      let btn: HTMLButtonElement | null = null;

      link.addEventListener("mouseenter", () => {
        if (btn) return;
        btn = document.createElement("button");
        btn.textContent = "Shorten";
        btn.style.cssText = `
          position: absolute;
          top: -24px;
          right: 0;
          z-index: 999999;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 11px;
          font-family: system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.15s;
        `;
        requestAnimationFrame(() => { if (btn) btn.style.opacity = "1"; });

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          shortenDetectedLink(link.href);
        });

        link.style.position = "relative";
        link.parentElement?.appendChild(btn);
      });

      link.addEventListener("mouseleave", () => {
        if (btn) {
          btn.remove();
          btn = null;
        }
      });
    }

    async function shortenDetectedLink(destination: string) {
      chrome.runtime.sendMessage(
        {
          type: "CREATE_LINK_DETECTED",
          payload: { destination, title: document.title },
        },
        (response) => {
          if (response?.shortUrl) {
            showToast(`Copied: ${response.shortUrl}`);
            navigator.clipboard.writeText(response.shortUrl).catch(() => {});
          } else if (response?.error) {
            showToast(`LinkForge: ${response.error}`);
          }
        },
      );
    }

    function showToast(message: string) {
      const toast = document.createElement("div");
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999999;
        background: #1a1a2e;
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-family: system-ui, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.2s ease-out;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }

    const style = document.createElement("style");
    style.textContent = `
      @keyframes linkforge-slide-in {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    const pageInfo = detectPageInfo();
    badgeCount = detectExternalLinks().length;

    chrome.runtime.sendMessage({ type: "PAGE_INFO", payload: pageInfo });

    if (badgeCount > 0) {
      chrome.runtime.sendMessage({ type: "SET_BADGE", count: badgeCount });
    }

    const externalLinks = detectExternalLinks();
    externalLinks.forEach(addShortenButton);

    const observer = new MutationObserver(() => {
      const newLinks = detectExternalLinks().filter(
        (a) => !a.dataset.linkforgeProcessed,
      );
      newLinks.forEach(addShortenButton);

      const count = detectExternalLinks().length;
      if (count !== badgeCount) {
        badgeCount = count;
        chrome.runtime.sendMessage({ type: "SET_BADGE", count: badgeCount });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
});
