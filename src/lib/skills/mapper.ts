/**
 * Sports Career Navigator - Skill Mapping Tool
 *
 * This module powers the Navigator's career path recommendations by mapping
 * user skills to sports industry roles. It uses a database of 49 skill categories
 * derived from docs/comprehensive_sports_skill_mapping_table.md.
 *
 * HOW IT WORKS:
 * 1. User provides a list of their skills (e.g., "Python", "data visualization")
 * 2. mapSkillsToRoles() fuzzy-matches skills against our keyword database
 * 3. Returns matching roles, recommended training, tools, and job search keywords
 *
 * USAGE:
 * - Called by the skill_mapper tool in /api/chat/route.ts
 * - Navigator mode uses this to provide data-driven career recommendations
 *
 * AI SDK v5 NOTE:
 * - Requires outputSchema (skillMapperOutputSchema) for proper tool result capture
 * - Used with stopWhen: [stepCountIs(5)] for multi-step continuation
 */

import { z } from "zod";

/**
 * Skill mapping database - each entry maps a skill category to sports industry roles.
 * Keywords are used for fuzzy matching against user input.
 */
export const SKILL_MAPPINGS = [
  {
    skill: "Data analysis",
    keywords: ["excel", "sql", "data", "analysis", "analytics", "spreadsheet"],
    function: "Analytics / BI",
    roles: [
      "Sports Data Analyst",
      "Fan Insights Analyst",
      "Business Intelligence Analyst",
    ],
    seniority: "Entry → Senior",
    tools: ["Excel", "SQL", "Power BI", "Tableau", "Python (pandas)"],
    training: [
      "Data Analytics Specialization",
      "Google Data Analytics",
      "SQL courses",
    ],
    searchKeywords: ["sports data analyst", "fan insights"],
  },
  {
    skill: "Statistical modelling",
    keywords: [
      "statistics",
      "statistical",
      "modeling",
      "modelling",
      "r programming",
      "spss",
    ],
    function: "Analytics / Research",
    roles: [
      "Performance Statistician",
      "Quant Analyst",
      "Sports Scientist (data)",
    ],
    seniority: "Mid → Senior",
    tools: ["R", "Python", "SPSS", "MATLAB"],
    training: ["MSc Sports Analytics", "Applied Statistics"],
    searchKeywords: ["performance modeler", "sports statistician"],
  },
  {
    skill: "Machine learning",
    keywords: [
      "machine learning",
      "ml",
      "ai",
      "artificial intelligence",
      "deep learning",
      "tensorflow",
    ],
    function: "Analytics / Product",
    roles: ["ML Engineer (sports)", "Predictive Analytics Lead"],
    seniority: "Mid → Senior",
    tools: ["Python (scikit-learn, TensorFlow)", "ML pipelines", "cloud"],
    training: ["ML Specialization", "Coursera/fast.ai"],
    searchKeywords: ["sports ML", "predictive scouting"],
  },
  {
    skill: "Data visualization",
    keywords: [
      "visualization",
      "tableau",
      "power bi",
      "dashboard",
      "charts",
      "graphs",
    ],
    function: "Analytics / BI",
    roles: ["BI Developer", "Data Viz Specialist"],
    seniority: "Entry → Mid",
    tools: ["Tableau", "Power BI", "D3.js"],
    training: ["Tableau Certification", "Power BI courses"],
    searchKeywords: ["sports BI", "sports dashboards"],
  },
  {
    skill: "Performance analysis",
    keywords: [
      "performance",
      "video analysis",
      "hudl",
      "sportscode",
      "match analysis",
    ],
    function: "Performance / Coaching",
    roles: ["Performance Analyst", "Video Analyst"],
    seniority: "Entry → Mid",
    tools: ["Hudl", "Sportscode", "Dartfish", "Nacsport"],
    training: ["Performance Analysis courses", "Hudl Certification"],
    searchKeywords: ["performance analyst", "video analyst"],
  },
  {
    skill: "Strength & conditioning",
    keywords: [
      "strength",
      "conditioning",
      "s&c",
      "fitness",
      "gym",
      "training",
      "workout",
    ],
    function: "Performance / S&C",
    roles: ["S&C Coach", "Head of S&C", "Fitness Trainer"],
    seniority: "Entry → Senior",
    tools: ["Gym equipment", "GPS load monitoring"],
    training: ["NSCA-CSCS", "UKSCA"],
    searchKeywords: ["strength and conditioning coach"],
  },
  {
    skill: "Sports science",
    keywords: ["sports science", "physiology", "biomechanics", "kinesiology"],
    function: "Sports Science",
    roles: ["Sports Scientist", "Physiologist"],
    seniority: "Mid → Senior",
    tools: ["VO2 max testing", "GPS", "Biomechanics tools"],
    training: ["MSc Sports Science", "ASCA certs"],
    searchKeywords: ["sports scientist"],
  },
  {
    skill: "Sports physiotherapy",
    keywords: [
      "physiotherapy",
      "physio",
      "rehabilitation",
      "rehab",
      "injury",
      "physical therapy",
    ],
    function: "Medical",
    roles: ["Sports Physiotherapist", "Rehab Specialist"],
    seniority: "Entry → Senior",
    tools: ["Clinical assessment tools", "rehab equipment"],
    training: ["Chartered Physiotherapist", "Sports Physio cert"],
    searchKeywords: ["sports physiotherapist"],
  },
  {
    skill: "Nutrition",
    keywords: [
      "nutrition",
      "diet",
      "dietitian",
      "nutritionist",
      "meal planning",
      "food",
    ],
    function: "Medical / Performance",
    roles: ["Sports Nutritionist", "Performance Dietitian"],
    seniority: "Entry → Senior",
    tools: ["Meal planning tools", "nutrition analysis"],
    training: ["MSc Sports Nutrition", "SENr"],
    searchKeywords: ["sports nutritionist"],
  },
  {
    skill: "Coaching",
    keywords: [
      "coaching",
      "coach",
      "training",
      "teaching",
      "mentoring",
      "tactics",
    ],
    function: "Coaching",
    roles: ["Head Coach", "Assistant Coach", "Youth Coach"],
    seniority: "Entry → Senior",
    tools: ["Session planning apps", "video review"],
    training: ["Coaching licenses (FA, FIBA, etc.)"],
    searchKeywords: ["head coach", "youth coach"],
  },
  {
    skill: "Talent scouting",
    keywords: [
      "scouting",
      "scout",
      "talent",
      "recruitment",
      "player identification",
    ],
    function: "Recruitment",
    roles: ["Scout", "Recruitment Analyst", "Head of Scouting"],
    seniority: "Entry → Senior",
    tools: ["Video platforms", "scouting databases", "Wyscout", "InStat"],
    training: ["Scouting courses", "talent ID workshops"],
    searchKeywords: ["scout", "talent ID", "recruitment analyst"],
  },
  {
    skill: "Event operations",
    keywords: [
      "event",
      "events",
      "operations",
      "tournament",
      "logistics",
      "matchday",
    ],
    function: "Events / Ops",
    roles: ["Event Manager", "Tournament Operations", "Matchday Manager"],
    seniority: "Entry → Senior",
    tools: ["Event management software", "ticketing systems"],
    training: ["Event Management Cert", "IAVM workshops"],
    searchKeywords: ["event manager", "matchday ops"],
  },
  {
    skill: "Venue management",
    keywords: ["venue", "stadium", "facility", "facilities", "arena"],
    function: "Facility Ops",
    roles: ["Venue Manager", "Stadium Operations Manager"],
    seniority: "Mid → Senior",
    tools: ["CAFM systems", "access control"],
    training: ["Venue operations training", "Health & Safety certs"],
    searchKeywords: ["stadium manager", "venue operations"],
  },
  {
    skill: "Sponsorship",
    keywords: [
      "sponsorship",
      "sponsor",
      "partnership",
      "commercial",
      "brand partnership",
    ],
    function: "Commercial / Sales",
    roles: ["Sponsorship Manager", "Partnership Executive"],
    seniority: "Entry → Senior",
    tools: ["CRM", "PowerPoint", "proposal tools"],
    training: ["Sponsorship training", "MBA modules"],
    searchKeywords: ["sponsorship manager", "commercial partnerships"],
  },
  {
    skill: "Marketing",
    keywords: [
      "marketing",
      "brand",
      "campaign",
      "digital marketing",
      "advertising",
    ],
    function: "Marketing",
    roles: ["Brand Manager", "Marketing Manager", "Campaign Manager"],
    seniority: "Entry → Senior",
    tools: ["Google Analytics", "Meta Ads", "CMS"],
    training: ["Digital Marketing Certs", "Google Analytics"],
    searchKeywords: ["sports marketing", "brand manager"],
  },
  {
    skill: "Social media",
    keywords: [
      "social media",
      "instagram",
      "twitter",
      "facebook",
      "content",
      "community",
    ],
    function: "Content / Digital",
    roles: ["Social Media Manager", "Community Manager", "Content Creator"],
    seniority: "Entry → Mid",
    tools: ["Meta Business Suite", "Hootsuite", "Sprout Social"],
    training: ["Social Media Marketing courses"],
    searchKeywords: ["social media manager", "content producer"],
  },
  {
    skill: "Video production",
    keywords: [
      "video",
      "editing",
      "production",
      "premiere",
      "after effects",
      "filming",
    ],
    function: "Media / Production",
    roles: ["Video Producer", "Editor", "Content Producer"],
    seniority: "Entry → Mid",
    tools: ["Adobe Premiere", "After Effects", "OBS"],
    training: ["Film/Video editing courses"],
    searchKeywords: ["video editor", "content producer"],
  },
  {
    skill: "Journalism",
    keywords: [
      "journalism",
      "journalist",
      "writing",
      "reporter",
      "commentary",
      "broadcasting",
    ],
    function: "Media / PR",
    roles: ["Commentator", "Sports Journalist", "Reporter"],
    seniority: "Entry → Senior",
    tools: ["CMS", "recording gear", "editing tools"],
    training: ["Journalism qualifications", "NCTJ"],
    searchKeywords: ["sports journalist", "commentator"],
  },
  {
    skill: "Public relations",
    keywords: [
      "pr",
      "public relations",
      "communications",
      "media relations",
      "press",
    ],
    function: "PR / Comms",
    roles: ["PR Manager", "Media Relations Officer", "Communications Manager"],
    seniority: "Entry → Senior",
    tools: ["PR software", "CMS"],
    training: ["PR training", "CIPR courses"],
    searchKeywords: ["PR manager", "media relations"],
  },
  {
    skill: "Finance",
    keywords: [
      "finance",
      "accounting",
      "budget",
      "financial",
      "revenue",
      "money",
    ],
    function: "Finance",
    roles: ["Finance Manager", "Revenue Analyst", "Accountant"],
    seniority: "Entry → Senior",
    tools: ["Excel", "SAP", "QuickBooks"],
    training: ["ACCA", "CMA", "Finance diplomas"],
    searchKeywords: ["sports finance", "revenue manager"],
  },
  {
    skill: "Legal",
    keywords: ["legal", "law", "contract", "contracts", "compliance", "lawyer"],
    function: "Legal / Compliance",
    roles: ["Legal Counsel (sports)", "Contracts Manager"],
    seniority: "Mid → Senior",
    tools: ["Contract management systems"],
    training: ["LLB", "Legal practice certs"],
    searchKeywords: ["sports lawyer", "contracts manager"],
  },
  {
    skill: "HR",
    keywords: [
      "hr",
      "human resources",
      "people",
      "recruitment",
      "hiring",
      "talent acquisition",
    ],
    function: "People",
    roles: ["HR Manager", "Talent Partner", "People Operations"],
    seniority: "Entry → Senior",
    tools: ["HRIS", "ATS", "payroll systems"],
    training: ["CIPD", "HR certifications"],
    searchKeywords: ["HR manager sports"],
  },
  {
    skill: "Software development",
    keywords: [
      "software",
      "developer",
      "coding",
      "programming",
      "javascript",
      "python",
      "react",
      "frontend",
      "backend",
    ],
    function: "Tech",
    roles: [
      "Frontend/Backend Engineer",
      "Fullstack Developer",
      "Sports Tech Developer",
    ],
    seniority: "Entry → Senior",
    tools: ["React", "Node", "Python", "SQL"],
    training: ["CS degree", "coding bootcamps"],
    searchKeywords: ["sports software engineer"],
  },
  {
    skill: "Product management",
    keywords: ["product", "product manager", "pm", "roadmap", "agile", "scrum"],
    function: "Product / Tech",
    roles: ["Product Manager (sports app)", "Growth PM"],
    seniority: "Mid → Senior",
    tools: ["Jira", "Figma", "Mixpanel"],
    training: ["Product Management courses", "PM certificates"],
    searchKeywords: ["product manager sports app"],
  },
  {
    skill: "UX/UI design",
    keywords: ["ux", "ui", "design", "figma", "user experience", "interface"],
    function: "Design / Product",
    roles: ["UX Designer", "Product Designer", "UI Designer"],
    seniority: "Entry → Mid",
    tools: ["Figma", "Sketch", "Adobe XD"],
    training: ["UX Design bootcamps", "Nielsen heuristics"],
    searchKeywords: ["UX designer sports"],
  },
  {
    skill: "Psychology",
    keywords: [
      "psychology",
      "mental",
      "sports psychology",
      "mindset",
      "mental health",
    ],
    function: "Welfare",
    roles: [
      "Sports Psychologist",
      "Athlete Welfare Lead",
      "Mental Performance Coach",
    ],
    seniority: "Mid → Senior",
    tools: ["Psychological assessment tools"],
    training: ["MSc/PhD Sports Psychology", "accredited psychology cert"],
    searchKeywords: ["sports psychologist"],
  },
  {
    skill: "Data engineering",
    keywords: [
      "data engineering",
      "pipeline",
      "etl",
      "airflow",
      "spark",
      "aws",
      "gcp",
      "kafka",
    ],
    function: "Tech / Analytics",
    roles: ["Data Engineer (sports)", "ETL Developer"],
    seniority: "Mid → Senior",
    tools: ["SQL", "Airflow", "Spark", "AWS/GCP"],
    training: ["Data Engineering Nanodegree", "Cloud certs"],
    searchKeywords: ["sports data engineer"],
  },
  {
    skill: "Sports medicine",
    keywords: [
      "medicine",
      "doctor",
      "physician",
      "medical",
      "clinical",
      "diagnosis",
    ],
    function: "Medical",
    roles: ["Team Doctor", "Sports Physician"],
    seniority: "Senior",
    tools: ["Clinical diagnostics", "imaging"],
    training: ["Sports Medicine Fellowship", "MD"],
    searchKeywords: ["team doctor", "sports physician"],
  },
  {
    skill: "Player pathway management",
    keywords: [
      "pathway",
      "academy",
      "development",
      "curriculum",
      "youth development",
    ],
    function: "Development",
    roles: ["Academy Manager", "Pathway Lead"],
    seniority: "Mid → Senior",
    tools: ["LMS", "CRM for players"],
    training: ["Coaching badges", "Sports Management MSc"],
    searchKeywords: ["academy manager"],
  },
  {
    skill: "Logistics",
    keywords: [
      "logistics",
      "supply chain",
      "equipment",
      "transport",
      "inventory",
      "operations",
    ],
    function: "Operations",
    roles: ["Logistics Coordinator", "Equipment Manager"],
    seniority: "Entry → Mid",
    tools: ["ERP", "inventory systems"],
    training: ["Supply Chain courses", "logistics certs"],
    searchKeywords: ["sports logistics", "equipment manager"],
  },
  {
    skill: "Ticketing",
    keywords: [
      "ticketing",
      "customer service",
      "box office",
      "ticketmaster",
      "tessitura",
      "sales",
    ],
    function: "Commercial / CS",
    roles: ["Ticketing Manager", "Customer Service Rep"],
    seniority: "Entry → Mid",
    tools: ["Ticketing platforms (Ticketmaster, Tessitura)"],
    training: ["CRM training", "customer service certs"],
    searchKeywords: ["ticketing manager", "box office"],
  },
  {
    skill: "Corporate sales",
    keywords: [
      "sales",
      "hospitality",
      "corporate",
      "renewals",
      "upsell",
      "negotiation",
    ],
    function: "Commercial / Sales",
    roles: ["Corporate Sales Exec", "Hospitality Sales"],
    seniority: "Entry → Mid",
    tools: ["CRM", "Excel", "LinkedIn Sales Navigator"],
    training: ["Sales training", "negotiation workshops"],
    searchKeywords: ["corporate hospitality sales"],
  },
  {
    skill: "Broadcast operations",
    keywords: [
      "broadcast",
      "production",
      "live",
      "switchers",
      "encoding",
      "ob truck",
    ],
    function: "Media / Broadcast",
    roles: ["Broadcast Engineer", "OB Producer", "Technical Producer"],
    seniority: "Mid → Senior",
    tools: ["Broadcast trucks", "live switchers", "encoding"],
    training: ["Broadcast engineering certs"],
    searchKeywords: ["broadcast engineer", "live production"],
  },
  {
    skill: "Merchandising",
    keywords: ["merchandising", "retail", "pos", "inventory", "shop", "store"],
    function: "Commercial / Retail",
    roles: ["Merchandise Manager", "Retail Manager"],
    seniority: "Entry → Mid",
    tools: ["POS systems", "inventory"],
    training: ["Retail management courses"],
    searchKeywords: ["merchandise manager", "retail manager"],
  },
  {
    skill: "E-commerce",
    keywords: [
      "e-commerce",
      "ecommerce",
      "online sales",
      "shopify",
      "salesforce",
      "digital retail",
    ],
    function: "Commercial / Digital",
    roles: ["E‑commerce Manager", "CRM Manager"],
    seniority: "Mid",
    tools: ["Shopify", "Salesforce", "Braze"],
    training: ["E‑commerce and CRM certification"],
    searchKeywords: ["ecommerce manager sports", "CRM"],
  },
  {
    skill: "Commercial strategy",
    keywords: [
      "commercial",
      "strategy",
      "revenue",
      "monetisation",
      "growth",
      "business development",
    ],
    function: "Strategy / Exec",
    roles: ["Commercial Director", "Head of Revenue"],
    seniority: "Senior",
    tools: ["BI", "financial modelling"],
    training: ["MBA", "Strategic Management courses"],
    searchKeywords: ["commercial director", "head of revenue"],
  },
  {
    skill: "Scouting analytics",
    keywords: [
      "scouting analytics",
      "recruitment data",
      "wins",
      "abund",
      "wyscout",
      "instat",
      "opta",
    ],
    function: "Recruitment / Analytics",
    roles: ["Recruitment Data Analyst", "Scout Analyst"],
    seniority: "Entry → Mid",
    tools: ["Wyscout", "InStat", "Opta", "Python"],
    training: ["Scouting analytics bootcamps"],
    searchKeywords: ["recruitment analyst", "scouting analyst"],
  },
  {
    skill: "Wearables & sensor tech",
    keywords: [
      "wearables",
      "sensors",
      "gps",
      "catapult",
      "stat",
      "imu",
      "accelerometer",
    ],
    function: "Tech / Performance",
    roles: ["Sports Tech Engineer", "Sensor Data Analyst"],
    seniority: "Mid",
    tools: ["GPS", "accelerometers", "IMU", "APIs"],
    training: ["IoT and sensor analytics courses"],
    searchKeywords: ["wearables sports", "sensor data analyst"],
  },
  {
    skill: "App product management",
    keywords: ["app", "mobile", "ios", "android", "product manager", "growth"],
    function: "Product / Tech",
    roles: ["Product Manager (sports app)", "Growth PM"],
    seniority: "Mid → Senior",
    tools: ["Jira", "Figma", "Mixpanel"],
    training: ["Product Management courses", "PM certificates"],
    searchKeywords: ["product manager sports app"],
  },
  {
    skill: "QA & testing",
    keywords: [
      "qa",
      "quality assurance",
      "testing",
      "selenium",
      "automation",
      "manual testing",
    ],
    function: "Tech / Product",
    roles: ["QA Engineer", "Test Analyst"],
    seniority: "Entry → Mid",
    tools: ["TestRail", "Selenium"],
    training: ["Software testing certifications"],
    searchKeywords: ["QA engineer sports"],
  },
  {
    skill: "GIS & spatial analysis",
    keywords: ["gis", "spatial", "mapping", "arcgis", "qgis", "location"],
    function: "Analytics / Ops",
    roles: ["GIS Analyst", "Venue Planning Analyst"],
    seniority: "Mid",
    tools: ["QGIS", "ArcGIS"],
    training: ["GIS certifications"],
    searchKeywords: ["GIS sports", "venue planning"],
  },
  {
    skill: "Grounds management",
    keywords: [
      "grounds",
      "turf",
      "pitch",
      "grass",
      "irrigation",
      "greenkeeping",
    ],
    function: "Facilities",
    roles: ["Head Groundskeeper", "Turf Manager"],
    seniority: "Entry → Mid",
    tools: ["Turf equipment", "irrigation systems"],
    training: ["Groundskeeping diplomas"],
    searchKeywords: ["groundskeeper", "turf manager"],
  },
  {
    skill: "Safety & security",
    keywords: ["safety", "security", "crowd", "stewarding", "cctv", "risk"],
    function: "Venue Ops",
    roles: ["Safety Manager", "Security Lead"],
    seniority: "Mid → Senior",
    tools: ["CCTV", "access control", "risk assessment"],
    training: ["Crowd safety certifications", "security training"],
    searchKeywords: ["stadium security", "safety manager"],
  },
  {
    skill: "Sustainability",
    keywords: [
      "sustainability",
      "esg",
      "environmental",
      "carbon",
      "green",
      "eco",
    ],
    function: "Strategy / Ops",
    roles: ["Sustainability Manager", "ESG Lead"],
    seniority: "Mid",
    tools: ["ESG reporting tools"],
    training: ["Sustainability certifications"],
    searchKeywords: ["sustainability manager sports"],
  },
  {
    skill: "Research & academic",
    keywords: [
      "research",
      "academic",
      "phd",
      "lecturer",
      "university",
      "study",
    ],
    function: "Research",
    roles: ["Sports Researcher", "Lecturer"],
    seniority: "Mid → Senior",
    tools: ["Academic databases", "MATLAB", "R"],
    training: ["PhD", "Research MSc"],
    searchKeywords: ["sports researcher"],
  },
  {
    skill: "Community engagement",
    keywords: [
      "community",
      "grassroots",
      "participation",
      "outreach",
      "development",
    ],
    function: "Community",
    roles: ["Community Manager", "Participation Officer"],
    seniority: "Entry → Mid",
    tools: ["CRM", "CMS"],
    training: ["Community development training"],
    searchKeywords: ["community manager sports", "participation officer"],
  },
  {
    skill: "Refereeing",
    keywords: [
      "referee",
      "umpire",
      "official",
      "rules",
      "officiating",
      "arbitration",
    ],
    function: "Sport Governance",
    roles: ["Referee", "Match Official", "Umpire"],
    seniority: "Entry → Senior",
    tools: ["Rules knowledge", "communication systems"],
    training: ["Referee accreditation programs"],
    searchKeywords: ["referee", "match official"],
  },
  {
    skill: "Governance & policy",
    keywords: [
      "governance",
      "policy",
      "regulation",
      "compliance",
      "regulatory",
      "drafting",
    ],
    function: "Governance",
    roles: ["Policy Manager", "Regulatory Affairs"],
    seniority: "Mid → Senior",
    tools: ["Policy drafting tools"],
    training: ["Public policy qualifications"],
    searchKeywords: ["governing body jobs sports"],
  },
];

