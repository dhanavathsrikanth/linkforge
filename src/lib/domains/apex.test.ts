import { describe, it, expect } from "vitest";
import { isApexDomain } from "@/lib/domains/apex";

describe("isApexDomain", () => {
  it("treats two-label hosts as apex", () => {
    expect(isApexDomain("acme.co")).toBe(true);
    expect(isApexDomain("acme.com")).toBe(true);
    expect(isApexDomain("example.io")).toBe(true);
  });

  it("treats single-part-TLD subdomains as non-apex", () => {
    expect(isApexDomain("go.acme.com")).toBe(false);
    expect(isApexDomain("links.example.io")).toBe(false);
    expect(isApexDomain("a.b.acme.com")).toBe(false);
  });

  it("handles common multi-part suffixes", () => {
    expect(isApexDomain("acme.co.uk")).toBe(true);
    expect(isApexDomain("go.acme.co.uk")).toBe(false);
    expect(isApexDomain("acme.com.au")).toBe(true);
    expect(isApexDomain("links.acme.com.au")).toBe(false);
  });

  it("normalizes case and trailing dot", () => {
    expect(isApexDomain("ACME.CO")).toBe(true);
    expect(isApexDomain("acme.com.")).toBe(true);
    expect(isApexDomain("GO.ACME.COM")).toBe(false);
  });
});
