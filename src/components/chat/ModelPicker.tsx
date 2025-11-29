"use client";

import { Lock, Sparkles } from "lucide-react";
import clsx from "clsx";

import { CHAT_MODELS } from "@/lib/chat/constants";

type ModelPickerProps = {
  modelId: string;
  onChange: (id: string) => void;
};

/**
 * Component for selecting the AI model.
 * Displays available models and their status (enabled/locked).
 */
export function ModelPicker({ modelId, onChange }: ModelPickerProps) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Model</p>
          <p className="text-sm text-slate-500">Choose the response style</p>
        </div>
        <Sparkles className="h-5 w-5 text-[#007FF6]" />
      </div>
      <div className="mt-4 grid gap-2">
        {CHAT_MODELS.map((model) => {
          const active = modelId === model.id;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => model.isEnabled && onChange(model.id)}
              className={clsx(
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                active ? "border-[#007FF6] bg-[#E6F1FF]" : "border-slate-100 bg-slate-50",
                !model.isEnabled && "cursor-not-allowed opacity-60"
              )}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{model.name}</p>
                <p className="text-xs text-slate-500">{model.description}</p>
              </div>
              {!model.isEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  <Lock className="h-3.5 w-3.5" /> Locked
                </span>
              ) : active ? (
                <span className="rounded-full bg-[#007FF6] px-3 py-1 text-xs font-semibold text-white">Selected</span>
              ) : (
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">Available</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
