import { NextResponse } from "next/server";

import { fetchJobs } from "@/lib/jobs/service";

export const revalidate = 0;

const MAX_SKILLS = 5;
const MIN_LIMIT = 3;
const MAX_LIMIT = 10;

type SkillPreviewRequest = {
  skills?: string[];
  limit?: number;
  location?: string;
  jobType?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SkillPreviewRequest;
    const skills = Array.isArray(body.skills) ? body.skills : [];
    if (skills.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one skill keyword." },
        { status: 400 },
      );
    }

    const normalizedSkills = Array.from(
      new Set(
        skills
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 1)
          .slice(0, MAX_SKILLS),
      ),
    );

    if (normalizedSkills.length === 0) {
      return NextResponse.json(
        { error: "No valid skills received." },
        { status: 400 },
      );
    }

    const limit = clamp(Math.round(body.limit ?? 3), MIN_LIMIT, MAX_LIMIT);
    const results = await Promise.all(
      normalizedSkills.map(async (skill) => {
        try {
          const response = await fetchJobs({
            search: skill,
            location: body.location,
            jobType: body.jobType,
            limit,
          });
          return {
            skill,
            success: response.success,
            count: response.count,
            total: response.total,
            jobs: response.jobs.slice(0, limit),
            message: response.message,
          };
        } catch (error) {
          return {
            skill,
            success: false,
            count: 0,
            total: 0,
            jobs: [],
            message:
              error instanceof Error ? error.message : "Failed to fetch jobs",
          };
        }
      }),
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch skill previews",
      },
      { status: 500 },
    );
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}
