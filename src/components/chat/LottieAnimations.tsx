"use client";

import { useEffect, useState } from "react";
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
                    <span className="inline-block min-w-[180px]">Creating your document</span>
                    <span className="inline-block w-[24px] text-left animate-pulse">...</span>
                </p>
                <p className="text-xs text-slate-500">Structuring content and formatting</p>
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
                    <span className="inline-block min-w-[200px]">Searching for opportunities</span>
                    <span className="inline-block w-[24px] text-left animate-pulse">...</span>
                </p>
                <p className="text-xs text-slate-500">Finding relevant jobs for you</p>
            </div>
        </div>
    );
}

/**
 * Hook to add minimum display time for animations.
 * Ensures animation shows for at least the specified duration.
 */
export function useMinimumDisplayTime(isLoading: boolean, minMs: number = 1500): boolean {
    const [showAnimation, setShowAnimation] = useState(false);
    const [loadStartTime, setLoadStartTime] = useState<number | null>(null);

    useEffect(() => {
        if (isLoading && !loadStartTime) {
            setLoadStartTime(Date.now());
            setShowAnimation(true);
        } else if (!isLoading && loadStartTime) {
            const elapsed = Date.now() - loadStartTime;
            const remaining = Math.max(0, minMs - elapsed);

            if (remaining > 0) {
                const timeout = setTimeout(() => {
                    setShowAnimation(false);
                    setLoadStartTime(null);
                }, remaining);
                return () => clearTimeout(timeout);
            } else {
                setShowAnimation(false);
                setLoadStartTime(null);
            }
        }
    }, [isLoading, loadStartTime, minMs]);

    return showAnimation;
}
