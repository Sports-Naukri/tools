"use client";

import clsx from "clsx";
import { ArrowLeft, Download, FileText, X } from "lucide-react";

import type { CanvasDocument } from "@/lib/canvas/documents";
import { exportDocumentToDocx } from "@/lib/canvas/docx";

export type CanvasPanelProps = {
  document: CanvasDocument | null;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * A slide-out panel that displays generated documents.
 * Fullscreen on mobile, side panel on desktop.
 * Includes controls for downloading the document as DOCX.
 */
export function CanvasPanel({ document, isOpen, onClose }: CanvasPanelProps) {
  const isVisible = isOpen && Boolean(document);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isVisible && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed z-50 h-full transition-all duration-300 ease-out",
          // Mobile: fullscreen from right
          "inset-0 md:inset-auto md:top-0 md:right-0",
          // Desktop: side panel with max width
          "md:w-full md:max-w-[min(640px,50vw)]",
          isVisible ? "translate-x-0" : "translate-x-full",
          "bg-white md:bg-white/95 md:backdrop-blur-xl md:border-l md:border-slate-100/70 md:shadow-[0_18px_60px_rgba(15,23,42,0.16)] md:rounded-l-3xl overflow-hidden",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile Header */}
          <header className="flex md:hidden items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 safe-top">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close document"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-slate-900 truncate">
                {document?.title ?? "Document"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportDocumentToDocx(document ?? null)}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                document
                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed",
              )}
              title="Download as DOCX"
              disabled={!document}
            >
              <Download className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Download</span>
            </button>
          </header>

          {/* Desktop Header */}
          <header className="hidden md:flex items-center justify-between border-b border-slate-100/80 bg-white/80 backdrop-blur-xl px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-linear-to-br from-blue-100 via-indigo-100 to-white border border-blue-50 text-blue-700 flex items-center justify-center shadow-[0_10px_30px_rgba(59,130,246,0.15)]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-slate-900">
                  {document?.title ?? "Generating artifact"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportDocumentToDocx(document ?? null)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  document
                    ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed",
                )}
                title="Download as DOCX"
                disabled={!document}
              >
                <Download className="h-4 w-4" />
                <span>Download DOCX</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close canvas"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Document Content */}
          <div className="relative flex-1 overflow-y-auto bg-slate-50 px-4 py-6 md:px-8 md:py-10">
            <div className="pointer-events-none absolute inset-4 md:inset-8 rounded-3xl border border-dashed border-slate-200/70 hidden md:block" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.05),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.05),transparent_35%)]" />
            <div className="relative mx-auto min-h-[calc(100%-2rem)] md:min-h-[calc(100%-4rem)] max-w-155 bg-white p-6 md:p-10 shadow-[0_14px_45px_rgba(15,23,42,0.08)] border border-slate-200/80 rounded-2xl transition-all">
              {document ? (
                <DocumentPreview document={document} />
              ) : (
                <DocumentSkeleton />
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/**
 * Renders the content of a generated document.
 * Maps document sections to HTML elements.
 */
function DocumentPreview({ document }: { document: CanvasDocument }) {
  return (
    <div className="space-y-6 text-slate-700">
      {document.title && (
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-slate-900">
            {document.title}
          </h1>
          {document.style && (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 border border-slate-200">
              {document.style} style
            </div>
          )}
        </div>
      )}
      <div className="space-y-6">
        {document.content.map((section, index) => (
          <section
            key={`${section.heading ?? "section"}-${index}`}
            className="space-y-2 border-b border-slate-100/80 pb-4 last:border-b-0"
          >
            {section.heading && (
              <h2 className="text-lg font-semibold text-slate-900">
                {section.heading}
              </h2>
            )}
            {section.meta && (
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
                {section.meta}
              </p>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Loading state for the document preview.
 * Shows a pulsing skeleton UI.
 */
function DocumentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-3/5 animate-pulse rounded-lg bg-slate-100" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
