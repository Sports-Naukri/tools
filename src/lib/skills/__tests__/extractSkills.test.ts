import { describe, expect, it } from "vitest";

import { extractSkillsFromResume } from "../extract";

describe("extractSkillsFromResume", () => {
  it("identifies catalog-driven skills", () => {
    const text = `\
      Led strength and conditioning programs for elite cricket academies.
      Built comprehensive periodization plans and personalized conditioning programs.
    `;

    const skills = extractSkillsFromResume(text);
    expect(skills.some((skill) => skill.id === "strength-conditioning")).toBe(true);
  });

  it("captures resume skill sections", () => {
    const text = `Skills: Recruitment strategy, Tournament Ops, Media liaison\nExperience: ...`;
    const skills = extractSkillsFromResume(text);
    const labels = skills.map((skill) => skill.label);
    expect(labels).toContain("Recruitment Strategy");
    expect(labels).toContain("Tournament Ops");
  });

  it("respects the requested limit", () => {
    const text = Array(10).fill("skills: scouting, analytics, operations").join("\n");
    const skills = extractSkillsFromResume(text, { limit: 5 });
    expect(skills.length).toBeLessThanOrEqual(5);
  });
});
