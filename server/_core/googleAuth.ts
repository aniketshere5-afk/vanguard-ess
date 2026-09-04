import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

const STATE_COOKIE = "vanguard-google-state";
const SCOPES = "openid email profile";

function getFrontendUrl() {
  return (ENV.frontendUrl || "http://localhost:3000").replace(/\/+$/, "");
}

function getCallbackUrl(req: Request) {
  // APP_URL/FRONTEND_URL is the browser-facing URL. In production the Vercel
  // /api rewrite proxies this callback to Railway, so Google must be pointed
  // at the Vercel URL rather than the Railway origin.
  const base = getFrontendUrl();
  if (base) return `${base}/api/auth/google/callback`;
  return `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
}

function requireGoogleConfig() {
  if (!ENV.googleClientId || !ENV.googleClientSecret || !ENV.frontendUrl) {
    throw new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and FRONTEND_URL.");
  }
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    try {
      requireGoogleConfig();
      const state = crypto.randomBytes(32).toString("hex");
      const callback = getCallbackUrl(req);
      const params = new URLSearchParams({
        client_id: ENV.googleClientId,
        redirect_uri: callback,
        response_type: "code",
        scope: SCOPES,
        state,
        access_type: "online",
        prompt: "select_account",
      });
      res.cookie(STATE_COOKIE, state, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60 * 1000,
      });
      res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (error) {
      console.error("[Google OAuth] Start failed", error);
      res.status(500).json({ error: "Google OAuth is not configured" });
    }
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const error = typeof req.query.error === "string" ? req.query.error : undefined;
    const expectedState = req.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith(`${STATE_COOKIE}=`))?.slice(STATE_COOKIE.length + 1);

    if (error) {
      res.redirect(`${getFrontendUrl()}/?error=google_${encodeURIComponent(error)}`);
      return;
    }
    if (!code || !state || !expectedState || state !== expectedState) {
      res.status(403).json({ error: "Invalid Google OAuth state" });
      return;
    }

    res.clearCookie(STATE_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });

    try {
      requireGoogleConfig();
      const redirectUri = getCallbackUrl(req);
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenResponse.json() as { access_token?: string; error?: string };
      if (!tokenResponse.ok || !tokens.access_token) {
        console.error("[Google OAuth] Token exchange failed", tokens);
        res.status(502).json({ error: "Google token exchange failed" });
        return;
      }

      const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await userResponse.json() as {
        sub?: string;
        name?: string;
        email?: string;
        email_verified?: boolean;
      };
      if (!userResponse.ok || !profile.sub || !profile.email) {
        console.error("[Google OAuth] User info failed", profile);
        res.status(502).json({ error: "Google user information unavailable" });
        return;
      }

      const role = ENV.googleAdminEmail && profile.email.toLowerCase() === ENV.googleAdminEmail.toLowerCase()
        ? "admin" as const
        : "user" as const;

      await db.upsertUser({
        openId: `google:${profile.sub}`,
        name: profile.name || profile.email,
        email: profile.email,
        loginMethod: "google",
        role,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(`google:${profile.sub}`, {
        name: profile.name || profile.email,
        expiresInMs: ONE_YEAR_MS,
      });

      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(`${getFrontendUrl()}/`);
    } catch (err) {
      console.error("[Google OAuth] Callback failed", err);
      res.status(500).json({ error: "Google sign-in failed" });
    }
  });
}
