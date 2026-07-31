import { Router } from "express";
import { createReview } from "../controllers/review.controller";
import { authenticate, authorize } from "../middleware/auth";
import validate from "../middleware/validate";
import { createReviewSchema } from "../validations/review.validation";
import { getReviews } from "../controllers/review.controller";

const router = Router();

router.get("/", getReviews);

router.post(
  "/",
  authenticate,
  authorize("CUSTOMER"),
  validate(createReviewSchema),
  createReview
);

export default router;
