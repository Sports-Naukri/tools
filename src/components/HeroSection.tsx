"use client";

import Image from "next/image";
import Link from "next/link";

type HeroSectionProps = {
  onScrollClick: () => void;
};

export function HeroSection({ onScrollClick }: HeroSectionProps) {
  return (
    <section className="hero-section relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden">
      <div className="container mx-auto px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary shadow-sm backdrop-blur">
            New for 2025
            <span className="inline-flex text-base" aria-hidden="true">
              <Image
                src="/sparkles.svg"
                alt="sparkles"
                width={15}
                height={15}
              />
            </span>
          </div>
          <h1 className="mt-8 text-4xl font-black text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
            The <span className="gradient-text">Future</span> of Sports Careers,
            Powered by AI
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-700 sm:text-xl">
            Elevate your game in the sports industry. Our intelligent tools are
            engineered to refine your resume, perfect job descriptions, and give
            you a competitive edge.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-primary/40"
              href="#tools"
              scroll
            >
              Explore tools
              <span className="inline-flex text-base" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#fff"
                >
                  <path d="m256-240-56-56 384-384H240v-80h480v480h-80v-344L256-240Z" />
                </svg>
              </span>
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-6 py-3 text-sm font-semibold text-gray-700 backdrop-blur transition-colors duration-200 hover:text-gray-900"
              href="#"
              scroll={false}
            >
              Watch product tour
              <span className="inline-flex text-base" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#000"
                >
                  <path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>
      <div className="hero-fade" aria-hidden="true" />
      <div className="hero-gradient" aria-hidden="true" />
      <button
        type="button"
        className="scroll-button"
        onClick={onScrollClick}
        aria-label="Scroll to tools section"
      >
        <span className="scroll-icon inline-flex text-2xl" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#666666"
          >
            <path d="m480-320 160-160-56-56-64 64v-168h-80v168l-64-64-56 56 160 160Zm0 240q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
          </svg>
        </span>
        <span>Scroll</span>
      </button>
    </section>
  );
}
