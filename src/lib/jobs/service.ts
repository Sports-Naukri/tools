import { Job, JobFilter, JobResponse, WPJob } from "./types";

const WORDPRESS_API_URL = "https://sportsnaukri.com/wp-json/wp/v2/job_listing";

// Common location keywords in India
const LOCATION_KEYWORDS = [
  "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai", 
  "kolkata", "pune", "ahmedabad", "jaipur", "gurgaon", "gurugram", 
  "noida", "chandigarh", "kochi", "lucknow", "indore", "bhopal", 
  "nagpur", "visakhapatnam", "patna", "vadodara", "goa", "remote"
];

// Broad location terms that should NOT filter (return all jobs)
const BROAD_LOCATION_TERMS = [
  "india", "indian", "nationwide", "any location", "anywhere", "all cities"
];

/**
 * Fetches jobs from the SportsNaukri WordPress API with smart filtering and cleaning.
 */
export async function fetchJobs(filter: JobFilter = {}): Promise<JobResponse> {
  const { search, location, jobType } = filter;
  const page = Math.max(filter.page ?? 1, 1);
  const desiredLimit = clamp(filter.limit ?? 10, 5, 30);
  const maxPagesToFetch = 5;
  const fetchLimit = Math.min(desiredLimit * 2, 40);

  // Smart search handling
  const searchKeywords: string[] = [];
  const locationKeywords: string[] = [];

  if (search) {
    const keywords = search.toLowerCase().split(/\s+/);
    
    keywords.forEach((keyword) => {
      if (LOCATION_KEYWORDS.includes(keyword)) {
        locationKeywords.push(keyword);
      } else if (BROAD_LOCATION_TERMS.includes(keyword)) {
        // Broad terms - do nothing, effectively searching everywhere
      } else {
        searchKeywords.push(keyword);
      }
    });

  }

  // Handle explicit location parameter
  if (location) {
    const locLower = location.toLowerCase();
    if (!BROAD_LOCATION_TERMS.includes(locLower)) {
      locationKeywords.push(locLower);
    }
  }

  const baseParams = new URLSearchParams({
    per_page: fetchLimit.toString(),
    page: page.toString(),
    _fields: "id,slug,title,link,content,metas,date",
  });

  if (searchKeywords.length > 0) {
    baseParams.set("search", searchKeywords.join(" "));
  }

  const filterContext: FilterContext = {
    locationKeywords,
    jobType,
    searchKeywords,
  };

  const fetchAndFilterPage = async (pageNumber: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("page", pageNumber.toString());
    const { wpJobs, totalJobs, totalPages } = await fetchWordpressPage(params);
    let jobs = wpJobs.map(cleanJobData).filter((job): job is Job => job !== null);
    jobs = applyClientFilters(jobs, filterContext);
    return {
      jobs,
      total: totalJobs,
      totalPages,
    };
  };

  try {
    const collected: Job[] = [];
    const seenIds = new Set<number>();
    let totalJobs = 0;
    let totalPages = 0;
    let pagesFetched = 0;
    let currentPage = page;

    while (collected.length < desiredLimit && pagesFetched < maxPagesToFetch) {
      const pageResult = await fetchAndFilterPage(currentPage);
      pagesFetched += 1;

      if (!pageResult) {
        break;
      }

      totalJobs = pageResult.total;
      totalPages = pageResult.totalPages;

      for (const job of pageResult.jobs) {
        if (!seenIds.has(job.id)) {
          seenIds.add(job.id);
          collected.push(job);
          if (collected.length >= desiredLimit) {
            break;
          }
        }
      }

      if (collected.length >= desiredLimit || currentPage >= totalPages) {
        break;
      }
      currentPage += 1;
    }

    const paginatedJobs = collected.slice(0, desiredLimit);
    const result: JobResponse = {
      success: true,
      count: paginatedJobs.length,
      total: totalJobs,
      totalPages,
      currentPage: page,
      jobs: paginatedJobs,
    };

    if (paginatedJobs.length === 0) {
      result.message = "No jobs found matching your criteria.";
      result.tips = [];
      if (searchKeywords.length > 0) result.tips.push("Try broader search terms.");
      if (locationKeywords.length > 0) result.tips.push("Try removing location filters.");
    }

    return result;

  } catch (error) {
    console.error("Error fetching jobs:", error);
    return {
      success: false,
      count: 0,
      total: 0,
      totalPages: 0,
      currentPage: page,
      jobs: [],
      message: error instanceof Error ? error.message : "Failed to fetch jobs",
    };
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type FilterContext = {
  locationKeywords: string[];
  jobType?: string;
  searchKeywords: string[];
};

function applyClientFilters(jobs: Job[], context: FilterContext) {
  const { locationKeywords, jobType, searchKeywords } = context;
  let filtered = jobs;

  if (locationKeywords.length > 0) {
    filtered = filtered.filter((job) => {
      const jobLocation = job.location.toLowerCase();
      return locationKeywords.some((loc) => jobLocation.includes(loc));
    });
  }

  if (jobType) {
    const typeLower = jobType.toLowerCase();
    filtered = filtered.filter((job) => job.jobType.toLowerCase().includes(typeLower));
  }

  if (searchKeywords.length > 0) {
    filtered = filtered.filter((job) => {
      const searchableText = `
        ${job.title} 
        ${job.description} 
        ${job.employer} 
        ${job.category} 
        ${job.qualification}
      `.toLowerCase();
      return searchKeywords.every((keyword) => searchableText.includes(keyword));
    });
  }

  return filtered;
}

async function fetchWordpressPage(params: URLSearchParams) {
  const response = await fetch(`${WORDPRESS_API_URL}?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.statusText}`);
  }

  const wpJobs: WPJob[] = await response.json();
  const totalJobsHeader = response.headers.get("x-wp-total");
  const totalPagesHeader = response.headers.get("x-wp-totalpages");
  const totalJobs = totalJobsHeader ? parseInt(totalJobsHeader, 10) : wpJobs.length;
  const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : Math.ceil(totalJobs / (parseInt(params.get("per_page") ?? "10", 10)));

  return { wpJobs, totalJobs, totalPages };
}

// --- Helper Functions ---

function cleanJobData(job: WPJob): Job | null {
  try {
    const description = stripHtmlTags(job.content?.rendered || "");

    return {
      id: job.id,
      slug: job.slug,
      title: decodeHtmlEntities(job.title?.rendered || "No title"),
      link: job.link,
      employer: job.metas?._job_employer_name || "Not specified",
      employerLogo: job.metas?._job_logo || null,
      employerUrl: job.metas?._job_employer_url || null,
      location: extractLocationNames(job.metas?._job_location),
      jobType: extractJobTypes(job.metas?._job_type),
      category: extractCategories(job.metas?._job_category),
      qualification: job.metas?._job_qualification || "Not specified",
      experience: job.metas?._job_experience || "Not specified",
      salary: formatSalary(job.metas?._job_salary, job.metas?._job_max_salary),
      description: description.substring(0, 800) + (description.length > 800 ? "..." : ""),
      postedDate: job.date ? new Date(job.date).toLocaleDateString("en-IN") : null,
      fullDescriptionUrl: job.link,
    };
  } catch (error) {
    console.error("Error cleaning job data:", error);
    return null;
  }
}

function extractLocationNames(locationObj: unknown): string {
  if (!locationObj || typeof locationObj !== "object") return "Not specified";
  const locations = Object.values(locationObj as object).filter(Boolean);
  return locations.length > 0 ? locations.join(", ") : "Not specified";
}

function extractJobTypes(jobTypeObj: unknown): string {
  if (!jobTypeObj || typeof jobTypeObj !== "object") return "Not specified";
  const types = Object.values(jobTypeObj as object).filter(Boolean);
  return types.length > 0 ? types.join(", ") : "Not specified";
}

function extractCategories(categoryObj: unknown): string {
  if (!categoryObj || typeof categoryObj !== "object") return "Not specified";
  const categories = Object.values(categoryObj as object).filter(Boolean);
  return categories.length > 0 ? categories.join(", ") : "Not specified";
}

function formatSalary(min?: string, max?: string): string {
  const cleanMin = min?.trim();
  const cleanMax = max?.trim();
  if (!cleanMin && !cleanMax) return "Not specified";
  if (cleanMin && cleanMax) return `${cleanMin} - ${cleanMax}`;
  return cleanMin || cleanMax || "Not specified";
}

function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(
    html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  );
}

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  const entities: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
    "&#039;": "'", "&#8217;": "'", "&#8216;": "'", "&#8220;": '"',
    "&#8221;": '"', "&#8211;": "–", "&#8212;": "—", "&nbsp;": " ",
    "&ndash;": "–", "&mdash;": "—", "&rsquo;": "'", "&lsquo;": "'",
    "&rdquo;": '"', "&ldquo;": '"'
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, "g"), char);
  }
  return decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}
