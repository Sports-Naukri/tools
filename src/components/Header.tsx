"use client";

import Link from "next/link";
import localFont from "next/font/local";
import type { ReactNode } from "react";

type NavLink = {
  label: string;
  href: string;
};

const cedora = localFont({
  src: [
    {
      path: "../../public/Cedora-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
  ],
  display: "swap",
});

type HeaderProps = {
  navLinks: NavLink[];
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  cta?: ReactNode;
};

export function Header({
  navLinks,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  cta,
}: HeaderProps) {
  return (
    <>
      <header className="fixed top-0 z-50 w-full max-w-screen bg-[#f9f7ff]/10 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-full items-center gap-4 px-2 sm:px-4 lg:px-12">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex w-full items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 whitespace-nowrap text-gray-900"
              >
                <svg
                  viewBox="0 0 1000 1000"
                  width={30}
                  height={30}
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <g>
                    <polygon
                      fill="#654E9F"
                      points="302,245.7 302.6,251.5 302.4,257.4 418.1,257.1 427.8,251.2 417.7,245.4"
                    />
                    <polygon
                      fill="#654E9F"
                      points="490.9,308.2 493.3,367.6 513,367.5 510.6,308.1"
                    />
                    <path
                      fill="#6D28D9"
                      d="M497.6,6.3L76,249.9l421.5,243.6l421.5-243.6L497.6,6.3z M550,383c-1,1.3-2.3,2.5-4.1,3.6
                    c-1.8,1.1-3.7,1.9-5.8,2.6s-4.5,0.9-7.2,1l-57.7,0.3c-2.7,0-5.2-0.3-7.3-0.9c-2.2-0.6-4.2-1.4-6-2.5c-1.9-1.1-3.3-2.2-4.4-3.5
                    c-1.1-1.3-1.6-2.7-1.7-4.4l-3.2-82.5c-0.1-1.6,0.4-3.1,1.4-4.3c1-1.3,2.3-2.5,4.1-3.5c1.8-1.1,3.7-1.9,5.8-2.5s4.5-0.9,7.2-0.9
                    l57.5-0.2c2.7,0,5.1,0.3,7.3,0.9c2.2,0.6,4.2,1.4,6,2.5c1.8,1.1,3.3,2.2,4.4,3.5c1.1,1.3,1.6,2.7,1.7,4.3l3.4,82.3
                    C551.4,380.2,551,381.7,550,383z M675.7,302.9c-5.2,3.2-11.2,5.7-18.1,7.5c-6.9,1.8-14.1,2.7-21.7,2.7l-1.5-34.1l-37.6,0.1
                    l-0.7-16.8l-139.7,0.4l-27.8,17L284,280c-2.7,0-5.3-0.3-7.6-0.8c-2.3-0.5-4.4-1.3-6.2-2.4s-3.3-2.3-4.4-3.7
                    c-1.1-1.4-1.6-2.9-1.7-4.5l-1.1-33.9c-0.1-1.6,0.4-3.1,1.4-4.5c1-1.4,2.4-2.7,4.2-3.7c1.8-1.1,3.8-1.9,6.1-2.4
                    c2.3-0.5,4.8-0.8,7.5-0.8l144.1-0.2l29.4,17l23,0l-2.6-66l-19.7-11.4l-1.9-48.2l75.9,0.1l2,48.1l-18.7,11.4l2.7,65.9l78.1-0.2
                    l-0.8-17.2l37.5-0.1l-38.9-22.5l-0.5-11.2l94.9-0.1l0.5,11.1l-36.7,22.5l37.4-0.1L691,279c0.2,4.5-1,8.8-3.6,12.9
                    C684.8,296,680.9,299.7,675.7,302.9z"
                    />
                    <path
                      d="M963.7,324.3L539.2,562.8l3,430.3l424.5-238.5L963.7,324.3z M861.1,731.2l-53.5,25.9l-80.9-133.6l-28.9,186.7L650,833.2
                    l39.4-262.5l53.2-27.5l81.2,135.6l32.5-194.3l52.1-26.9L861.1,731.2z"
                    />
                    <path
                      fill="#006DFF"
                      d="M32.5,754.7L457,993.1l3-430.3L35.5,324.3L32.5,754.7z M158.6,691.9c22.5,37.5,42.9,60.7,64.5,74
                    c31.3,19.3,50.6,14.6,50.6-13.9c0-15.8-7.4-32.7-24.7-47.9l-31.4-27.6c-36.1-31.5-52.4-67.9-52.4-100.3c0-58.9,32.1-80.9,91.4-42.4
                    c30,19.5,56.7,50.3,77.7,86.4l-21.6,26c-15.7-26.6-36.2-51.1-55.8-63.7c-28.5-18.4-44.9-12.6-44.9,12.9c0,15.9,8.6,30.1,25.9,45.5
                    l31.5,27.9c34.3,30.4,50,69.5,50,101.2c0.1,66.7-38.4,80.2-102,41.4c-32.4-19.7-61.9-53.3-81.7-93.2L158.6,691.9z"
                    />
                  </g>
                </svg>
                <span
                  className={`${cedora.className} text-lg font-semibold tracking-tight`}
                >
                  SportsNaukri <span className="text-[#006dff]">Tools</span>
                </span>
              </Link>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-primary md:hidden">
                Early
                <span className="inline-flex text-[0.95rem]" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="18px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#006dff"
                  >
                    <path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z" />
                  </svg>
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            {cta}
            <button
              type="button"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
              onClick={onToggleMenu}
              className="group inline-flex items-center justify-center rounded-full border border-gray-400 p-2 transition"
            >
              <span className="inline-flex text-2xl" aria-hidden="true">
              {isMenuOpen ? (
                <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#9CA3AF"
                className="group-hover:fill-gray-600"
                >
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm440-80h120v-560H640v560Zm-80 0v-560H200v560h360Zm80 0h120-120Z" />
                </svg>
              ) : (
                <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#9CA3AF"
                className="group-hover:fill-gray-600"
                >
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z" />
                </svg>
              )}
              </span>
            </button>
          </div>
        </div>
      </header>
      <div
        className={`fixed top-16 inset-y-0 left-0 z-40 h-[calc(100dvh-4rem)] w-[80%] max-w-sm transform-gpu bg-[#f9f7ff]/10 backdrop-blur-md pb-10 transition-transform duration-300 ease-in-out md:w-[320px] md:max-w-none ${
          isMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <nav className="mt-6 flex flex-col gap-2 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={onCloseMenu}
                className="group flex items-center justify-between rounded-xl border border-transparent bg-white/60 px-4 py-3 text-base font-semibold text-gray-800 transition hover:border-primary/30 hover:bg-white hover:text-primary"
                scroll={link.href.startsWith("#")}
              >
                {link.label}
                <span className="inline-flex text-lg text-primary/70 transition-transform group-hover:translate-x-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="currentColor"
                  >
                    <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
                  </svg>
                </span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-6">
            <div className="mt-8 rounded-2xl border border-primary/20 bg-white/70 p-4 text-sm text-gray-700 shadow-sm">
              <p className="mb-3 font-medium text-gray-900">
                Explore more with SportsNaukri
              </p>
              <Link
                href="https://sportsnaukri.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition text-xs md:text-sm"
              >
                Visit SportsNaukri.com
                <span
                  className="inline-flex transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
