import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const ROLES = ["scientist", "qa", "admin", "user"] as const;
type DevRole = (typeof ROLES)[number];

/**
 * Local-development sign-in. Mints a real session for a chosen role without
 * Google OAuth, so import / QA-decision / admin-configuration flows can be
 * exercised on a local machine. Never registered when NODE_ENV=production.
 *
 *   GET /api/auth/dev?role=scientist
 */
export function registerDevAuthRoutes(app: Express) {
  // Fail closed: only ever enabled when NODE_ENV is explicitly "development".
  // An unset NODE_ENV in a deployed environment must NOT expose this route.
  if (process.env.NODE_ENV !== "development") return;

  app.get("/api/auth/dev", async (req: Request, res: Response) => {
    const role: DevRole = ROLES.includes(req.query.role as DevRole) ? (req.query.role as DevRole) : "scientist";
    const openId = `dev:${role}`;
    const name = `Dev ${role[0].toUpperCase()}${role.slice(1)}`;

    await db.upsertUser({ openId, name, email: `${role}@dev.local`, loginMethod: "dev", role, lastSignedIn: new Date() });
    const token = await sdk.createSessionToken(openId, { name, expiresInMs: ONE_YEAR_MS });
    res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
    res.redirect("/");
  });

  console.log("[DevAuth] Enabled — /api/auth/dev?role=scientist|qa|admin (development only)");
}
