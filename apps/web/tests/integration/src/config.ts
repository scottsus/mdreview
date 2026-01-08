import { config as loadEnv } from "dotenv";

// Load .env.local for local development
loadEnv({ path: ".env.local" });

export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || "http://localhost:3000";
}

export const config = {
  apiBaseUrl: getApiBaseUrl(),
};
