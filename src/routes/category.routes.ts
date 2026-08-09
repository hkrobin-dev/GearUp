import { Router } from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";

const router = Router();

// Create category
router.post("/", createCategory);

// Get all categories
router.get("/", getCategories);

// Get single category
router.get("/:id", getCategoryById);

// Update category
router.patch("/:id", updateCategory);

// Delete category
router.delete("/:id", deleteCategory);

export default router;