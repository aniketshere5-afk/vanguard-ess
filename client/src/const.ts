export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const isDemoPreview = () => {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("preview") === "demo" || sessionStorage.getItem("vanguard-demo-preview") === "1";
  } catch {
    return new URLSearchParams(window.location.search).get("preview") === "demo";
  }
};

export type DemoRole = "admin" | "scientist" | "qa";

export const getDemoRole = (): DemoRole => {
  if (typeof window === "undefined") return "admin";
  try {
    const value = sessionStorage.getItem("vanguard-demo-role");
    return value === "scientist" || value === "qa" ? value : "admin";
  } catch {
    return "admin";
  }
};

export const setDemoRole = (role: DemoRole) => {
  try { sessionStorage.setItem("vanguard-demo-role", role); } catch {}
};

/** Start the first-party Google OAuth flow through the backend. */
export const startLogin = (): boolean => {
  if (typeof window === "undefined") return false;
  window.location.href = "/api/auth/google";
  return true;
};
