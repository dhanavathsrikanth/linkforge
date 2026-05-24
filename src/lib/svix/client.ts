import { Svix } from "svix";

function getSvix() {
  const apiKey = process.env.SVIX_API_KEY;
  const serverUrl = process.env.SVIX_SERVER_URL || "https://api.svix.com";
  if (!apiKey) {
    throw new Error("SVIX_API_KEY is not configured");
  }
  return new Svix(apiKey, { serverUrl });
}

export const svix = getSvix();
