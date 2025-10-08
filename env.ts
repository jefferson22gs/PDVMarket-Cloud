/**
 * =================================================================
 * WARNING: DO NOT COMMIT THIS FILE WITH YOUR REAL KEYS TO GIT!
 * =================================================================
 * This file provides a fallback for environment variables for local development.
 * In a production environment like Vercel, the variables will be injected
 * from the Vercel dashboard into `import.meta.env`.
 *
 * For local development, you can replace the placeholder values below.
 * It is highly recommended to add this file to your `.gitignore` to avoid
 * accidentally exposing your secret keys.
 */

// Fallback configuration for local development.
// The user provided these values. REMINDER: The anon key should be revoked and replaced.
const localConfig = {
    VITE_SUPABASE_URL: "https://dkhrygckobzgqhjdunjg.supabase.co",
    VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraHJ5Z2Nrb2J6Z3FoamR1bmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDUwNjQsImV4cCI6MjA3NTUyMTA2NH0.ti-tNpUedzukORJzRCbTgMA2XlxoH51KRkUakU_zUC4",
    VITE_GEMINI_API_KEY: "" // The user needs to add their Gemini key here for AI features to work locally.
};

// Vite provides environment variables via `import.meta.env`.
// We check if it exists and use it; otherwise, we fall back to our local config.
// This ensures compatibility with both Vercel's build process and local development.
// The `|| {}` handles the case where `import.meta.env` is undefined, preventing the error.
const effectiveEnv = (import.meta as any).env || {};

export const env = {
    VITE_SUPABASE_URL: effectiveEnv.VITE_SUPABASE_URL || localConfig.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: effectiveEnv.VITE_SUPABASE_ANON_KEY || localConfig.VITE_SUPABASE_ANON_KEY,
    VITE_GEMINI_API_KEY: effectiveEnv.VITE_GEMINI_API_KEY || localConfig.VITE_GEMINI_API_KEY
};

// Final check to ensure variables are present.
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL and Anon Key must be provided in env.ts or as environment variables.");
}
