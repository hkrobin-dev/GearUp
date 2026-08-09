import { Router } from "express";
import {
  createReview,
  getReviews,
} from "../controllers/review.controller";
import validate from "../middleware/validate";
import { createReviewSchema } from "../validations/review.validation";

const router = Router();

// GET /api/reviews
router.get("/", getReviews);

// POST /api/reviews
router.post(
  "/",
  validate(createReviewSchema),
  createReview
);

export default router;