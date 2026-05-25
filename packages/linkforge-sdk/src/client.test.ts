import { LinkForgeClient } from "./client.ts";
import { test, expect } from "vitest";

test('client getKeyType returns secret for lf_sk_ prefix', () => {
  const client = new LinkForgeClient({ apiKey: 'lf_sk_dummy' });
  expect(client.getKeyType()).toBe('secret');
});
