"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Compass, Sparkles } from "lucide-react";
import Link from "next/link";

export function FeatureGrid() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2 h-200 md:h-150">
        {/* Main Feature Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="group relative flex flex-col justify-end overflow-hidden rounded-3xl bg-black p-8 md:col-span-2 md:row-span-2"
        >
          <div className="absolute inset-0 bg-[url('/sportsnaukriai.png')] bg-cover bg-center opacity-80 transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50 to-transparent" />

          <div className="relative z-10 max-w-lg">
            <div className="mb-4 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md">
              <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
              <span>New Release</span>
            </div>
            <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
              The new SportsNaukri AI is here
            </h2>
            <p className="mb-6 text-lg text-gray-300">
              Experience the future of sports recruitment. Our advanced AI
              models help you find the perfect role and craft the ultimate
              resume.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-gray-200"
            >
              Try it now
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        {/* Secondary Card 1 - Jay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="group relative flex flex-col justify-end overflow-hidden rounded-3xl bg-black p-8 transition-colors md:col-span-1 md:row-span-1"
        >
          <div className="absolute inset-0 bg-[url('/jay.png')] bg-cover bg-center opacity-80 transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

          <div className="relative z-10">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-400">
              Model
            </span>
            <h3 className="text-2xl font-bold text-white">Jay 2.0</h3>
            <p className="text-sm text-gray-300">Flagship career assistant</p>
          </div>
        </motion.div>

        {/* Secondary Card 2 - Career Navigator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="group relative flex flex-col justify-end overflow-hidden rounded-3xl bg-black p-8 md:col-span-1 md:row-span-1"
        >
          <div className="absolute inset-0 bg-[url('/navigator.png')] bg-cover bg-center opacity-80 transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-md">
              <Compass className="mr-2 h-3 w-3" />
              <span>New Tool</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Career Navigator</h3>
            <p className="mt-2 text-sm text-gray-300">
              Map your path in the sports industry with AI-driven guidance.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
