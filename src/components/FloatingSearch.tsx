"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FloatingSearch() {
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState("");
  const router = useRouter();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const heroHeight = window.innerHeight * 0.5;
    if (latest > heroHeight) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      router.push(`/chat?initialMessage=${encodeURIComponent(input)}`);
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{
        y: isVisible ? 0 : 100,
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.9,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        mass: 1,
      }}
      className="fixed bottom-12 left-1/2 z-50 -translate-x-1/2"
    >
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 rounded-full bg-black/60 p-2 pl-6 shadow-2xl backdrop-blur-xl transition-all hover:bg-black/70 border border-white/10"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask SportsNaukri AI"
          className="w-48 bg-transparent text-base text-white placeholder:text-gray-400 focus:outline-none md:w-64"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 disabled:opacity-50 cursor-pointer"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </motion.div>
  );
}
