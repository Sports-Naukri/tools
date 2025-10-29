"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

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

type ToolsSectionProps = {
  tools: Tool[];
};

const prefersReducedMotionQuery = "(prefers-reduced-motion: reduce)";
const finePointerQuery = "(pointer: fine)";

export function ToolsSection({ tools }: ToolsSectionProps) {
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const setCardRef = useCallback((index: number) => {
    return (element: HTMLDivElement | null) => {
      cardRefs.current[index] = element;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      prefersReducedMotionQuery
    ).matches;
    const pointerFine = window.matchMedia(finePointerQuery).matches;

    if (!pointerFine || prefersReducedMotion) {
      return;
    }

    const cleanupHandlers = cardRefs.current
      .filter((card): card is HTMLDivElement => Boolean(card))
      .map((card) => {
        const handleMouseMove = (event: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          card.style.setProperty("--mouse-x", `${x}px`);
          card.style.setProperty("--mouse-y", `${y}px`);
        };

        card.addEventListener("mousemove", handleMouseMove, { passive: true });
        return { card, handleMouseMove };
      });

    return () => {
      cleanupHandlers.forEach(({ card, handleMouseMove }) => {
        card.removeEventListener("mousemove", handleMouseMove);
      });
    };
  }, [tools.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      prefersReducedMotionQuery
    ).matches;
    const revealItems = cardRefs.current.filter(
      (card): card is HTMLDivElement => Boolean(card)
    );

    if (!revealItems.length) {
      return;
    }

    if (prefersReducedMotion) {
      revealItems.forEach((item) => {
        item.classList.add("is-visible");
      });
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
  }, [tools.length]);

  return (
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
          {tools.map((tool, index) => (
            <div
              key={tool.title}
              ref={setCardRef(index)}
              className="tool-card card-glow group glassmorphic-card flex flex-col rounded-2xl p-8 transition-transform duration-500 ease-out hover:-translate-y-2"
            >
              <div className="grow">
                <div className="group-hover:bg-primary/20 group-hover:scale-110 mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20 transition-all duration-300 overflow-clip">
                  <span
                    className="inline-flex text-4xl text-primary"
                    aria-hidden="true"
                  >
                    <Image
                      src={tool.image.src}
                      alt={tool.image.alt}
                      width={70}
                      height={70}
                    />
                  </span>
                </div>
                <h3 className="mb-4 text-3xl font-bold text-card-foreground">
                  {tool.title}
                </h3>
                <p className="mb-8 leading-relaxed text-gray-600">
                  {tool.description}
                </p>
              </div>
              <Link
                className="relative inline-flex w-full transform items-center justify-center overflow-hidden rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/30 sm:w-auto"
                href={tool.cta.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{tool.cta.label}</span>
                <span
                  className="ml-2 inline-flex text-xl transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                >
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
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-24 text-center">
          <div className="inline-block rounded-full border border-border px-6 py-3 bg-secondary shadow-sm transition-shadow hover:shadow-md">
            <p className="flex items-center justify-center gap-3 text-lg font-semibold text-foreground/80">
              <span
                className="inline-flex animate-pulse text-primary"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#000000"
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
  );
}
