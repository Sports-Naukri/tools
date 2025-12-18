"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="container mx-auto px-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#006dff]/80 to-[#6d28d9]/80 px-6 py-24 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-xl sm:px-12 border border-white/20"
      >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-8">
          <h2 className="text-3xl font-medium tracking-tight text-white sm:text-4xl md:text-5xl">
            Get started with SportsNaukri AI
          </h2>
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-8 py-3 text-base font-medium text-white transition-all hover:bg-white/20 hover:scale-105"
          >
            Start Chatting
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
