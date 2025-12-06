import { SKILL_DEFINITIONS, SKILL_SECTION_HEADERS } from "./catalog";

export type SkillMatch = {
  id: string;
  label: string;
  category: string;
  matches: string[];
  confidence: number; // 0 - 1
  source: "catalog" | "resume-section";
};

export type ExtractSkillsOptions = {
  limit?: number;
};

const SECTION_STOP_WORDS = [
  "experience",
  "education",
  "projects",
  "certifications",
  "achievements",
  "summary",
];

const TOKEN_SPLIT_REGEX = /[,;\|•\u2022\n]+/;

export function extractSkillsFromResume(text: string, options: ExtractSkillsOptions = {}): SkillMatch[] {
  if (!text) {
    return [];
  }

  const normalized = normalize(text);
  const catalogMatches = extractCatalogSkills(normalized);
  const knownLabels = new Set(catalogMatches.map((skill) => skill.label.toLowerCase()));
  const sectionMatches = extractSectionSkills(text, knownLabels);
  const combined = [...catalogMatches, ...sectionMatches];
  const unique = dedupeSkills(combined);
  const limit = options.limit ?? 20;
  return unique.slice(0, limit);
}

function extractCatalogSkills(normalizedText: string): SkillMatch[] {
  const matches: SkillMatch[] = [];
  for (const def of SKILL_DEFINITIONS) {
    const keywordMatches = def.keywords.filter((keyword) => normalizedText.includes(keyword));
    if (keywordMatches.length === 0) {
      continue;
    }
    const frequencyScore = keywordMatches.reduce((score, keyword) => score + countOccurrences(normalizedText, keyword), 0);
    const coverage = keywordMatches.length / def.keywords.length;
    const weighted = (frequencyScore * 0.6 + coverage * 0.4) + (def.weight ?? 0);
    const confidence = Math.min(0.2 + weighted / 4, 0.98);
    matches.push({
      id: def.id,
      label: def.label,
      category: def.category,
      matches: keywordMatches,
      confidence: Number(confidence.toFixed(2)),
      source: "catalog",
    });
  }
  return matches.sort((a, b) => b.confidence - a.confidence);
}

function extractSectionSkills(rawText: string, existingLabels: Set<string>): SkillMatch[] {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim());
  const collected = new Set<string>();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) {
      continue;
    }
    const lower = line.toLowerCase();
    const header = SKILL_SECTION_HEADERS.find((section) => lower.startsWith(section));
    if (!header) {
      continue;
    }

    let buffer = line.replace(/^[^:]+:/, "").trim();
    let cursor = i + 1;
    while (cursor < lines.length) {
      const nextLine = lines[cursor];
      if (!nextLine) {
        break;
      }
      const nextLower = nextLine.toLowerCase();
      if (SECTION_STOP_WORDS.some((stopWord) => nextLower.startsWith(stopWord))) {
        break;
      }
      buffer += `, ${nextLine}`;
      cursor += 1;
      if (buffer.length > 600) {
        break;
      }
    }

    const candidates = buffer
      .split(TOKEN_SPLIT_REGEX)
      .map((token) => token.trim())
      .filter((token) => token.length > 2);

    for (const candidate of candidates) {
      const normalizedCandidate = titleCase(candidate);
      if (!normalizedCandidate) {
        continue;
      }
      if (existingLabels.has(normalizedCandidate.toLowerCase())) {
        continue;
      }
      collected.add(normalizedCandidate);
    }
    i = cursor;
  }

  return Array.from(collected)
    .slice(0, 8)
    .map((label) => ({
      id: `resume-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label,
      category: "Resume Input",
      matches: [label],
      confidence: 0.55,
      source: "resume-section" as const,
    }));
}

function dedupeSkills(skills: SkillMatch[]): SkillMatch[] {
  const seen = new Map<string, SkillMatch>();
  for (const skill of skills) {
    const key = skill.label.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, skill);
      continue;
    }
    const existing = seen.get(key)!;
    if (skill.confidence > existing.confidence) {
      seen.set(key, skill);
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  const regex = new RegExp(escapeRegex(needle), "g");
  return haystack.match(regex)?.length ?? 0;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s&:+/.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
