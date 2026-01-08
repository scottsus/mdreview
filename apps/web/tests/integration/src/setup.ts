import { config } from "./config.js";

export default function globalSetup() {
  console.log("MDReview Integration Test Configuration:");
  console.log(`  API Base URL: ${config.apiBaseUrl}`);
  console.log("");
}
