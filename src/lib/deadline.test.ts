import assert from "node:assert/strict";
import test from "node:test";
import { isDeadlineExpired, isDeadlineSoon } from "@/lib/deadline";

test("a deadline remains active throughout its listed calendar day", () => {
  const deadline = new Date(2026, 6, 20, 0, 0, 0);
  assert.equal(isDeadlineExpired(deadline, new Date(2026, 6, 20, 16, 38, 0)), false);
  assert.equal(isDeadlineSoon(deadline, 5, new Date(2026, 6, 20, 16, 38, 0)), true);
  assert.equal(isDeadlineExpired(deadline, new Date(2026, 6, 21, 0, 0, 0)), true);
});