export const SKILL_MAPPER_TOOL_NAME = "skill_mapper";

export const skillMapperInputSchema = z.object({
  skills: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe("Array of user skills to map to sports industry roles"),
});

export type SkillMapperInput = z.infer<typeof skillMapperInputSchema>;

// Zod schema for skill mapping result
const skillMappingResultSchema = z.object({
  matchedSkill: z.string(),
  function: z.string(),
  roles: z.array(z.string()),
  seniority: z.string(),
  tools: z.array(z.string()),
  training: z.array(z.string()),
  searchKeywords: z.array(z.string()),
});

// Zod output schema for AI SDK v5
export const skillMapperOutputSchema = z.object({
  mappings: z.array(skillMappingResultSchema),
  unmatchedSkills: z.array(z.string()),
  suggestedSearchKeywords: z.array(z.string()),
  recommendedTraining: z.array(z.string()),
});

export interface SkillMappingResult {
  matchedSkill: string;
  function: string;
  roles: string[];
  seniority: string;
  tools: string[];
  training: string[];
  searchKeywords: string[];
}

export interface SkillMapperOutput {
  mappings: SkillMappingResult[];
  unmatchedSkills: string[];
  suggestedSearchKeywords: string[];
  recommendedTraining: string[];
}

/**
 * Maps user skills to sports industry roles
 */
