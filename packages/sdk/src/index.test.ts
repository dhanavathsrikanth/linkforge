import { describe, it, expect, vi, beforeEach } from "vitest";
import { LinkForge } from "./index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(data: unknown, status = 200) {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    json: () => Promise.resolve(ok ? { data } : data),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("LinkForge constructor", () => {
  it("accepts a string API key", () => {
    const client = new LinkForge("lf_sk_test_key");
    expect(client.links).toBeDefined();
    expect(client.analytics).toBeDefined();
  });

  it("accepts a config object", () => {
    const client = new LinkForge({ apiKey: "lf_sk_test_key", baseUrl: "https://custom.example.com" });
    expect(client.links).toBeDefined();
  });

  it("throws when apiKey is missing", () => {
    expect(() => new LinkForge({ apiKey: "" } as any)).toThrow("apiKey is required");
  });
});

describe("links.create()", () => {
  it("sends correct payload and returns a link", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "link-1",
        workspaceId: "ws-1",
        shortUrl: "https://lf.app/abc",
        destination: "https://example.com",
        slug: "abc",
        domain: "lf.app",
        title: null,
        description: null,
        tags: [],
        isActive: true,
        expiresAt: null,
        clickLimit: null,
        totalClicks: 0,
        uniqueClicks: 0,
        password: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        abTestEnabled: false,
        abTestVariants: null,
        iosDestination: null,
        androidDestination: null,
        geoRouting: null,
        qrSettings: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      })
    );

    const client = new LinkForge("lf_sk_test");
    const link = await client.links.create({ destination: "https://example.com" });

    expect(link.id).toBe("link-1");
    expect(link.destination).toBe("https://example.com");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0]!;
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body).toEqual({ destination: "https://example.com" });
  });

  it("sends all fields including A/B test config", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "link-2",
        workspaceId: "ws-1",
        shortUrl: "https://lf.app/abc",
        destination: "https://example.com",
        slug: "my-slug",
        domain: "lf.app",
        title: "My Link",
        description: null,
        tags: ["marketing"],
        isActive: true,
        expiresAt: null,
        clickLimit: null,
        totalClicks: 0,
        uniqueClicks: 0,
        password: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        abTestEnabled: true,
        abTestVariants: [{ id: "v1", destination: "https://a.com", weight: 50, label: "A", clicks: 0, conversions: 0, conversionRate: 0 }],
        iosDestination: null,
        androidDestination: null,
        geoRouting: null,
        qrSettings: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      })
    );

    const client = new LinkForge("lf_sk_test");
    const link = await client.links.create({
      destination: "https://example.com",
      slug: "my-slug",
      title: "My Link",
      tags: ["marketing"],
      utm: { source: "twitter", medium: "social" },
      abTest: { enabled: true, variants: [{ destination: "https://a.com", weight: 50, label: "A" }] },
    });

    expect(link.slug).toBe("my-slug");
    expect(link.abTestEnabled).toBe(true);
    expect(link.abTestVariants).toHaveLength(1);
  });
});

describe("links.list()", () => {
  it("sends pagination params", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        links: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false,
      })
    );

    const client = new LinkForge("lf_sk_test");
    const result = await client.links.list({ page: 1, limit: 10 });

    expect(result.total).toBe(0);
    expect(result.page).toBe(1);

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("page=1");
    expect(url).toContain("limit=10");
  });
});

describe("links.analytics()", () => {
  it("sends date range params", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        summary: { totalClicks: 100, uniqueClicks: 50, totalConversions: 5, conversionRate: 0.05, comparedToPrevious: { clicks: 0, uniqueClicks: 0 } },
        timeSeries: { labels: [], clicks: [], uniqueClicks: [] },
        geography: { byCountry: [] },
        devices: { byDeviceType: [] },
        browsers: { byBrowser: [] },
        referrers: { byType: [] },
        abTestResults: null,
      })
    );

    const client = new LinkForge("lf_sk_test");
    const analytics = await client.links.analytics("link-1", { range: "30d" });

    expect(analytics.summary.totalClicks).toBe(100);

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain("range=30d");
  });
});

describe("analytics.trackConversion()", () => {
  it("sends conversion event with value", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(undefined, 200));

    const client = new LinkForge("lf_sk_test");
    await client.analytics.trackConversion({
      linkId: "link-1",
      event: "purchase",
      value: 49.99,
      currency: "USD",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0]!;
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body.linkId).toBe("link-1");
    expect(body.event).toBe("purchase");
    expect(body.value).toBe(49.99);
  });
});

describe("error handling", () => {
  it("throws with correct code on 401", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "Invalid API key" } }, 401)
    );

    const client = new LinkForge("lf_sk_bad");
    await expect(client.links.get("link-1")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("throws with correct code on 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { code: "NOT_FOUND", message: "Link not found" } }, 404)
    );

    const client = new LinkForge("lf_sk_test");
    await expect(client.links.get("nonexistent")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });

  it("throws on network timeout", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValue(abortError);

    const client = new LinkForge({ apiKey: "lf_sk_test", timeout: 1 });
    await expect(client.links.get("link-1")).rejects.toThrow("timeout");
  });
});

describe("retry logic", () => {
  it("retries on 500 then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ error: { code: "SERVER_ERROR", message: "Internal" } }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "SERVER_ERROR", message: "Internal" } }, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "link-1",
          workspaceId: "ws-1",
          shortUrl: "https://lf.app/abc",
          destination: "https://example.com",
          slug: "abc",
          domain: "lf.app",
          title: null,
          description: null,
          tags: [],
          isActive: true,
          expiresAt: null,
          clickLimit: null,
          totalClicks: 0,
          uniqueClicks: 0,
          password: null,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          utmTerm: null,
          utmContent: null,
          abTestEnabled: false,
          abTestVariants: null,
          iosDestination: null,
          androidDestination: null,
          geoRouting: null,
          qrSettings: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
      );

    const client = new LinkForge({ apiKey: "lf_sk_test", retry: { attempts: 3, delay: 10 } });
    const link = await client.links.get("link-1");

    expect(link.id).toBe("link-1");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
