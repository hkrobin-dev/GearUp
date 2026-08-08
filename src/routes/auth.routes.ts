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

// Step 1: User goes to this URL
// GET /api/auth/google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Step 2: Google redirects here
// GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect:
      "http://localhost:3000/auth/login?error=google",
  }),
  googleCallback
);

export default router;