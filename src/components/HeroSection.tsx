"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [input, setInput] = useState("");

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      router.push(`/chat?initialMessage=${encodeURIComponent(input)}`);
    }
  };

  const suggestions = [
    { label: "Find sports marketing jobs", icon: "💼" },
    { label: "Review my resume", icon: "📄" },
    { label: "Latest cricket analytics trends", icon: "🏏" },
    { label: "Draft a cover letter", icon: "✍️" },
  ];

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4"
    >
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 -z-20 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Ambient Gradient Orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="absolute top-[-10%] left-[-10%] h-150 w-150 rounded-full bg-[#006dff]/5 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, -50, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="absolute bottom-[-10%] right-[-10%] h-175 w-175 rounded-full bg-[#6d28d9]/5 blur-[120px]"
        />
      </div>

      {/* Abstract Floating Elements */}
      <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="absolute top-[15%] left-[10%] h-24 w-24 rounded-full border border-gray-100 bg-white/50 backdrop-blur-sm shadow-sm"
        />
        <motion.div
          animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute top-[40%] right-[8%] h-40 w-40 rounded-full border border-gray-100 bg-linear-to-br from-blue-50/30 to-purple-50/30 backdrop-blur-sm shadow-sm"
        />
        <motion.div
          animate={{ y: [0, -25, 0], rotate: [0, 15, 0] }}
          transition={{
            duration: 12,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-[20%] left-[15%] h-20 w-20 rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-md shadow-sm rotate-12"
        />
      </div>

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl"
        >
          What can I help with?
        </motion.h1>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          onSubmit={handleSearch}
          className="relative w-full"
        >
          {/* Glow Effect */}
          <div className="absolute -inset-1 -z-10 rounded-3xl bg-linear-to-r from-[#006dff] via-[#6d28d9] to-[#006dff] opacity-20 blur-xl transition-opacity duration-500" />

          <div className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition-shadow hover:shadow-xl focus-within:border-gray-300 focus-within:shadow-xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch(e);
                }
              }}
              placeholder="Ask anything about sports careers, trends, or resume help..."
              className="min-h-30 w-full resize-none border-none bg-transparent p-6 text-lg text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:outline-none"
            />

            <div className="flex items-center justify-end px-4 pb-4">
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white transition-all hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="flex flex-wrap justify-center gap-3"
        >
          {suggestions.map((suggestion, i) => (
            <button
              type="button"
              key={i}
              onClick={() => {
                setInput(suggestion.label);
              }}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
            >
              <span className="text-base">{suggestion.icon}</span>
              {suggestion.label}
            </button>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
