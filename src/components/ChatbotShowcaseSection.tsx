"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

const chatbots = [
  {
    id: "jay",
    name: "Jay",
    description:
      "Your personal sports industry expert. Ask Jay anything about sports trends, data, and insights.",
    gradient: "from-[#006dff] to-[#6d28d9]",
    link: "/chat?model=jay",
  },
  {
    id: "career-navigator",
    name: "Career Navigator",
    description:
      "Navigate your path in the sports world. Get tailored career advice, resume reviews, and job matching.",
    gradient: "from-[#6d28d9] to-[#006dff]",
    link: "/chat?model=career-navigator",
  },
];

function ChatbotCard({
  bot,
  index,
}: {
  bot: (typeof chatbots)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set(clientX - left - width / 2);
    y.set(clientY - top - height / 2);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);
  const spotlight = useMotionTemplate`radial-gradient(650px circle at ${mouseX}px ${mouseY}px, rgba(0, 109, 255, 0.1), transparent 80%)`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.2, ease: "easeOut" }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10"
    >
      <motion.div
        style={{ background: spotlight }}
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div
        className={`absolute inset-0 bg-linear-to-br ${bot.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.03]`}
      />

      <div className="relative z-10 flex flex-1 flex-col justify-between transform-gpu transition-transform duration-300 group-hover:translate-z-10">
        <div>
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200 group-hover:bg-white group-hover:shadow-md transition-all">
            {/* Placeholder Icon */}
            <div
              className={`h-6 w-6 rounded-full bg-linear-to-br ${bot.gradient}`}
            />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 group-hover:text-[#006dff] transition-colors">
            {bot.name}
          </h3>
          <p className="mt-4 text-base leading-7 text-gray-600">
            {bot.description}
          </p>
        </div>

        <div className="mt-8">
          <Link
            href={bot.link}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#006dff] transition-all group-hover:gap-3"
          >
            Start Chatting
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export function ChatbotShowcaseSection() {
  return (
    <section
      id="chatbots"
      className="relative overflow-hidden bg-gray-50/50 py-24 sm:py-32"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          >
            Meet Your AI Companions
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-4 text-lg leading-8 text-gray-600"
          >
            Powered by advanced AI to accelerate your sports career.
          </motion.p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-2 perspective-1000">
          {chatbots.map((bot, index) => (
            <ChatbotCard key={bot.id} bot={bot} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
