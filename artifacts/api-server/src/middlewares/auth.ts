import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type AuthSession } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthSession;
    }
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.auth = session;
  next();
};
