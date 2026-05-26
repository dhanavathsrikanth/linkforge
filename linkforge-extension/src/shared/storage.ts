import type { ShortLink } from "./api";

const KEYS = {
  API_KEY: "linkforge_api_key",
  API_URL: "linkforge_api_url",
  RECENT_LINKS: "linkforge_recent_links",
};

export async function getApiKey(): Promise<string | null> {
  if (typeof chrome === "undefined" || !chrome.storage) return null;
  const result = await chrome.storage.sync.get(KEYS.API_KEY);
  return result[KEYS.API_KEY] || null;
}

export async function setApiKey(key: string): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage) return;
  await chrome.storage.sync.set({ [KEYS.API_KEY]: key });
}

export async function removeApiKey(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage) return;
  await chrome.storage.sync.remove(KEYS.API_KEY);
}

export async function getApiUrl(): Promise<string | null> {
  if (typeof chrome === "undefined" || !chrome.storage) return null;
  const result = await chrome.storage.sync.get(KEYS.API_URL);
  return result[KEYS.API_URL] || null;
}

export async function setApiUrl(url: string): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage) return;
  await chrome.storage.sync.set({ [KEYS.API_URL]: url });
}

export async function getRecentLinks(): Promise<ShortLink[]> {
  if (typeof chrome === "undefined" || !chrome.storage) return [];
  const result = await chrome.storage.local.get(KEYS.RECENT_LINKS);
  return result[KEYS.RECENT_LINKS] || [];
}

export async function addRecentLink(link: ShortLink): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage) return;
  const links = await getRecentLinks();
  const updated = [link, ...links.filter((l) => l.id !== link.id)].slice(0, 10);
  await chrome.storage.local.set({ [KEYS.RECENT_LINKS]: updated });
}
