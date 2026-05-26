// @integration — run with: vitest --reporter=verbose integration
// Tests each SDK method against the real API running on localhost:3000.
// Requires TEST_API_KEY environment variable and the app running on port 3000.

import { describe, it, expect, beforeAll } from "vitest";
import PivotUrl from "./index";

const API_KEY = process.env.TEST_API_KEY;
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Skip all tests if no API key is set
const itIf = (condition: boolean) => condition ? it : it.skip;

describe("integration", () => {
  let lf: PivotUrl;
  let createdLinkId: string;

  beforeAll(() => {
    if (!API_KEY) {
      console.warn("⚠  TEST_API_KEY not set — integration tests will be skipped.");
      return;
    }
    lf = new PivotUrl({ apiKey: API_KEY, baseUrl: BASE_URL, retry: { attempts: 1, delay: 10 } });
  });

  describe("links.create()", () => {
    itIf(!!API_KEY)("creates a link with minimum fields", async () => {
      const link = await lf.links.create({
        destination: "https://example.com/integration-test",
      });
      expect(link.id).toBeDefined();
      expect(link.destination).toBe("https://example.com/integration-test");
      expect(link.slug).toBeDefined();
      expect(link.shortUrl).toBeDefined();
      createdLinkId = link.id;
    });

    itIf(!!API_KEY)("creates a link with all optional fields", async () => {
      const link = await lf.links.create({
        destination: "https://example.com/full-test",
        slug: `test-full-${Date.now()}`,
        title: "Integration Test Link",
        tags: ["test", "integration"],
        utm: { source: "test", medium: "integration", campaign: "sdk-test" },
        abTest: {
          enabled: false,
          variants: [],
        },
      });
      expect(link.id).toBeDefined();
      expect(link.slug).toContain("test-full");
      expect(link.tags).toContain("test");
    });
  });

  describe("links.list()", () => {
    itIf(!!API_KEY)("lists links with pagination", async () => {
      const result = await lf.links.list({ page: 1, limit: 5 });
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.links).toBeDefined();
      expect(Array.isArray(result.links)).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
    });

    itIf(!!API_KEY)("filters by search term", async () => {
      const result = await lf.links.list({ search: "integration", limit: 10 });
      expect(result.links.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("links.get()", () => {
    itIf(!!API_KEY)("gets a link by ID", async () => {
      expect(createdLinkId).toBeDefined();
      const link = await lf.links.get(createdLinkId);
      expect(link.id).toBe(createdLinkId);
      expect(link.destination).toBe("https://example.com/integration-test");
    });

    itIf(!!API_KEY)("throws 404 for nonexistent link", async () => {
      await expect(lf.links.get("00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({
        code: "NOT_FOUND",
        status: 404,
      });
    });
  });

  describe("links.update()", () => {
    itIf(!!API_KEY)("updates a link title and isActive", async () => {
      const updated = await lf.links.update(createdLinkId, {
        title: "Updated Integration Test",
        isActive: false,
      });
      expect(updated.title).toBe("Updated Integration Test");
      expect(updated.isActive).toBe(false);
    });
  });

  describe("links.analytics()", () => {
    itIf(!!API_KEY)("returns analytics for a link", async () => {
      const analytics = await lf.links.analytics(createdLinkId, { range: "30d" });
      expect(analytics.summary).toBeDefined();
      expect(typeof analytics.summary.totalClicks).toBe("number");
      expect(Array.isArray(analytics.timeSeries.labels)).toBe(true);
      expect(Array.isArray(analytics.geography.byCountry)).toBe(true);
      expect(Array.isArray(analytics.devices.byDeviceType)).toBe(true);
    });
  });

  describe("analytics.trackConversion()", () => {
    itIf(!!API_KEY)("tracks a conversion event", async () => {
      await expect(
        lf.analytics.trackConversion({
          linkId: createdLinkId,
          event: "integration_test",
          value: 99.99,
          currency: "USD",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("analytics.getAttribution()", () => {
    itIf(!!API_KEY)("returns attribution report", async () => {
      const report = await lf.analytics.getAttribution({
        model: "first_touch",
        range: "30d",
      });
      expect(report.model).toBe("first_touch");
      expect(typeof report.totalConversions).toBe("number");
      expect(Array.isArray(report.linkCredits)).toBe(true);
    });
  });

  describe("analytics.getWorkspaceAnalytics()", () => {
    itIf(!!API_KEY)("returns workspace overview", async () => {
      const overview = await lf.analytics.getWorkspaceAnalytics({ range: "30d" });
      expect(overview).toBeDefined();
      expect(typeof (overview as any).totalClicks).toBe("number");
    });
  });

  describe("links.delete()", () => {
    itIf(!!API_KEY)("deletes (deactivates) a link", async () => {
      await expect(lf.links.delete(createdLinkId)).resolves.toBeUndefined();
    });
  });

  describe("error handling", () => {
    itIf(!!API_KEY)("throws UNAUTHORIZED on invalid API key", async () => {
      const badLf = new PivotUrl({ apiKey: "lf_sk_invalid_key", baseUrl: BASE_URL });
      await expect(badLf.links.list()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        status: 401,
      });
    });

    itIf(!!API_KEY)("throws VALIDATION_ERROR on invalid destination", async () => {
      await expect(
        lf.links.create({ destination: "not-a-url" })
      ).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        status: 422,
      });
    });
  });
});
