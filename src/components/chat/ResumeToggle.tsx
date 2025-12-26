/**
 * Resume Toggle Component
 *
 * Context switcher located in the chat composer input area.
 * Behavior:
 * - No Profile: Shows "Upload Resume" button
 * - Has Profile: Shows "Resume On/Off" toggle
 * - Uploading: Shows progress/spinner
 *
 * Allows users to control whether their resume context is sent with the next message.
 *
 * @module components/chat/ResumeToggle
 */

"use client";

import clsx from "clsx";
import { FileCheck, FileUp, FileX, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { isSupportedResumeFile, parseResumeFile } from "@/lib/resume/parser";
import {
  canUpload,
  hasProfile,
  isContextEnabled,
  recordUpload,
  saveProfile,
  setContextEnabled,
  setUploadState,
} from "@/lib/resume/storage";

type ButtonState = "no-profile" | "uploading" | "extracting" | "has-profile";

interface ResumeToggleProps {
  /** Called when toggle state changes with the new value */
  onToggleChange?: (enabled: boolean) => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function ResumeToggle({ onToggleChange }: ResumeToggleProps) {
  const [buttonState, setButtonState] = useState<ButtonState>("no-profile");
  const [contextEnabled, setContextEnabledState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Check for profile on mount and periodically
  useEffect(() => {
    const checkProfile = async () => {
      const exists = await hasProfile();
      if (exists) {
        setButtonState("has-profile");
        const contextOn = await isContextEnabled();
        setContextEnabledState(contextOn);
      } else {
        setButtonState("no-profile");
      }
    };

    checkProfile();
    const interval = setInterval(checkProfile, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle upload click
  const handleUploadClick = useCallback(() => {
    setError(null);
    fileInputRef.current?.click();
  }, []);

  // Handle file selection and upload
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = "";

      // Check rate limit
      const allowed = await canUpload();
      if (!allowed) {
        setError("Limit reached (3/day)");
        toast.error("Upload limit reached", {
          description:
            "You can upload up to 3 resumes per day. Try again tomorrow.",
          duration: 4000,
        });
        return;
      }

      // Validate file
      if (!isSupportedResumeFile(file)) {
        setError("PDF or DOCX only");
        toast.error("Invalid file type", {
          description: "Please upload a PDF or DOCX file.",
          duration: 3000,
        });
        return;
      }

      // Show upload started toast with promise
      const uploadPromise = (async () => {
        // Parse file - broadcast state for sidebar
        setButtonState("uploading");
        setUploadState("parsing");
        const parsed = await parseResumeFile(file);

        // Extract with AI
        setButtonState("extracting");
        setUploadState("extracting");
        const response = await fetch("/api/resume/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText: parsed.text }),
        });

        if (!response.ok) throw new Error("Extraction failed");

        const data = await response.json();
        if (!data.success || !data.profile) throw new Error(data.error);

        // Save
        await saveProfile(data.profile);
        await recordUpload(file.name);

        setButtonState("has-profile");
        setUploadState("success");
        setContextEnabledState(true);
        await setContextEnabled(true);
        onToggleChange?.(true);

        // Reset upload state after brief success display
        setTimeout(() => setUploadState("idle"), 2000);

        return data.profile;
      })();

      toast.promise(uploadPromise, {
        loading: "Analyzing your resume...",
        success: (profile) =>
          profile?.name
            ? `Welcome, ${profile.name}! Your profile is ready.`
            : "Resume uploaded successfully!",
        error: "Failed to process resume. Please try again.",
      });

      try {
        await uploadPromise;
      } catch (err) {
        console.error("Resume upload error:", err);
        setError("Upload failed");
        setButtonState("no-profile");
        setUploadState("error");
        setTimeout(() => setUploadState("idle"), 3000);
      }
    },
    [onToggleChange],
  );

  // Handle toggle click
  const handleToggle = useCallback(async () => {
    const newState = !contextEnabled;
    setContextEnabledState(newState);
    await setContextEnabled(newState);
    onToggleChange?.(newState);
  }, [contextEnabled, onToggleChange]);

  const isLoading = buttonState === "uploading" || buttonState === "extracting";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileChange}
        className="sr-only"
        style={{ position: "absolute", left: "-9999px" }}
      />

      {buttonState === "has-profile" ? (
        // Toggle button when resume exists
        <button
          type="button"
          onClick={handleToggle}
          className={clsx(
            "flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all duration-300",
            isMobile ? "p-2" : "px-3 py-1.5",
            contextEnabled
              ? "bg-violet-100 text-violet-700 hover:bg-violet-200 shadow-sm shadow-violet-200/50"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200",
          )}
          title={
            contextEnabled
              ? "Click to disable resume context"
              : "Click to enable resume context"
          }
        >
          {contextEnabled ? (
            <>
              <FileCheck className="h-3.5 w-3.5" />
              {!isMobile && <span>Resume On</span>}
            </>
          ) : (
            <>
              <FileX className="h-3.5 w-3.5" />
              {!isMobile && <span>Resume Off</span>}
            </>
          )}
        </button>
      ) : (
        // Upload button when no resume
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isLoading}
          className={clsx(
            "flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all",
            isMobile ? "p-2" : "px-3 py-1.5",
            isLoading
              ? "bg-slate-100 text-slate-400 cursor-wait"
              : error
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
          title="Upload your resume for personalized recommendations"
        >
          {buttonState === "uploading" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {!isMobile && <span>Parsing...</span>}
            </>
          ) : buttonState === "extracting" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {!isMobile && <span>Extracting...</span>}
            </>
          ) : error ? (
            <>
              <FileX className="h-3.5 w-3.5" />
              {!isMobile && <span>{error}</span>}
            </>
          ) : (
            <>
              <FileUp className="h-3.5 w-3.5" />
              {!isMobile && <span>Upload Resume</span>}
            </>
          )}
        </button>
      )}
    </>
  );
}
