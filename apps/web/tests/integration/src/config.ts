import { config as loadEnv } from "dotenv";

// Load .env then .env.local (local overrides)
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || "http://localhost:3000";
}

export const config = {
  apiBaseUrl: getApiBaseUrl(),
};
