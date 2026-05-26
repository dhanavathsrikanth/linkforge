import { createShortLink } from "../shared/api";
import { getApiKey, getApiUrl, addRecentLink } from "../shared/storage";

export default defineBackground(() => {
  chrome.contextMenus.create({
    id: "shorten-page",
    title: "Shorten this page with PivotUrl",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "shorten-link",
    title: "Shorten this link with PivotUrl",
    contexts: ["link"],
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    let destination = "";

    if (info.menuItemId === "shorten-page") {
      destination = info.pageUrl || tab?.url || "";
    } else if (info.menuItemId === "shorten-link") {
      destination = info.linkUrl || "";
    }

    if (!destination) return;

    const apiKey = await getApiKey();
    if (!apiKey) {
      chrome.action.openPopup();
      return;
    }

    const apiUrl = await getApiUrl() || undefined;

    try {
      const result = await createShortLink(apiKey, { destination }, apiUrl);
      await addRecentLink(result.data);

      chrome.notifications.create({
        type: "basic",
        iconUrl: "/icon/128.png",
        title: "PivotUrl",
        message: `Short link created: ${result.shortUrl}`,
      });

      try {
        await navigator.clipboard.writeText(result.shortUrl);
      } catch {
        // clipboard not available in service worker
      }
    } catch (err) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "/icon/128.png",
        title: "PivotUrl Error",
        message: err instanceof Error ? err.message : "Failed to create link",
      });
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "CREATE_LINK") {
      (async () => {
        const apiKey = await getApiKey();
        if (!apiKey) {
          sendResponse({ error: "API key not configured" });
          return;
        }
        const apiUrl = await getApiUrl() || undefined;
        try {
          const result = await createShortLink(apiKey, message.payload, apiUrl);
          await addRecentLink(result.data);
          sendResponse({ success: true, ...result });
        } catch (err) {
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : "Failed to create link",
          });
        }
      })();
      return true;
    }

    if (message.type === "CREATE_LINK_DETECTED") {
      (async () => {
        const apiKey = await getApiKey();
        if (!apiKey) {
          sendResponse({ error: "API key not configured" });
          return;
        }
        const apiUrl = await getApiUrl() || undefined;
        try {
          const result = await createShortLink(apiKey, message.payload, apiUrl);
          await addRecentLink(result.data);
          sendResponse({ success: true, ...result });
        } catch (err) {
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : "Failed to create link",
          });
        }
      })();
      return true;
    }
  });
});
