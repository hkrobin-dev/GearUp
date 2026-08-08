import { Router } from "express";
import passport from "../config/passport";

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

// প্রোডাকশন ও লোকাল এনভায়রনমেন্ট ডাইনামিক রাখার জন্য
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ========================================
// Email / Password Authentication
// ========================================

router.post(
  "/register",
  validate(registerSchema),
  register
);

router.post(
  "/login",
  validate(loginSchema),
  login
);

router.get(
  "/me",
  authenticate,
  getMe
);

// ========================================
// Google OAuth
// ========================================

// Step 1: Initiates Google Login
// GET /api/auth/google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Step 2: Google Redirects here
// GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/auth/login?error=google`,
  }),
  googleCallback
);

// auth.routes.ts
router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working!" });
});
export default router;