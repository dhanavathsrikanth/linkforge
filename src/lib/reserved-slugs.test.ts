import { describe, it, expect } from "vitest";
import { isReservedSlug, RESERVED_SLUGS } from "@/lib/reserved-slugs";

describe("isReservedSlug", () => {
  it("reserves application/route words", () => {
    for (const word of ["admin", "api", "dashboard", "bio", "links", "qr", "health"]) {
      expect(isReservedSlug(word)).toBe(true);
    }
  });

  it("reserves system files at the host root", () => {
    for (const f of ["favicon.ico", "robots.txt", "sitemap.xml", "manifest.json"]) {
      expect(isReservedSlug(f)).toBe(true);
    }
  });

  it("reserves the .well-known prefix and its children", () => {
    expect(isReservedSlug(".well-known")).toBe(true);
    expect(isReservedSlug(".well-known/acme-challenge")).toBe(true);
    expect(isReservedSlug(".well-known/apple-app-site-association")).toBe(true);
  });

  it("is case-insensitive and tolerates a leading slash", () => {
    expect(isReservedSlug("Favicon.ICO")).toBe(true);
    expect(isReservedSlug("/api")).toBe(true);
    expect(isReservedSlug("ADMIN")).toBe(true);
  });

  it("treats empty/blank as reserved (never a valid slug)", () => {
    expect(isReservedSlug("")).toBe(true);
    expect(isReservedSlug("   ")).toBe(true);
  });

  it("allows ordinary slugs", () => {
    for (const ok of ["promo", "summer-sale", "my-link", "abc123", "launch2026"]) {
      expect(isReservedSlug(ok)).toBe(false);
    }
  });

  it("keeps the legacy reserved words in the exported set", () => {
    // Guards against accidental removal during refactors.
    expect(RESERVED_SLUGS.has("admin")).toBe(true);
    expect(RESERVED_SLUGS.has("p")).toBe(true);
  });
});
