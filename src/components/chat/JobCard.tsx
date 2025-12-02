import { useState } from "react";
import { Briefcase, MapPin, Building2, IndianRupee, Calendar, ChevronDown, MessageSquarePlus } from "lucide-react";
import type { Job, JobResponse } from "@/lib/jobs/types";

export function JobList({ response, onSelectJob }: { response: JobResponse; onSelectJob?: (job: Job) => void }) {
  const [visibleCount, setVisibleCount] = useState(3);

  if (!response.success || response.jobs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-900 mb-2">{response.message || "No jobs found."}</p>
        {response.tips && response.tips.length > 0 && (
          <ul className="list-disc pl-4 space-y-1 text-slate-500">
            {response.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const visibleJobs = response.jobs.slice(0, visibleCount);
  const hasMore = visibleCount < response.jobs.length;

  return (
    <div className="flex flex-col gap-3 my-2">
      <div className="text-xs font-medium text-slate-500 px-1">
        Found {response.total} jobs. Showing {visibleJobs.length} of {response.count}:
      </div>
      <div className="grid gap-3">
        {visibleJobs.map((job) => (
          <JobCard key={job.id} job={job} onSelectJob={onSelectJob} />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setVisibleCount((prev) => Math.min(prev + 5, response.jobs.length))}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Show more jobs <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function JobCard({ job, onSelectJob }: { job: Job; onSelectJob?: (job: Job) => void }) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
              <a href={job.link} target="_blank" rel="noopener noreferrer" className="before:absolute before:inset-0">
                {job.title}
              </a>
            </h4>
            <p className="text-sm text-slate-500 mt-0.5">{job.employer}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          {job.jobType}
        </div>
        {job.salary !== "Not specified" && (
          <div className="flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5" />
            {job.salary}
          </div>
        )}
        {job.postedDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {job.postedDate}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
        {job.description}
      </div>

      <div className="mt-1 flex items-center gap-2 relative z-10">
        <a 
          href={job.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors"
        >
          View Details
        </a>
        {onSelectJob && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectJob(job);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Ask about this job
          </button>
        )}
      </div>
    </div>
  );
}