export function mapSkillsToRoles(input: SkillMapperInput): SkillMapperOutput {
  const { skills } = input;
  const mappings: SkillMappingResult[] = [];
  const unmatchedSkills: string[] = [];
  const allSearchKeywords = new Set<string>();
  const allTraining = new Set<string>();

  for (const userSkill of skills) {
    const normalizedSkill = userSkill.toLowerCase().trim();
    let matched = false;

    for (const mapping of SKILL_MAPPINGS) {
      const skillMatches = mapping.keywords.some(
        (keyword) =>
          normalizedSkill.includes(keyword) ||
          keyword.includes(normalizedSkill),
      );

      if (skillMatches) {
        mappings.push({
          matchedSkill: mapping.skill,
          function: mapping.function,
          roles: mapping.roles,
          seniority: mapping.seniority,
          tools: mapping.tools,
          training: mapping.training,
          searchKeywords: mapping.searchKeywords,
        });

        mapping.searchKeywords.forEach((kw) => allSearchKeywords.add(kw));
        mapping.training.forEach((t) => allTraining.add(t));
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatchedSkills.push(userSkill);
    }
  }

  // Deduplicate mappings by skill
  const uniqueMappings = mappings.filter(
    (mapping, index, self) =>
      index === self.findIndex((m) => m.matchedSkill === mapping.matchedSkill),
  );

  return {
    mappings: uniqueMappings,
    unmatchedSkills,
    suggestedSearchKeywords: Array.from(allSearchKeywords),
    recommendedTraining: Array.from(allTraining),
  };
}
