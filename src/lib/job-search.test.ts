import assert from "node:assert/strict";
import test from "node:test";
import { expandJobSearchTerms } from "@/lib/job-search";

test("partial job searches expand to closely related role terms", () => {
  const terms = expandJobSearchTerms("software");
  assert.ok(terms.includes("software"));
  assert.ok(terms.includes("developer"));
  assert.ok(terms.includes("programmer"));
});

