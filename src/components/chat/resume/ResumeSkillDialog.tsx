"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Resume detected</p>
            <h2 className="text-lg font-semibold text-slate-900">Map your resume before searching jobs</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Close resume skill dialog"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase text-slate-400">
              <span className="font-semibold text-slate-700">{draft.fileName}</span>
              <span>· {draft.wordCount} words</span>
              <span>· {draft.readingTimeMinutes} min read</span>
            </div>
            {draft.limitNotice && (
              <p className="mt-2 text-xs text-slate-500">{draft.limitNotice}</p>
            )}
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#006dff]"
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
              <p className="mt-3 line-clamp-6 whitespace-pre-line text-sm text-slate-600">{draft.textPreview}</p>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              We share only a short summary of your resume with the assistant. The full text stays hidden unless you open the context panel in the chat history.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Detected skills</p>
            {availableSkills.length === 0 ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                We couldn&apos;t detect clear skills. You can add your own below.
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.label);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      className={clsx(
                        "rounded-full border px-3 py-1.5 text-sm transition",
                        isSelected ? "border-[#006dff] bg-[#006dff]/10 text-[#0050c7]" : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                      onClick={() => toggleSkill(skill.label)}
                    >
                      <span className="font-medium">{skill.label}</span>
                      <span className="ml-1 text-xs text-slate-400">({Math.round(skill.confidence * 100)}%)</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Add a custom skill"
              value={customSkill}
              onChange={(event) => setCustomSkill(event.target.value)}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-[#006dff] focus:outline-none"
              maxLength={60}
            />
            <button
              type="button"
              onClick={handleAddCustomSkill}
              className="inline-flex items-center gap-1 rounded-full border border-[#006dff] px-4 py-2 text-sm font-semibold text-[#006dff] transition hover:bg-[#006dff]/10"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Skip resume mapping
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || selectedSkills.length === 0}
                onClick={handleConfirm}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white",
                  selectedSkills.length === 0 || isSubmitting
                    ? "bg-slate-300"
                    : "bg-[#006dff] hover:bg-[#0056cc]"
                )}
              >
                <Check className="h-4 w-4" />
                {isSubmitting ? "Sharing…" : "Share with AI"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
