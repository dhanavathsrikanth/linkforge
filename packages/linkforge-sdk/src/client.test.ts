import { PivotUrlClient } from "./client";
import { test, expect } from "vitest";

test('client getKeyType returns secret for lf_sk_ prefix', () => {
  const client = new PivotUrlClient({ apiKey: 'lf_sk_dummy' });
  expect(client.getKeyType()).toBe('secret');
});
