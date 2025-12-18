/**
 * Resume Section Component
 *
 * Sidebar component for managing the user's resume profile.
 * Functions:
 * - Uploads new resume files (PDF/DOCX)
 * - Triggers AI extraction pipeline
 * - Displays profile summary (name, skills count)
 * - visualizes upload rate limits (3/day)
 * - Handles deletion of stored profiles
 *
 * @module components/chat/ResumeSection
 * @see {@link ../../lib/resume/storage.ts} for indexedDB interactions
 */

"use client";

import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { isSupportedResumeFile, parseResumeFile } from "@/lib/resume/parser";
import {
  type UploadState,
  canUpload,
  deleteProfile,
  getProfile,
  getRemainingUploads,
  getUploadState,
  recordUpload,
  saveProfile,
} from "@/lib/resume/storage";
import type { ExtractedProfile } from "@/lib/resume/types";

interface ResumeSectionProps {
  isCollapsed: boolean;
}

export function ResumeSection({ isCollapsed }: ResumeSectionProps) {
  const [profile, setProfile] = useState<ExtractedProfile | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingUploads, setRemainingUploads] = useState(3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile on mount and poll for changes
  // (profile may be uploaded via ResumeToggle in the chatbar)
  useEffect(() => {
    const loadProfile = async () => {
      const existingProfile = await getProfile();
      setProfile(existingProfile);
      const remaining = await getRemainingUploads();
      setRemainingUploads(remaining);
    };
    loadProfile();

    // Poll every 2 seconds to catch uploads from ResumeToggle
    const interval = setInterval(loadProfile, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen for shared upload state changes from ResumeToggle (instant sync)
  useEffect(() => {
    const handleStorageChange = () => {
      const state = getUploadState();
      setUploadState(state);
    };

    // Check initial state
    handleStorageChange();

    // Listen for storage events (triggered by ResumeToggle)
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset input for re-uploads
      event.target.value = "";

      // Check rate limit
      const allowed = await canUpload();
      if (!allowed) {
        setErrorMessage("Upload limit reached (3/day). Try again tomorrow.");
        setUploadState("error");
        return;
      }

      // Validate file type
      if (!isSupportedResumeFile(file)) {
        setErrorMessage("Please upload a PDF or DOCX file");
        setUploadState("error");
        return;
      }

      try {
        // Step 1: Parse file
        setUploadState("parsing");
        setErrorMessage(null);
        const parsed = await parseResumeFile(file);

        // Step 2: Extract with AI
        setUploadState("extracting");
        const response = await fetch("/api/resume/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: parsed.text }),
        });

        if (!response.ok) {
          throw new Error("Failed to extract resume data");
        }

        const data = await response.json();
        if (!data.success || !data.profile) {
          throw new Error(data.error || "Extraction failed");
        }

        // Step 3: Save to IndexedDB
        await saveProfile(data.profile);
        await recordUpload(file.name);

        setProfile(data.profile);
        setRemainingUploads(await getRemainingUploads());
        setUploadState("success");

        // Reset to idle after showing success
        setTimeout(() => setUploadState("idle"), 2000);
      } catch (error) {
        console.error("Resume upload error:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Upload failed",
        );
        setUploadState("error");
      }
    },
    [],
  );

  const handleDelete = useCallback(async () => {
    await deleteProfile();
    setProfile(null);
    setUploadState("idle");
    setErrorMessage(null);
  }, []);

  // Collapsed view - just show icon
  if (isCollapsed) {
    return (
      <div className="border-t border-slate-200 bg-white p-2 flex justify-center">
        {profile ? (
          <div className="relative">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full" />
          </div>
        ) : (
          <FileText className="h-5 w-5 text-slate-400" />
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileChange}
        className="hidden"
      />

      {!profile ? (
        // No resume - show upload state
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Resume Profile
            </span>
            {remainingUploads < 3 && (
              <span className="text-slate-400">{remainingUploads}/3 today</span>
            )}
          </div>

          {uploadState === "error" && errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploadState === "parsing" || uploadState === "extracting"}
            className={clsx(
              "w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all",
              uploadState === "parsing" || uploadState === "extracting"
                ? "bg-slate-100 text-slate-400 cursor-wait"
                : "bg-[#006dff] text-white hover:bg-[#0056cc] shadow-sm",
            )}
          >
            {uploadState === "parsing" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Parsing file...
              </>
            ) : uploadState === "extracting" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Extracting profile...
              </>
            ) : uploadState === "success" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved!
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload Resume
              </>
            )}
          </button>

          <p className="text-[10px] text-slate-400 text-center">
            PDF or DOCX • Better career recommendations
          </p>
        </div>
      ) : (
        // Resume uploaded - show summary
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Resume Loaded
            </span>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete resume"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="bg-slate-50 rounded-lg p-2.5 space-y-1">
            {profile.name && (
              <p className="text-xs font-medium text-slate-700 truncate">
                {profile.name}
              </p>
            )}
            {profile.skills.length > 0 && (
              <p className="text-[10px] text-slate-500 truncate">
                {profile.skills.slice(0, 5).join(", ")}
                {profile.skills.length > 5 &&
                  ` +${profile.skills.length - 5} more`}
              </p>
            )}
            {profile.experience.length > 0 && (
              <p className="text-[10px] text-slate-400">
                {profile.experience.length} experience
                {profile.experience.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
