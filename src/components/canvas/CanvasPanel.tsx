"use client";

import { Download, FileText, Minimize2, X } from "lucide-react";
import clsx from "clsx";

import type { CanvasDocument } from "@/lib/canvas/documents";
import { exportDocumentToDocx } from "@/lib/canvas/docx";

export type CanvasPanelProps = {
  document: CanvasDocument | null;
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onExpand: () => void;
};

/**
 * A slide-out panel that displays generated documents.
 * Supports minimizing to a floating button and expanding to a full-height sidebar.
 * Includes controls for downloading the document as DOCX.
 */
export function CanvasPanel({ document, isOpen, isMinimized, onClose, onMinimize, onExpand }: CanvasPanelProps) {
  const isVisible = isOpen && Boolean(document);

  return (
    <aside
      className={clsx(
        "fixed top-0 right-0 z-30 h-full transition-all duration-500 ease-in-out",
        isMinimized ? "w-16" : "w-full max-w-[min(640px,50vw)]",
        isVisible ? "translate-x-0" : "translate-x-full",
        !isMinimized && "bg-white shadow-2xl border-l border-slate-100"
      )}
    >
      {isMinimized ? (
        <button
          type="button"
          onClick={onExpand}
          className="absolute top-4 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-xl transition hover:scale-105"
          aria-label="Expand canvas"
        >
          <FileText className="h-5 w-5" />
        </button>
      ) : (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                {document?.type || "Document"}
              </span>
              <p className="text-lg font-semibold text-slate-900">{document?.title ?? "Generating artifact"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportDocumentToDocx(document ?? null)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Download as DOCX"
                disabled={!document}
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onMinimize}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Minimize canvas"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-red-500"
                title="Close canvas"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-slate-50 px-8 py-10">
            <div className="mx-auto min-h-[calc(100%-4rem)] max-w-[620px] bg-white p-10 shadow-sm">
              {document ? <DocumentPreview document={document} /> : <DocumentSkeleton />}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * Renders the content of a generated document.
 * Maps document sections to HTML elements.
 */
function DocumentPreview({ document }: { document: CanvasDocument }) {
  return (
    <div className="space-y-8 text-slate-700">
      {document.title && <h1 className="text-3xl font-semibold text-slate-900">{document.title}</h1>}
      {document.style && (
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{document.style} style</div>
      )}
      {document.content.map((section, index) => (
        <section key={`${section.heading ?? "section"}-${index}`} className="space-y-2">
          {section.heading && <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>}
          {section.meta && <p className="text-xs font-mono uppercase tracking-wide text-slate-400">{section.meta}</p>}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{section.body}</p>
        </section>
      ))}
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
      <div className="h-8 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
    </div>
  );
}
