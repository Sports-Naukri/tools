"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

const navLinks = [
  { label: "Solutions", href: "#tools" },
  { label: "Playbooks", href: "#" },
  { label: "Insights", href: "#" },
  { label: "Partners", href: "#" },
];

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".card-glow")
    );

    const handlers = cards.map((card) => {
      const handleMouseMove = (event: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      };

      card.addEventListener("mousemove", handleMouseMove);
      return { card, handleMouseMove };
    });

    return () => {
      handlers.forEach(({ card, handleMouseMove }) => {
        card.removeEventListener("mousemove", handleMouseMove);
      });
    };
  }, []);

  useEffect(() => {
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>(".tool-card")
    );

    if (!revealItems.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.25,
        rootMargin: "0px 0px -80px 0px",
      }
    );

    revealItems.forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${index * 90}ms`);
      observer.observe(item);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const currentYear = new Date().getFullYear();

  const handleScrollClick = useCallback(() => {
    const toolsSection = document.getElementById("tools");

    if (toolsSection) {
      const headerOffset = 72;
      const elementPosition = toolsSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      return;
    }

    window.scrollBy({ top: window.innerHeight * 0.3, behavior: "smooth" });
  }, []);

  return (
    <div
      id="root"
      className="flex min-h-screen flex-col overflow-x-hidden"
      style={{ maxWidth: "100vw" }}
    >
      <header className="fixed top-0 z-50 w-full max-w-[100vw] border-b border-border/40 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex items-center gap-2">
              <a
                className="whitespace-nowrap text-lg font-bold tracking-tight gap-2 text-gray-900 inline-flex"
                href="#"
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
                  <polygon fill="#654E9F" points="302,245.7 302.6,251.5 302.4,257.4 418.1,257.1 427.8,251.2 417.7,245.4"/>
                  <polygon fill="#654E9F" points="490.9,308.2 493.3,367.6 513,367.5 510.6,308.1"/>
                  <path fill="#6D28D9" d="M497.6,6.3L76,249.9l421.5,243.6l421.5-243.6L497.6,6.3z M550,383c-1,1.3-2.3,2.5-4.1,3.6
                    c-1.8,1.1-3.7,1.9-5.8,2.6s-4.5,0.9-7.2,1l-57.7,0.3c-2.7,0-5.2-0.3-7.3-0.9c-2.2-0.6-4.2-1.4-6-2.5c-1.9-1.1-3.3-2.2-4.4-3.5
                    c-1.1-1.3-1.6-2.7-1.7-4.4l-3.2-82.5c-0.1-1.6,0.4-3.1,1.4-4.3c1-1.3,2.3-2.5,4.1-3.5c1.8-1.1,3.7-1.9,5.8-2.5s4.5-0.9,7.2-0.9
                    l57.5-0.2c2.7,0,5.1,0.3,7.3,0.9c2.2,0.6,4.2,1.4,6,2.5c1.8,1.1,3.3,2.2,4.4,3.5c1.1,1.3,1.6,2.7,1.7,4.3l3.4,82.3
                    C551.4,380.2,551,381.7,550,383z M675.7,302.9c-5.2,3.2-11.2,5.7-18.1,7.5c-6.9,1.8-14.1,2.7-21.7,2.7l-1.5-34.1l-37.6,0.1
                    l-0.7-16.8l-139.7,0.4l-27.8,17L284,280c-2.7,0-5.3-0.3-7.6-0.8c-2.3-0.5-4.4-1.3-6.2-2.4s-3.3-2.3-4.4-3.7
                    c-1.1-1.4-1.6-2.9-1.7-4.5l-1.1-33.9c-0.1-1.6,0.4-3.1,1.4-4.5c1-1.4,2.4-2.7,4.2-3.7c1.8-1.1,3.8-1.9,6.1-2.4
                    c2.3-0.5,4.8-0.8,7.5-0.8l144.1-0.2l29.4,17l23,0l-2.6-66l-19.7-11.4l-1.9-48.2l75.9,0.1l2,48.1l-18.7,11.4l2.7,65.9l78.1-0.2
                    l-0.8-17.2l37.5-0.1l-38.9-22.5l-0.5-11.2l94.9-0.1l0.5,11.1l-36.7,22.5l37.4-0.1L691,279c0.2,4.5-1,8.8-3.6,12.9
                    C684.8,296,680.9,299.7,675.7,302.9z"/>
                  <path d="M963.7,324.3L539.2,562.8l3,430.3l424.5-238.5L963.7,324.3z M861.1,731.2l-53.5,25.9l-80.9-133.6l-28.9,186.7L650,833.2
                    l39.4-262.5l53.2-27.5l81.2,135.6l32.5-194.3l52.1-26.9L861.1,731.2z"/>
                  <path fill="#006DFF" d="M32.5,754.7L457,993.1l3-430.3L35.5,324.3L32.5,754.7z M158.6,691.9c22.5,37.5,42.9,60.7,64.5,74
                    c31.3,19.3,50.6,14.6,50.6-13.9c0-15.8-7.4-32.7-24.7-47.9l-31.4-27.6c-36.1-31.5-52.4-67.9-52.4-100.3c0-58.9,32.1-80.9,91.4-42.4
                    c30,19.5,56.7,50.3,77.7,86.4l-21.6,26c-15.7-26.6-36.2-51.1-55.8-63.7c-28.5-18.4-44.9-12.6-44.9,12.9c0,15.9,8.6,30.1,25.9,45.5
                    l31.5,27.9c34.3,30.4,50,69.5,50,101.2c0.1,66.7-38.4,80.2-102,41.4c-32.4-19.7-61.9-53.3-81.7-93.2L158.6,691.9z"/>
                </g>
              </svg>
                SportsNaukri Tools
              </a>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-primary md:hidden">
                Early
                <span
                  className="material-symbols-outlined text-[0.95rem]"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="18px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#6D28D9"
                  >
                    <path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z" />
                  </svg>
                </span>
              </span>
            </div>
          </div>
          <nav className="hidden flex-1 items-center justify-center gap-7 text-sm font-semibold text-gray-600 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                className="transition-colors duration-200 hover:text-gray-900"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-3">
            <button
              className="md:inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-transform duration-200 hover:text-primary-foreground hidden"
            >
              <span className="material-symbols-outlined text-base">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#6D28D9"
                >
                  <path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z" />
                </svg>
              </span>
              Early Access
            </button>
            <button
              type="button"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
              onClick={toggleMenu}
              className="inline-flex items-center justify-center rounded-full border border-border/60 p-2 text-gray-900 transition hover:border-primary/40 hover:text-primary md:hidden"
            >
              <span className="material-symbols-outlined text-2xl">
                {isMenuOpen ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#666666"
                  >
                    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm440-80h120v-560H640v560Zm-80 0v-560H200v560h360Zm80 0h120-120Z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#666666"
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
        className={`fixed top-16 inset-y-0 left-0 z-50 w-[80%] max-w-sm bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/60 pb-10 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="mt-6 flex flex-col gap-1 px-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={closeMenu}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-base font-semibold text-gray-700 transition hover:bg-primary/10 hover:text-gray-900"
            >
              {link.label}
              <span className="material-symbols-outlined text-lg text-primary/60">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#666666"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>
              </span>
            </a>
          ))}
        </nav>
      </div>
      <main
        className={`relative isolate flex-1 pt-16 transition-transform duration-300 ease-in-out transform-gpu ${
          isMenuOpen
            ? "md:translate-x-0 translate-x-[80%] blur-sm"
            : "filter-none"
        }`}
        style={{ willChange: "transform" }}
      >
        <section className="hero-section relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden">
          <div className="container mx-auto px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary shadow-sm backdrop-blur">
                New for 2025
                <span className="material-symbols-outlined text-base">
                  <Image
                    src="sparkles.svg"
                    alt="sparkles"
                    width={15}
                    height={15}
                  ></Image>
                </span>
              </div>
              <h1 className="mt-8 text-4xl font-black text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
                The <span className="gradient-text">Future</span> of Sports
                Careers, Powered by AI
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-700 sm:text-xl">
                Elevate your game in the sports industry. Our intelligent tools
                are engineered to refine your resume, perfect job descriptions,
                and give you a competitive edge.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <a
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-primary/40"
                  href="#tools"
                >
                  Explore tools
                  <span className="material-symbols-outlined text-base">
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
                </a>
                <a
                  className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-6 py-3 text-sm font-semibold text-gray-700 backdrop-blur transition-colors duration-200 hover:text-gray-900"
                  href="#"
                >
                  Watch product tour
                  <span className="material-symbols-outlined text-base">
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
                </a>
              </div>
            </div>
          </div>
          <div className="hero-fade" aria-hidden="true" />
          <div className="hero-gradient" aria-hidden="true" />
          <button
            type="button"
            className="scroll-button"
            onClick={handleScrollClick}
            aria-label="Scroll to tools section"
          >
            <span
              className="material-symbols-outlined text-2xl"
              aria-hidden="true"
            >
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
        <section id="tools" className="tools-section relative pt-20">
          <div className="container mx-auto px-4 pb-24 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Explore our AI-powered playbook
              </h2>
              <p className="mt-4 text-base text-gray-600">
                Purpose-built assistants crafted for every step of a sports
                professional’s journey.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
              <div className="tool-card card-glow group glassmorphic-card flex flex-col rounded-2xl p-8 transition-transform duration-500 ease-out hover:-translate-y-2">
                <div className="grow">
                  <div className="group-hover:bg-primary/20 group-hover:scale-110 mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20 transition-all duration-300 overflow-clip">
                    <span className="material-symbols-outlined text-4xl text-primary">
                      <Image
                        src="/jay.jpg"
                        alt="jay"
                        width={70}
                        height={70}
                      ></Image>
                    </span>
                  </div>
                  <h2 className="mb-4 text-3xl font-bold text-card-foreground">
                    JAY - SportsNaukri Assistant
                  </h2>
                  <p className="mb-8 leading-relaxed text-gray-600">
                    JAY is SportsNaukri’s official AI assistant, built to help job seekers discover verified sports industry opportunities across India and create professional, tailored resumes for their career growth.
                  </p>
                </div>
                <a
                  className="relative inline-flex w-full transform items-center justify-center overflow-hidden rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/30 sm:w-auto"
                  href="https://chatgpt.com/g/g-68f10fa4c7f88191a88c0c9831323d00-jay-sportsnaukri-assistant"
                  target="_blank"
                >
                  <span>Build My Resume</span>
                  <span className="material-symbols-outlined ml-2 text-xl transition-transform duration-300 group-hover:translate-x-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                      fill="#FFFFFF"
                    >
                      <path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z" />
                    </svg>
                  </span>
                </a>
              </div>
              <div className="tool-card card-glow group glassmorphic-card flex flex-col rounded-2xl p-8 transition-transform duration-500 ease-out hover:-translate-y-2">
                <div className="grow">
                  <div className="group-hover:bg-primary/20 group-hover:scale-110 mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20 transition-all duration-300 overflow-clip">
                    <span className="material-symbols-outlined text-4xl text-primary">
                      <Image
                        src="/sportscareernavigator.jpg"
                        alt="sportscareernavigator"
                        width={70}
                        height={70}
                      ></Image>
                    </span>
                  </div>
                  <h2 className="mb-4 text-3xl font-bold text-card-foreground">
                    Sports Career Navigator
                  </h2>
                  <p className="mb-8 leading-relaxed text-gray-600">
                    Sports Career Navigator helps users identify ideal roles in the sports industry by mapping their skills, education, and interests, while offering personalized upskilling and career growth guidance.
                  </p>
                </div>
                <a
                  className="relative inline-flex w-full transform items-center justify-center overflow-hidden rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/30 sm:w-auto"
                  href="https://chatgpt.com/g/g-68fe37d8694081919ada2181521d7866-sports-career-navigator"
                  target="_blank"
                >
                  <span>Discover careers</span>
                  <span className="material-symbols-outlined ml-2 text-xl transition-transform duration-300 group-hover:translate-x-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                      fill="#FFFFFF"
                    >
                      <path d="M647-440H160v-80h487L423-744l57-56 320 320-320 320-57-56 224-224Z" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>
            <div className="mt-24 text-center">
              <div className="inline-block rounded-full border border-border px-6 py-3 bg-secondary shadow-sm transition-shadow hover:shadow-md">
                <p className="flex items-center justify-center gap-3 text-lg font-semibold text-foreground/80">
                  <span className="material-symbols-outlined animate-pulse text-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                      fill="000000"
                    >
                      <path d="m226-559 78 33q14-28 29-54t33-52l-56-11-84 84Zm142 83 114 113q42-16 90-49t90-75q70-70 109.5-155.5T806-800q-72-5-158 34.5T492-656q-42 42-75 90t-49 90Zm178-65q-23-23-23-56.5t23-56.5q23-23 57-23t57 23q23 23 23 56.5T660-541q-23 23-57 23t-57-23Zm19 321 84-84-11-56q-26 18-52 32.5T532-299l33 79Zm313-653q19 121-23.5 235.5T708-419l20 99q4 20-2 39t-20 33L538-80l-84-197-171-171-197-84 167-168q14-14 33.5-20t39.5-2l99 20q104-104 218-147t235-24ZM157-321q35-35 85.5-35.5T328-322q35 35 34.5 85.5T327-151q-25 25-83.5 43T82-76q14-103 32-161.5t43-83.5Zm57 56q-10 10-20 36.5T180-175q27-4 53.5-13.5T270-208q12-12 13-29t-11-29q-12-12-29-11.5T214-265Z" />
                    </svg>
                  </span>
                  More tools coming soon!
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className={`relative isolate flex-1 pt-16 transition-transform duration-300 ease-in-out transform-gpu border-t border-border/60 bg-background/80 py-8 backdrop-blur supports-backdrop-filter:bg-background/60 ${
          isMenuOpen
            ? "md:translate-x-0 translate-x-[80%] blur-sm"
            : "filter-none"
        }`}
        style={{ willChange: "transform" }}
      >
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 sm:px-6 lg:px-8">
          © {currentYear} Sports Naukri. All Right Reserved.
        </div>
      </footer>
    </div>
  );
}
