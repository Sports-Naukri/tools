import { cache } from "react";

export type NavLink = {
  label: string;
  href: string;
};

export type Tool = {
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

export const getSiteContent = cache(() => {
  const navLinks: NavLink[] = [{ label: "Solutions", href: "#tools" }];

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

  return { navLinks, tools };
});
