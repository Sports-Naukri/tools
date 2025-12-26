/**
 * Lottie Animation Components
 *
 * Reusable wrapper for Lottie JSON animations.
 * Used for specific loading states like "Job Searching" and "Document Generating".
 *
 * @module components/chat/LottieAnimations
 */

"use client";

import Lottie from "lottie-react";

// Import JSON animations from public folder
import documentAnimationData from "../../../public/document-generating.json";
import searchAnimationData from "../../../public/job-searching.json";

type LottieAnimationProps = {
  animationData: object;
  width?: number;
  height?: number;
  loop?: boolean;
  className?: string;
};

/**
 * Reusable Lottie animation component.
 */
function LottieAnimation({
  animationData,
  width = 80,
  height = 80,
  loop = true,
  className = "",
}: LottieAnimationProps) {
  return (
    <div className={className} style={{ width, height }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

/**
 * Document generation loading animation.
 * Clean, minimal design without excessive boxes.
 */
export function DocumentGeneratingAnimation() {
  return (
    <div className="flex items-center gap-4 py-3">
      <LottieAnimation
        animationData={documentAnimationData}
        width={56}
        height={56}
      />
      <div>
        <p className="text-sm font-medium text-slate-700">
          <span className="inline-block min-w-45">
            Creating your document
          </span>
          <span className="inline-block w-6 text-left animate-pulse">
            ...
          </span>
        </p>
        <p className="text-xs text-slate-500">
          Structuring content and formatting
        </p>
      </div>
    </div>
  );
}

/**
 * Job search loading animation.
 * Clean, minimal design without excessive boxes.
 */
export function JobSearchingAnimation() {
  return (
    <div className="flex items-center gap-4 py-3">
      <LottieAnimation
        animationData={searchAnimationData}
        width={56}
        height={56}
      />
      <div>
        <p className="text-sm font-medium text-slate-700">
          <span className="inline-block min-w-50">
            Searching for opportunities
          </span>
          <span className="inline-block w-6 text-left animate-pulse">
            ...
          </span>
        </p>
        <p className="text-xs text-slate-500">Finding relevant jobs for you</p>
      </div>
    </div>
  );
}
