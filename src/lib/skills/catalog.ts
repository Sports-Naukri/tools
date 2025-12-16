/**
 * Skill Catalog Definitions
 * 
 * Extended skill definitions for skill extraction and matching.
 * Complements the SKILL_MAPPINGS in mapper.ts with additional
 * skill categories and keywords for more comprehensive matching.
 * 
 * Used by:
 * - Resume skill extraction
 * - Advanced skill matching
 * - Skill categorization
 * 
 * @module lib/skills/catalog
 * @see {@link ./mapper.ts} for role mapping
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Skill definition with metadata for matching and categorization.
 */
export type SkillDefinition = {
  /** Unique identifier for this skill */
  id: string;
  /** Human-readable label */
  label: string;
  /** Skill category for grouping */
  category: string;
  /** Keywords for fuzzy matching */
  keywords: string[];
  /** Optional weight for prioritization (higher = more important) */
  weight?: number;
};

// ============================================================================
// Skill Definitions Database
// ============================================================================

/**
 * Comprehensive skill definitions database.
 * Organized by category with keywords for matching.
 */
export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // Coaching & Training
  {
    id: "youth-coaching",
    label: "Youth Coaching",
    category: "Coaching",
    keywords: ["grassroots", "youth coaching", "player development", "academy coaching", "junior squad"],
    weight: 1.1,
  },
  {
    id: "coaching-certifications",
    label: "Coaching Certifications",
    category: "Coaching",
    keywords: ["afc license", "uefa", "nsca", "ussf", "coaching badge", "pro license", "cscs", "certified coach"],
    weight: 1.2,
  },
  {
    id: "strength-conditioning",
    label: "Strength & Conditioning",
    category: "Sports Science",
    keywords: ["strength and conditioning", "s&c", "periodization", "plyometric", "conditioning program"],
    weight: 1.2,
  },
  {
    id: "fitness-training",
    label: "Fitness & Personal Training",
    category: "Sports Science",
    keywords: ["personal trainer", "fitness instructor", "gym trainer", "cpt", "ace certified", "nasm", "group fitness"],
  },
  {
    id: "grassroots-development",
    label: "Grassroots Development",
    category: "Coaching",
    keywords: ["grassroots", "community program", "introductory coaching", "schools program", "talent nursery"],
  },

  // Sports Science & Medicine
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
    id: "sports-psychology",
    label: "Sports Psychology",
    category: "Sports Science",
    keywords: ["sports psychology", "mental conditioning", "mindfulness", "confidence building", "psychological skills training"],
  },
  {
    id: "athletic-training",
    label: "Athletic Training",
    category: "Sports Science",
    keywords: ["athletic trainer", "atc certified", "injury prevention", "taping", "rehabilitation", "sports medicine"],
  },

  // Data & Analytics
  {
    id: "sports-analytics",
    label: "Sports Analytics",
    category: "Data & Insights",
    keywords: ["match analysis", "video analysis", "data analyst", "performance dashboard", "tracking data"],
  },
  {
    id: "data-visualization",
    label: "Performance Reporting",
    category: "Data & Insights",
    keywords: ["reporting", "dashboard", "kpi tracking", "data visualization", "power bi", "tableau"],
  },

  // Recruitment & Scouting
  {
    id: "talent-scouting",
    label: "Talent Scouting",
    category: "Recruitment",
    keywords: ["talent identification", "scouting", "player scouting", "trial management", "recruitment pipeline"],
  },
  {
    id: "player-representation",
    label: "Player Representation",
    category: "Recruitment",
    keywords: ["sports agent", "player agent", "contract negotiation", "athlete management", "representation", "endorsement deals"],
    weight: 1.1,
  },

  // Operations & Administration
  {
    id: "event-operations",
    label: "Event Operations",
    category: "Operations",
    keywords: ["event operations", "venue operations", "match day", "logistics", "event execution"],
  },
  {
    id: "sports-admin",
    label: "Sports Administration",
    category: "Operations",
    keywords: ["sports administration", "federation", "compliance", "licensing", "tournament paperwork"],
  },
  {
    id: "athletic-administration",
    label: "Athletic Administration",
    category: "Operations",
    keywords: ["athletic director", "budget management", "ncaa compliance", "program management", "booster relations", "title ix"],
    weight: 1.1,
  },
  {
    id: "equipment-management",
    label: "Equipment Management",
    category: "Operations",
    keywords: ["equipment manager", "kit manager", "inventory", "uniform", "gear maintenance", "sports equipment"],
  },
  {
    id: "esports-operations",
    label: "Esports Operations",
    category: "Operations",
    keywords: ["esports", "tournament ops", "shoutcasting", "lan event", "gaming community"],
  },

  // Marketing & Commercial
  {
    id: "sports-marketing",
    label: "Sports Marketing",
    category: "Marketing",
    keywords: ["sports marketing", "campaign planning", "brand partnerships", "fan campaigns", "market activation"],
  },
  {
    id: "fan-engagement",
    label: "Fan Engagement",
    category: "Marketing",
    keywords: ["fan engagement", "community", "fan loyalty", "activation", "supporter club"],
  },
  {
    id: "partnership-sales",
    label: "Sponsorship & Partnerships",
    category: "Commercial",
    keywords: ["sponsorship", "partnership sales", "inventory", "brand tie-up", "renewal pipeline"],
  },
  {
    id: "ticketing-crm",
    label: "Ticketing & CRM",
    category: "Commercial",
    keywords: ["ticketing", "crm", "box office", "revenue", "customer data"],
  },
  {
    id: "social-media-sports",
    label: "Sports Social Media",
    category: "Marketing",
    keywords: ["social media manager", "content creator", "instagram", "tiktok", "twitter", "sports content", "digital marketing"],
  },

  // Media & Broadcasting
  {
    id: "sports-journalism",
    label: "Sports Journalism",
    category: "Media",
    keywords: ["sports journalist", "newsroom", "match reports", "editorial", "storytelling"],
  },
  {
    id: "video-production",
    label: "Video Production",
    category: "Media",
    keywords: ["video editor", "broadcast", "live production", "post production", "highlights"],
  },
  {
    id: "broadcast-rights",
    label: "Broadcast & OTT",
    category: "Media",
    keywords: ["broadcast", "ott", "rights management", "distribution", "programming"],
  },
  {
    id: "sports-broadcasting",
    label: "Sports Broadcasting",
    category: "Media",
    keywords: ["commentator", "play-by-play", "color analyst", "sideline reporter", "sports anchor", "broadcasting"],
    weight: 1.1,
  },
  {
    id: "sports-photography",
    label: "Sports Photography",
    category: "Media",
    keywords: ["sports photographer", "action photography", "event photography", "press photography", "photojournalism"],
  },

  // Technology & Product
  {
    id: "sports-technology",
    label: "Sports Technology",
    category: "Product",
    keywords: ["sports tech", "wearables", "tracking hardware", "product roadmap", "feature rollout"],
  },

  // Legal & Corporate
  {
    id: "sports-law",
    label: "Sports Law & Compliance",
    category: "Corporate",
    keywords: ["sports law", "player contract", "compliance", "policy", "arbitration"],
  },

  // Education
  {
    id: "sports-education",
    label: "Sports Education",
    category: "Academics",
    keywords: ["curriculum", "sports educator", "certificate course", "faculty", "module design"],
  },
];

// ============================================================================
// Resume Section Headers
// ============================================================================

/**
 * Common section headers found in resumes that contain skills.
 * Used for parsing and extracting skills from resume text.
 */
export const SKILL_SECTION_HEADERS = [
  "skills",
  "core skills",
  "key skills",
  "core competencies",
  "competencies",
  "technical skills",
  "tools",
];
