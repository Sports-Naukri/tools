import { z } from "zod";

export const JOB_SEARCH_TOOL_NAME = "searchJobs";

export const jobSearchSchema = z.object({
  search: z.string().optional().describe("Keywords to search for (e.g., 'football coach', 'marketing manager')."),
  location: z.string().optional().describe("City or region to filter by (e.g., 'Mumbai', 'Remote')."),
  jobType: z.string().optional().describe("Type of job (e.g., 'Full Time', 'Part Time', 'Internship')."),
});

export type JobSearchInput = z.infer<typeof jobSearchSchema>;
