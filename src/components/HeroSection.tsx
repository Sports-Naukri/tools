"use client";

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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 800 800"
                fill="#6D28D9"
                stroke="#6D28D9"
                strokeWidth="14.2857"
                strokeMiterlimit="57.1429"
                width={15} 
                height={15}
              >
                <path d="M381.2,180.9c4,0,6-2.3,7-6c10.4-55.9,9.7-57.3,68-68.3c4-0.7,6.4-3,6.4-7c0-4-2.3-6.4-6.4-7
                  c-57.9-11.7-56.2-13.1-68-68.3c-1-3.7-3-6-7-6c-4,0-6,2.3-7,6c-11.7,55.2-9.7,56.6-68,68.3c-3.7,0.7-6.4,3-6.4,7c0,4,2.7,6.4,6.4,7
                  c58.3,11.7,57.6,12.4,68,68.3C375.2,178.5,377.2,180.9,381.2,180.9z M219.2,411.2c6.4,0,10.7-4,11.4-10
                  c12.1-89.4,15.1-89.4,107.5-107.1c6-1,10.4-5,10.4-11.4c0-6-4.4-10.4-10.4-11.4c-92.4-12.7-95.8-15.7-107.5-106.8
                  c-0.7-6-5-10.4-11.4-10.4c-6,0-10.4,4.4-11,10.7c-11,89.7-15.7,89.4-107.5,106.5c-6,1.3-10.4,5.4-10.4,11.4
                  c0,6.7,4.4,10.4,11.7,11.4c91.1,14.7,95.1,17.1,106.1,106.5C208.8,407.2,213.2,411.2,219.2,411.2z M446.2,781.9
                  c8.7,0,15.1-6.4,16.7-15.4c23.8-183.5,49.6-211.3,231-231.4c9.4-1,15.7-8,15.7-16.7c0-8.7-6.4-15.4-15.7-16.7
                  c-181.5-20.1-207.3-47.9-231-231.4c-1.7-9-8-15.1-16.7-15.1c-8.7,0-15.1,6-16.4,15.1c-23.8,183.5-49.9,211.3-231,231.4
                  c-9.7,1.3-16.1,8-16.1,16.7c0,8.7,6.4,15.7,16.1,16.7c180.8,23.8,205.9,48.2,231,231.4C431.1,775.5,437.5,781.9,446.2,781.9z"/>
              </svg>
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
