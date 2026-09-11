export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Start the first-party Google OAuth flow through the backend. */
export const startLogin = (): boolean => {
  if (typeof window === "undefined") return false;
  window.location.href = "/api/auth/google";
  return true;
};
