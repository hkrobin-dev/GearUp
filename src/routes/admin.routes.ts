import { Router } from "express";
import {
  getAllUsers,
  updateUserStatus,
  getAllGearAdmin,
  getAllRentalsAdmin,
  createCategory,
} from "../controllers/admin.controller";
import validate from "../middleware/validate";
import { updateUserStatusSchema } from "../validations/admin.validation";
import { createCategorySchema } from "../validations/gear.validation";

const router = Router();

router.get("/users", getAllUsers);

router.patch(
  "/users/:id",
  validate(updateUserStatusSchema),
  updateUserStatus
);

router.get("/gear", getAllGearAdmin);

router.get("/rentals", getAllRentalsAdmin);

router.post(
  "/categories",
  validate(createCategorySchema),
  createCategory
);

export default router;