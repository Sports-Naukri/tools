/**
 * Job Search AI Tool Definition
 *
 * Zod schema and types for the `searchJobs` AI tool.
 * Used in the main chat API to allow the AI to search for jobs.
 *
 * @module lib/jobs/tools
 * @see {@link ../../app/api/chat/route.ts} for tool registration
 * @see {@link ./service.ts} for implementation
 */

import { z } from "zod";

// ============================================================================
// Tool Configuration
// ============================================================================

/** Tool name used for AI SDK registration */
export const JOB_SEARCH_TOOL_NAME = "searchJobs";

// ============================================================================
// Tool Schema
// ============================================================================

/**
 * Input schema for the searchJobs AI tool.
 * The AI uses this to construct job search queries.
 *
 * All fields are optional - the AI decides which filters to apply
 * based on the user's natural language request.
 */
export const jobSearchSchema = z.object({
  /** Keywords to search for (e.g., 'football coach', 'marketing manager') */
  search: z
    .string()
    .optional()
    .describe(
      "Keywords to search for (e.g., 'football coach', 'marketing manager').",
    ),
  /** City or region filter (e.g., 'Mumbai', 'Remote') */
  location: z
    .string()
    .optional()
    .describe("City or region to filter by (e.g., 'Mumbai', 'Remote')."),
  /** Job type filter (e.g., 'Full Time', 'Part Time', 'Internship') */
  jobType: z
    .string()
    .optional()
    .describe("Type of job (e.g., 'Full Time', 'Part Time', 'Internship')."),
  /** Number of results to return (5-30, defaults to 10) */
  limit: z
    .number()
    .int()
    .min(5)
    .max(30)
    .optional()
    .describe("Maximum number of roles to return (defaults to 10)."),
});

/** TypeScript type inferred from the schema */
export type JobSearchInput = z.infer<typeof jobSearchSchema>;
