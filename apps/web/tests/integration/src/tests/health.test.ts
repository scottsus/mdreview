import { describe, expect, it } from "vitest";

import { config } from "../config.js";

describe("API Health Check", () => {
  it("should verify the API is reachable", async () => {
    // Test by hitting the main API endpoint
    const response = await fetch(`${config.apiBaseUrl}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "# Health Check" }),
    });

    // 201 Created means the API is working
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("slug");
  });
});
