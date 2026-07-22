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

test("extracts a colonless monthly salary after requirements and benefits headings", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const parsed = await parseJobText(`
Business Development Analyst (SBA I/SBA II) (Night Shift)
Deadline: August 15, 2026 | Type: Full Time | TIMING: Night Shift

Business Development Analyst (Night Shift)

Overview: Apex DMIT Limited is looking for Business Development Analyst who is passionate about impacting lives and empowering people through modern technology.

Expected Knowledge & Skills
High proficiency in English communication
Computer literacy
Analytical capability

Educational Requirements:
Bachelor's degree in any discipline from a reputed university

Experience Requirements:
Fresh graduates or experienced professionals (up to a maximum of 3 years) are encouraged to apply.

Compensation & Other Benefits:
Monthly Salary 35,000 Taka to 50,000 Taka based on competencies and skills.
Monthly Travel Allowance
Quarterly/ Yearly Performance Bonus
Yearly Salary Review
Yearly 2 Festival Bonus
`);

    assert.equal(parsed.title, "Business Development Analyst (SBA I/SBA II) (Night Shift)");
    assert.equal(parsed.company, "Apex DMIT Limited");
    assert.equal(parsed.salary, "35,000 Taka to 50,000 Taka based on competencies and skills.");
    assert.match(parsed.requirements || "", /Bachelor's degree/);
    assert.doesNotMatch(parsed.requirements || "", /Monthly Salary/);
  } finally {
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  }
});
