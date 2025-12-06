export interface Job {
  id: number;
  slug: string;
  title: string;
  link: string;
  employer: string;
  employerLogo: string | null;
  employerUrl: string | null;
  location: string;
  jobType: string;
  category: string;
  qualification: string;
  experience: string;
  salary: string;
  description: string;
  postedDate: string | null;
  fullDescriptionUrl: string;
  relevance?: JobRelevance;
}

export interface JobFilter {
  search?: string;
  location?: string;
  jobType?: string;
  limit?: number;
  page?: number;
  skillKeywords?: string[];
  generalKeywords?: string[];
  resumeSummary?: string;
  telemetry?: JobSearchTelemetryContext;
}

export interface JobResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  jobs: Job[];
  message?: string;
  tips?: string[];
  meta?: JobResponseMeta;
}

export interface JobRelevance {
  skillMatches: string[];
  generalMatches: string[];
}

export interface JobResponseMeta {
  telemetryId?: string;
  conversationId?: string;
  broadenedSearch?: boolean;
  lowResultCount?: number;
  requestedCount?: number;
  searchKeywords?: string[];
  skillKeywords?: string[];
  generalKeywords?: string[];
}

export interface JobSearchTelemetryContext {
  conversationId?: string;
  requestId: string;
  requestedAt?: string;
}

// Raw WordPress API types (partial)
export interface WPJob {
  id: number;
  slug: string;
  title: { rendered: string };
  link: string;
  content: { rendered: string };
  date: string;
  metas?: {
    _job_employer_name?: string;
    _job_logo?: string;
    _job_employer_url?: string;
    _job_location?: Record<string, string>;
    _job_type?: Record<string, string>;
    _job_category?: Record<string, string>;
    _job_qualification?: string;
    _job_experience?: string;
    _job_salary?: string;
    _job_max_salary?: string;
  };
}
