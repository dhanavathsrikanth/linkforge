import { Svix } from "svix";

let _svix: Svix | null = null;

function getSvix(): Svix {
  if (!_svix) {
    const apiKey = process.env.SVIX_API_KEY;
    const serverUrl = process.env.SVIX_SERVER_URL || "https://api.svix.com";
    if (!apiKey) {
      throw new Error("SVIX_API_KEY is not configured");
    }
    _svix = new Svix(apiKey, { serverUrl });
  }
  return _svix;
}

export const svix = new Proxy({} as Svix, {
  get(_, prop) {
    const instance = getSvix();
    const val = (instance as any)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});
