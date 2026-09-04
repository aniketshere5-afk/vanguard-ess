import { describe, expect, it } from "vitest";
import { buildLoginUrl } from "./const";

describe("OAuth login URL", () => {
  it("uses the managed app-auth endpoint and provider parameter names", () => {
    const url = new URL(
      buildLoginUrl({
        oauthPortalUrl: "https://login.example.test/",
        appId: "app-123",
        redirectUri: "https://console.example.test/api/oauth/callback",
        state: "encoded-state",
      })
    );

    expect(url.pathname).toBe("/app-auth");
    expect(url.searchParams.get("appId")).toBe("app-123");
    expect(url.searchParams.get("redirectUri")).toBe(
      "https://console.example.test/api/oauth/callback"
    );
    expect(url.searchParams.get("state")).toBe("encoded-state");
    expect(url.searchParams.get("type")).toBe("signIn");
    expect(url.searchParams.has("app_id")).toBe(false);
    expect(url.searchParams.has("redirect_url")).toBe(false);
  });

  it("rejects an incomplete authorization payload before navigation", () => {
    expect(() =>
      buildLoginUrl({
        oauthPortalUrl: "",
        appId: "app-123",
        redirectUri: "https://console.example.test/api/oauth/callback",
        state: "encoded-state",
      })
    ).toThrow("OAuth portal URL is not configured");
  });
});
