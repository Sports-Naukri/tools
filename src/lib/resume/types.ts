/**
 * Resume Profile Types
 * 
 * Defines the structure for extracted resume data.
 * Used by:
 * - /api/resume/extract (AI extraction output)
 * - IndexedDB storage (resume/storage.ts)
 * - Navigator mode (context injection)
 */

/**
 * Work experience entry extracted from resume
 */
export interface WorkExperience {
    title: string;
    company: string;
    duration?: string;
    description?: string;
}

/**
 * Education entry extracted from resume
 */
export interface Education {
    degree: string;
    school: string;
    year?: string;
}

/**
 * Complete extracted profile from resume
 * Stored in IndexedDB, injected into Navigator for context
 */
export interface ExtractedProfile {
    /** Unique ID for this profile */
    id: string;

    /** When the resume was processed */
    extractedAt: string;

    /** Extracted name (if found) */
    name?: string;

    /** Extracted email (if found) */
    email?: string;

    /** Extracted phone (if found) */
    phone?: string;

    /** Extracted location (if found) */
    location?: string;

    /** Professional summary from resume */
    summary?: string;

    /** List of skills extracted from resume */
    skills: string[];

    /** Work experience entries */
    experience: WorkExperience[];

    /** Education entries */
    education: Education[];

    /** Certifications mentioned */
    certifications: string[];

    /** Original raw text for AI context fallback */
    rawText: string;
}

/**
 * Resume extraction request sent to /api/resume/extract
 */
export interface ResumeExtractionRequest {
    rawText: string;
}

/**
 * Resume extraction response from API
 */
export interface ResumeExtractionResponse {
    success: boolean;
    profile?: ExtractedProfile;
    error?: string;
}

/**
 * Resume upload tracking for rate limiting
 */
export interface ResumeUploadRecord {
    id: string;
    uploadedAt: string;
    fileName: string;
}
