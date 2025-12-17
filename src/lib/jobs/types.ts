/**
 * Job Search Type Definitions
 *
 * TypeScript types for the job search system. Includes:
 * - Job data structures from WordPress API
 * - Filter and response types
 * - Relevance scoring for resume matching
 * - Telemetry tracking
 *
 * The job data comes from the SportsNaukri WordPress site and is
 * transformed from WordPress custom post types to clean interfaces.
 *
 * @module lib/jobs/types
 * @see {@link ./service.ts} for job fetching implementation
 */

// ============================================================================
// Core Job Types
// ============================================================================

/**
 * Clean job posting data structure.
 * Transformed from WordPress API response to a simplified format.
 */
export interface Job {
  /** WordPress post ID */
  id: number;
  /** URL-friendly slug */
  slug: string;
  /** Job title */
  title: string;
  /** Full URL to job posting */
  link: string;
  /** Company/employer name */
  employer: string;
  /** Company logo URL (null if not provided) */
  employerLogo: string | null;
  /** Company website URL (null if not provided) */
  employerUrl: string | null;
  /** Job location (e.g., "Mumbai, Remote") */
  location: string;
  /** Employment type (e.g., "Full Time", "Part Time") */
  jobType: string;
  /** Job category (e.g., "Sports Marketing") */
  category: string;
  /** Required qualification */
  qualification: string;
  /** Required experience level */
  experience: string;
  /** Salary range or "Not specified" */
  salary: string;
  /** Job description (stripped of HTML, max 800 chars) */
  description: string;
  /** Posted date in DD/MM/YYYY format (null if not available) */
  postedDate: string | null;
  /** URL to full job description */
  fullDescriptionUrl: string;
  /** Optional relevance scoring when matched against resume */
  relevance?: JobRelevance;
}

// ============================================================================
// Request & Response Types
// ============================================================================

/**
 * Filter parameters for job search.
 * All fields are optional - omitting filters returns all jobs.
 */
export interface JobFilter {
  /** Keywords to search for in title, description, etc. */
  search?: string;
  /** Location to filter by (e.g., "Mumbai", "Remote") */
  location?: string;
  /** Job type filter (e.g., "Full Time", "Internship") */
  jobType?: string;
  /** Number of results to return (5-30, default 10) */
  limit?: number;
  /** Page number for pagination (1-indexed) */
  page?: number;
  /** Skills from user's resume for relevance matching */
  skillKeywords?: string[];
  /** General keywords for relevance matching */
  generalKeywords?: string[];
  /** Resume summary for context */
  resumeSummary?: string;
  /** Telemetry context for tracking */
  telemetry?: JobSearchTelemetryContext;
}

/**
 * Job search API response.
 * Contains paginated results and metadata.
 */
export interface JobResponse {
  /** Whether the search was successful */
  success: boolean;
  /** Number of jobs in this response */
  count: number;
  /** Total number of jobs matching query */
  total: number;
  /** Total number of pages available */
  totalPages: number;
  /** Current page number */
  currentPage: number;
  /** Array of job postings */
  jobs: Job[];
  /** Optional error or info message */
  message?: string;
  /** Search improvement tips when results are sparse */
  tips?: string[];
  /** Additional metadata about the search */
  meta?: JobResponseMeta;
}

// ============================================================================
// Relevance & Metadata Types
// ============================================================================

/**
 * Job relevance scoring based on resume matching.
 * Shows which keywords from the user's resume matched this job.
 */
export interface JobRelevance {
  /** Skills from resume that matched the job */
  skillMatches: string[];
  /** General keywords that matched */
  generalMatches: string[];
}

/**
 * Additional metadata returned with job search results.
 * Used for telemetry, debugging, and UI hints.
 */
export interface JobResponseMeta {
  /** Unique ID for this search request */
  telemetryId?: string;
  /** Conversation ID this search belongs to */
  conversationId?: string;
  /** True if fallback search was triggered due to low results */
  broadenedSearch?: boolean;
  /** Number of results if less than 3 (indicates poor match) */
  lowResultCount?: number;
  /** Number of results requested */
  requestedCount?: number;
  /** Keywords extracted from search query */
  searchKeywords?: string[];
  /** Skill keywords used for matching */
  skillKeywords?: string[];
  /** General keywords used for matching */
  generalKeywords?: string[];
}

/**
 * Telemetry context passed with job searches.
 * Used for tracking and analytics.
 */
export interface JobSearchTelemetryContext {
  /** Conversation this search belongs to */
  conversationId?: string;
  /** Unique request ID */
  requestId: string;
  /** ISO 8601 timestamp of request */
  requestedAt?: string;
}

// ============================================================================
// WordPress API Types
// ============================================================================

/**
 * Raw job data from WordPress REST API.
 * This is the raw format before transformation to the clean `Job` type.
 *
 * WordPress uses custom meta fields (_job_*) to store job-specific data.
 */
export interface WPJob {
  /** WordPress post ID */
  id: number;
  /** Post slug */
  slug: string;
  /** Post title (HTML-encoded) */
  title: { rendered: string };
  /** Permalink to post */
  link: string;
  /** Post content (HTML) */
  content: { rendered: string };
  /** Publication date */
  date: string;
  /** Custom meta fields for job data */
  metas?: {
    /** Employer/company name */
    _job_employer_name?: string;
    /** Company logo URL */
    _job_logo?: string;
    /** Company website */
    _job_employer_url?: string;
    /** Location object (key-value pairs) */
    _job_location?: Record<string, string>;
    /** Job type object (key-value pairs) */
    _job_type?: Record<string, string>;
    /** Job category object (key-value pairs) */
    _job_category?: Record<string, string>;
    /** Required qualification */
    _job_qualification?: string;
    /** Required experience */
    _job_experience?: string;
    /** Minimum salary */
    _job_salary?: string;
    /** Maximum salary */
    _job_max_salary?: string;
  };
}
