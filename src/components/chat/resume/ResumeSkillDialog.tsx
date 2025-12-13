"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Plus, Sparkles } from "lucide-react";

import type { SkillMatch } from "@/lib/skills/extract";

export type ResumeSkillDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
  onConfirm: (skills: string[]) => void;
  draft: {
    fileName: string;
    wordCount: number;
    readingTimeMinutes: number;
    skills: SkillMatch[];
    textPreview: string;
    limitNotice?: string;
  } | null;
  isSubmitting?: boolean;
};

const MAX_SELECTED_SKILLS = 5;
const EMPTY_SKILLS: SkillMatch[] = [];

// Category colors for visual grouping
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Coaching": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  "Sports Science": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  "Data & Insights": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  "Recruitment": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  "Operations": { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" },
  "Marketing": { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700" },
  "Commercial": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  "Media": { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700" },
  "Product": { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  "Corporate": { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
  "Academics": { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
  "Resume Input": { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
};

const DEFAULT_COLORS = { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" };

export function ResumeSkillDialog({
  isOpen,
  onClose,
  onSkip,
  onConfirm,
  draft,
  isSubmitting = false,
}: ResumeSkillDialogProps) {
  const availableSkills = draft?.skills ?? EMPTY_SKILLS;
  const defaultSelected = useMemo(() => availableSkills.slice(0, MAX_SELECTED_SKILLS).map((skill) => skill.label), [availableSkills]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(defaultSelected);
  const [customSkill, setCustomSkill] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const groups: Record<string, SkillMatch[]> = {};
    for (const skill of availableSkills) {
      const category = skill.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(skill);
    }
    return groups;
  }, [availableSkills]);

  if (!isOpen || !draft) {
    return null;
  }

  const toggleSkill = (label: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(label)) {
        return prev.filter((item) => item !== label);
      }
      if (prev.length >= MAX_SELECTED_SKILLS) {
        return prev;
      }
      return [...prev, label];
    });
  };

  const handleAddCustomSkill = () => {
    const value = customSkill.trim();
    if (!value) {
      return;
    }
    if (selectedSkills.length >= MAX_SELECTED_SKILLS && !selectedSkills.includes(value)) {
      return;
    }
    setSelectedSkills((prev) => {
      if (prev.includes(value)) {
        return prev;
      }
      return [...prev, value];
    });
    setCustomSkill("");
  };

  const handleConfirm = () => {
    const trimmedSkills = selectedSkills.map((skill) => skill.trim()).filter(Boolean);
    onConfirm(trimmedSkills);
  };

  const remainingSlots = MAX_SELECTED_SKILLS - selectedSkills.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#006dff] to-[#00c6ff]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Resume detected</p>
              <h2 className="text-lg font-semibold text-slate-900">Select your key skills</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close resume skill dialog"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-5 px-6 py-5">
            {/* File Info Card */}
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">{draft.fileName}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{draft.wordCount} words</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{draft.readingTimeMinutes} min read</span>
              </div>
              {draft.limitNotice && (
                <p className="mt-2 text-xs text-slate-500">{draft.limitNotice}</p>
              )}
              <button
                type="button"
                onClick={() => setShowPreview((prev) => !prev)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#006dff] hover:text-[#0056cc]"
              >
                {showPreview ? (
                  <>
                    Hide excerpt <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Peek excerpt <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
              {showPreview && (
                <p className="mt-3 line-clamp-6 whitespace-pre-line rounded-lg bg-white p-3 text-sm text-slate-600 border border-slate-100">{draft.textPreview}</p>
              )}
            </div>

            {/* Selection Counter */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Detected skills
              </p>
              <div className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium",
                remainingSlots === 0 ? "bg-amber-100 text-amber-700" : "bg-[#006dff]/10 text-[#006dff]"
              )}>
                {selectedSkills.length} / {MAX_SELECTED_SKILLS} selected
              </div>
            </div>

            {/* Skills by Category */}
            {availableSkills.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                We couldn&apos;t detect clear skills from your resume. You can add your own below.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(skillsByCategory).map(([category, skills]) => {
                  const colors = CATEGORY_COLORS[category] || DEFAULT_COLORS;
                  return (
                    <div key={category}>
                      <p className={clsx("mb-2 text-xs font-medium", colors.text)}>{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => {
                          const isSelected = selectedSkills.includes(skill.label);
                          const isDisabled = !isSelected && remainingSlots === 0;
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              disabled={isDisabled}
                              className={clsx(
                                "group relative rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150",
                                isSelected
                                  ? "border-[#006dff] bg-[#006dff] text-white shadow-sm"
                                  : isDisabled
                                    ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                    : `${colors.border} ${colors.bg} ${colors.text} hover:shadow-sm hover:border-[#006dff]/50`
                              )}
                              onClick={() => toggleSkill(skill.label)}
                              title={`${skill.label} - ${Math.round(skill.confidence * 100)}% match confidence`}
                            >
                              <span>{skill.label}</span>
                              {isSelected && (
                                <Check className="ml-1.5 inline h-3.5 w-3.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom Skill Input */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Add a custom skill..."
                value={customSkill}
                onChange={(event) => setCustomSkill(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomSkill();
                  }
                }}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#006dff] focus:outline-none focus:ring-2 focus:ring-[#006dff]/10"
                maxLength={60}
                disabled={remainingSlots === 0}
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                disabled={remainingSlots === 0 || !customSkill.trim()}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                  remainingSlots === 0 || !customSkill.trim()
                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "border-[#006dff] text-[#006dff] hover:bg-[#006dff]/10"
                )}
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>

            {/* Privacy Note */}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We share only a short summary of your resume with the assistant. Your full resume text stays private unless you open the context panel.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50 rounded-b-3xl">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 transition"
          >
            Skip resume mapping
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || selectedSkills.length === 0}
              onClick={handleConfirm}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition shadow-sm",
                selectedSkills.length === 0 || isSubmitting
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#006dff] to-[#0056cc] hover:from-[#0056cc] hover:to-[#0050c7] shadow-[#006dff]/25"
              )}
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? "Sharing…" : "Continue with AI"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
