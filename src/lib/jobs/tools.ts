import { z } from "zod";

export const JOB_SEARCH_TOOL_NAME = "searchJobs";

export const jobSearchSchema = z.object({
  search: z.string().optional().describe("Keywords to search for (e.g., 'football coach', 'marketing manager')."),
  location: z.string().optional().describe("City or region to filter by (e.g., 'Mumbai', 'Remote')."),
  jobType: z.string().optional().describe("Type of job (e.g., 'Full Time', 'Part Time', 'Internship')."),
  limit: z
    .number()
    .int()
    .min(5)
    .max(30)
    .optional()
    .describe("Maximum number of roles to return (defaults to 10)."),
});

export type JobSearchInput = z.infer<typeof jobSearchSchema>;
