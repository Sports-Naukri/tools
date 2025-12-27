/**
 * Home Page Client Orchestrator
 *
 * Orchestrates the landing page interactivity.
 * Features:
 * - Mobile menu toggle and state management
 * - Scroll locking when menu is open
 * - Smooth scrolling to specific sections ("Scroll" button)
 * - Responsiveness handlers (closing menu on resize)
 *
 * @module components/HomePageClient
 */

"use client";

import Lenis from "lenis";
import { useCallback, useEffect, useRef, useState } from "react";

import { CTASection } from "@/components/CTASection";
import { FeatureGrid } from "@/components/FeatureGrid";
import { FloatingSearch } from "@/components/FloatingSearch";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { SiteFooter } from "@/components/SiteFooter";
import type { NavLink } from "@/lib/siteContent";

type HomePageClientProps = {
  navLinks: NavLink[];
};

export function HomePageClient({ navLinks }: HomePageClientProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
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
    const shouldLockScroll = isMenuOpen && window.innerWidth < 768;

    if (shouldLockScroll) {
      document.body.style.overflow = "hidden";
      lenisRef.current?.stop();
    } else {
      document.body.style.overflow = originalOverflow;
      lenisRef.current?.start();
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

  return (
    <div
      id="root"
      className="flex min-h-screen max-w-screen flex-col overflow-x-hidden bg-white"
    >
      <Header
        navLinks={navLinks}
        isMenuOpen={isMenuOpen}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
      />
      <main
        className={`relative isolate flex-1 pt-16 transition-all duration-300 ease-in-out ${
          isMenuOpen ? "blur-sm md:blur-none md:ml-80" : "md:ml-0"
        }`}
      >
        <HeroSection />
        <FeatureGrid />
        <CTASection />
      </main>
      <SiteFooter currentYear={currentYear} isMenuOpen={isMenuOpen} />
      <FloatingSearch />
    </div>
  );
}
