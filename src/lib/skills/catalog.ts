export type SkillDefinition = {
  id: string;
  label: string;
  category: string;
  keywords: string[];
  weight?: number;
};

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: "youth-coaching",
    label: "Youth Coaching",
    category: "Coaching",
    keywords: ["grassroots", "youth coaching", "player development", "academy coaching", "junior squad"],
    weight: 1.1,
  },
  {
    id: "strength-conditioning",
    label: "Strength & Conditioning",
    category: "Sports Science",
    keywords: ["strength and conditioning", "s&c", "periodization", "plyometric", "conditioning program"],
    weight: 1.2,
  },
  {
    id: "sports-analytics",
    label: "Sports Analytics",
    category: "Data & Insights",
    keywords: ["match analysis", "video analysis", "data analyst", "performance dashboard", "tracking data"],
  },
  {
    id: "talent-scouting",
    label: "Talent Scouting",
    category: "Recruitment",
    keywords: ["talent identification", "scouting", "player scouting", "trial management", "recruitment pipeline"],
  },
  {
    id: "event-operations",
    label: "Event Operations",
    category: "Operations",
    keywords: ["event operations", "venue operations", "match day", "logistics", "event execution"],
  },
  {
    id: "sports-marketing",
    label: "Sports Marketing",
    category: "Marketing",
    keywords: ["sports marketing", "campaign planning", "brand partnerships", "fan campaigns", "market activation"],
  },
  {
    id: "partnership-sales",
    label: "Sponsorship & Partnerships",
    category: "Commercial",
    keywords: ["sponsorship", "partnership sales", "inventory", "brand tie-up", "renewal pipeline"],
  },
  {
    id: "sports-journalism",
    label: "Sports Journalism",
    category: "Media",
    keywords: ["sports journalist", "newsroom", "match reports", "editorial", "storytelling"],
  },
  {
    id: "fan-engagement",
    label: "Fan Engagement",
    category: "Marketing",
    keywords: ["fan engagement", "community", "fan loyalty", "activation", "supporter club"],
  },
  {
    id: "sports-technology",
    label: "Sports Technology",
    category: "Product",
    keywords: ["sports tech", "wearables", "tracking hardware", "product roadmap", "feature rollout"],
  },
  {
    id: "video-production",
    label: "Video Production",
    category: "Media",
    keywords: ["video editor", "broadcast", "live production", "post production", "highlights"],
  },
  {
    id: "sports-physiotherapy",
    label: "Sports Physiotherapy",
    category: "Sports Science",
    keywords: ["physiotherapy", "injury rehab", "manual therapy", "return to play", "assessment"],
  },
  {
    id: "sports-nutrition",
    label: "Sports Nutrition",
    category: "Sports Science",
    keywords: ["sports nutrition", "meal plan", "macro", "supplement", "dietary"],
  },
  {
    id: "sports-admin",
    label: "Sports Administration",
    category: "Operations",
    keywords: ["sports administration", "federation", "compliance", "licensing", "tournament paperwork"],
  },
  {
    id: "sports-law",
    label: "Sports Law & Compliance",
    category: "Corporate",
    keywords: ["sports law", "player contract", "compliance", "policy", "arbitration"],
  },
  {
    id: "grassroots-development",
    label: "Grassroots Development",
    category: "Coaching",
    keywords: ["grassroots", "community program", "introductory coaching", "schools program", "talent nursery"],
  },
  {
    id: "sports-education",
    label: "Sports Education",
    category: "Academics",
    keywords: ["curriculum", "sports educator", "certificate course", "faculty", "module design"],
  },
  {
    id: "ticketing-crm",
    label: "Ticketing & CRM",
    category: "Commercial",
    keywords: ["ticketing", "crm", "box office", "revenue", "customer data"],
  },
  {
    id: "broadcast-rights",
    label: "Broadcast & OTT",
    category: "Media",
    keywords: ["broadcast", "ott", "rights management", "distribution", "programming"],
  },
  {
    id: "esports-operations",
    label: "Esports Operations",
    category: "Operations",
    keywords: ["esports", "tournament ops", "shoutcasting", "lan event", "gaming community"],
  },
  {
    id: "sports-psychology",
    label: "Sports Psychology",
    category: "Sports Science",
    keywords: ["sports psychology", "mental conditioning", "mindfulness", "confidence building", "psychological skills training"],
  },
  {
    id: "data-visualization",
    label: "Performance Reporting",
    category: "Data & Insights",
    keywords: ["reporting", "dashboard", "kpi tracking", "data visualization", "power bi", "tableau"],
  },
];

export const SKILL_SECTION_HEADERS = [
  "skills",
  "core skills",
  "key skills",
  "core competencies",
  "competencies",
  "technical skills",
  "tools",
];
