import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";

// ============================================================
// CREATE CATEGORY
// POST /api/categories
// ============================================================
export const createCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { name, description } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new ApiError(
        409,
        "A category with this name already exists."
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
      },
    });

    sendSuccess(
      res,
      201,
      "Category created successfully",
      category
    );
  }
);

// ============================================================
// GET ALL CATEGORIES
// GET /api/categories
// ============================================================
export const getCategories = catchAsync(
  async (req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            gearItems: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    sendSuccess(
      res,
      200,
      "Categories fetched successfully",
      categories
    );
  }
);

// ============================================================
// GET SINGLE CATEGORY
// GET /api/categories/:id
// ============================================================
export const getCategoryById = catchAsync(
  async (req: Request, res: Response) => {
    const category = await prisma.category.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        gearItems: true,
      },
    });

    if (!category) {
      throw new ApiError(
        404,
        "Category not found."
      );
    }

    sendSuccess(
      res,
      200,
      "Category fetched successfully",
      category
    );
  }
);

// ============================================================
// UPDATE CATEGORY
// PATCH /api/categories/:id
// ============================================================
export const updateCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { name, description } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existingCategory) {
      throw new ApiError(
        404,
        "Category not found."
      );
    }

    if (name && name !== existingCategory.name) {
      const duplicateCategory =
        await prisma.category.findUnique({
          where: { name },
        });

      if (duplicateCategory) {
        throw new ApiError(
          409,
          "A category with this name already exists."
        );
      }
    }

    const category = await prisma.category.update({
      where: {
        id: req.params.id,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && {
          description,
        }),
      },
    });

    sendSuccess(
      res,
      200,
      "Category updated successfully",
      category
    );
  }
);

// ============================================================
// DELETE CATEGORY
// DELETE /api/categories/:id
// ============================================================
export const deleteCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await prisma.category.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        _count: {
          select: {
            gearItems: true,
          },
        },
      },
    });

    if (!category) {
      throw new ApiError(
        404,
        "Category not found."
      );
    }

    if (category._count.gearItems > 0) {
      throw new ApiError(
        400,
        "Cannot delete a category that contains gear items."
      );
    }

    await prisma.category.delete({
      where: {
        id: req.params.id,
      },
    });

    sendSuccess(
      res,
      200,
      "Category deleted successfully",
      null
    );
  }
);