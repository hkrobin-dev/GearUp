import { Router } from "express";
import {
  getAllUsers,
  updateUserStatus,
  getAllGearAdmin,
  getAllRentalsAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/admin.controller";
import validate from "../middleware/validate";
import { updateUserStatusSchema, updateCategorySchema, categoryIdParamSchema } from "../validations/admin.validation";
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

router.post("/categories", validate(createCategorySchema), createCategory);
router.patch("/categories/:id", validate(updateCategorySchema), updateCategory);
router.delete("/categories/:id", validate(categoryIdParamSchema), deleteCategory);

export default router;