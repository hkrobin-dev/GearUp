import { Router } from "express";
import passport from "../config/passport";
import { env } from "../config/env";

import {
  register,
  login,
  getMe,
  googleCallback,
} from "../controllers/auth.controller";

import validate from "../middleware/validate";

import {
  registerSchema,
  loginSchema,
} from "../validations/auth.validation";

import { authenticate } from "../middleware/auth";

const router = Router();

const FRONTEND_URL = env.CLIENT_URL;

// ========================================
// Email / Password Authentication
// ========================================

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, getMe);

// ========================================
// Google OAuth
// ========================================

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/auth/login?error=google`,
  }),
  googleCallback
);

router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working!" });
});

export default router;