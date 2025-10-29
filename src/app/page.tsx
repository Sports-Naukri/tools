"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { SiteFooter } from "@/components/SiteFooter";
import { ToolsSection } from "@/components/ToolsSection";

type NavLink = {
  label: string;
  href: string;
};

type Tool = {
  title: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
  cta: {
    href: string;
    label: string;
  };
};

const navLinks: NavLink[] = [
  { label: "Solutions", href: "#tools" },
  { label: "Playbooks", href: "#" },
  { label: "Insights", href: "#" },
  { label: "Partners", href: "#" },
];

const tools: Tool[] = [
  {
    title: "JAY - SportsNaukri Assistant",
    description:
      "JAY is SportsNaukri’s official AI assistant, built to help job seekers discover verified sports industry opportunities across India and create professional, tailored resumes for their career growth.",
    image: {
      src: "/jay.jpg",
      alt: "jay",
    },
    cta: {
      href: "https://chatgpt.com/g/g-68f10fa4c7f88191a88c0c9831323d00-jay-sportsnaukri-assistant",
      label: "Build My Resume",
    },
  },
  {
    title: "Sports Career Navigator",
    description:
      "Sports Career Navigator helps users identify ideal roles in the sports industry by mapping their skills, education, and interests, while offering personalized upskilling and career growth guidance.",
    image: {
      src: "/sportscareernavigator.jpg",
      alt: "sportscareernavigator",
    },
    cta: {
      href: "https://chatgpt.com/g/g-68fe37d8694081919ada2181521d7866-sports-career-navigator",
      label: "Discover careers",
    },
  },
];

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const currentYear = new Date().getFullYear();

  const headerCta = useMemo(
    () => (
      <button className="md:inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-transform duration-200 hover:text-primary-foreground hidden">
        <span className="inline-flex text-base" aria-hidden="true">
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
    ),
    []
  );

  return (
    <div
      id="root"
      className="flex min-h-screen max-w-[100vw] flex-col overflow-x-hidden"
    >
      <Header
        navLinks={navLinks}
        isMenuOpen={isMenuOpen}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
        cta={headerCta}
      />
      <main
        className={`relative isolate flex-1 pt-16 transition-transform duration-300 ease-in-out transform-gpu ${
          isMenuOpen
            ? "md:translate-x-0 translate-x-[80%] blur-sm"
            : "filter-none"
        }`}
        style={{ willChange: "transform" }}
      >
        <HeroSection onScrollClick={handleScrollClick} />
        <ToolsSection tools={tools} />
      </main>
      <SiteFooter currentYear={currentYear} isMenuOpen={isMenuOpen} />
    </div>
  );
}
