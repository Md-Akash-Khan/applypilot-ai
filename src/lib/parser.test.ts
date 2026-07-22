import assert from "node:assert/strict";
import test from "node:test";
import { parseJobText } from "@/lib/parser";

test("extracts the WellDev role, company, salary, and clean sections", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const parsed = await parseJobText(`
WellDev Logo
What we do | Our Products | Why us
Trainee Software Engineer
Apply Now

Role Overview
WellDev is a technology-driven software development company committed to delivering cutting-edge solutions. As we continue to grow, we are looking for exceptional talents wishing to boost their career. Freshers are encouraged to apply in this position.
This role is designed for graduates who want to build a career in software engineering.

Timeline & Eligibility
Candidates must complete their graduation by August 2026.

General Information
Location: Dhaka Bangladesh
Deadline: 2026-07-25
Position: Fresher
Salary: 50000 BDT Per (month)

Essential Requirements
• Strong fundamentals in algorithms and data structures.
• Ability to learn unfamiliar tools quickly.
`);

    assert.equal(parsed.title, "Trainee Software Engineer");
    assert.equal(parsed.company, "WellDev");
    assert.equal(parsed.salary, "50000 BDT Per (month)");
    assert.match(parsed.description, /^WellDev is a technology-driven/);
    assert.doesNotMatch(parsed.description, /Timeline & Eligibility/);
    assert.match(parsed.requirements || "", /\n• Ability to learn/);
  } finally {
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  }
});

