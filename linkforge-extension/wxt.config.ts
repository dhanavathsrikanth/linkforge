import { defineConfig } from "wxt";
import { resolve } from "path";

export default defineConfig({
  srcDir: "src",
  extensionApi: "chrome",
  modules: [],
  manifest: {
    name: "LinkForge",
    short_name: "LinkForge",
    description: "Shorten, share, and track links with LinkForge",
    version: "1.0.0",
    permissions: [
      "contextMenus",
      "storage",
      "activeTab",
      "notifications",
    ],
    host_permissions: [
      "*://*/*",
    ],
    icons: {
      16: "/icon/16.png",
      48: "/icon/48.png",
      128: "/icon/128.png",
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Alt+L",
        },
        description: "Open LinkForge popup",
      },
    },
  },
});
