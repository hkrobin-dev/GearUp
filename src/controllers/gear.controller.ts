import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";
import { Prisma } from "@prisma/client";

// GET /api/gear
//
// Supported query parameters:
// ?category=
// ?brand=
// ?minPrice=
// ?maxPrice=
// ?search=
// ?sort=
// ?page=
// ?limit=

export const getAllGear = catchAsync(
  async (req: Request, res: Response) => {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sort,
      page = "1",
      limit = "10",
    } = req.query;

    // -----------------------------------------
    // Pagination
    // -----------------------------------------

    const pageNum = Math.max(
      1,
      parseInt(page as string) || 1,
    );

    const limitNum = Math.min(
      50,
      Math.max(
        1,
        parseInt(limit as string) || 10,
      ),
    );

    // -----------------------------------------
    // Filters
    // -----------------------------------------

    const where: Prisma.GearItemWhereInput = {
      // Only active gear will be shown publicly
      status: "ACTIVE",

      // Category filter
      ...(category && {
        categoryId: category as string,
      }),

      // Brand filter
      ...(brand && {
        brand: {
          equals: brand as string,
          mode: "insensitive",
        },
      }),

      // Search filter
      ...(search && {
        OR: [
          {
            name: {
              contains: search as string,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        ],
      }),

      // Price filter
      ...((minPrice || maxPrice) && {
        pricePerDay: {
          ...(minPrice && {
            gte: parseFloat(minPrice as string),
          }),

          ...(maxPrice && {
            lte: parseFloat(maxPrice as string),
          }),
        },
      }),
    };

    // -----------------------------------------
    // Sorting
    // -----------------------------------------

    let orderBy: Prisma.GearItemOrderByWithRelationInput = {
      createdAt: "desc",
    };

    switch (sort) {
      // Price: Low → High
      case "price_asc":
        orderBy = {
          pricePerDay: "asc",
        };
        break;

      // Price: High → Low
      case "price_desc":
        orderBy = {
          pricePerDay: "desc",
        };
        break;

      // Name: A → Z
      case "name_asc":
        orderBy = {
          name: "asc",
        };
        break;

      // Name: Z → A
      case "name_desc":
        orderBy = {
          name: "desc",
        };
        break;

      // Default: Newest first
      default:
        orderBy = {
          createdAt: "desc",
        };
        break;
    }

    // -----------------------------------------
    // Get Gear + Total Count
    // -----------------------------------------

    const [gear, total] = await Promise.all([
      prisma.gearItem.findMany({
        where,

        include: {
          category: true,

          provider: {
            select: {
              id: true,
              name: true,
            },
          },
        },

        skip: (pageNum - 1) * limitNum,

        take: limitNum,

        orderBy,
      }),

      prisma.gearItem.count({
        where,
      }),
    ]);

    // -----------------------------------------
    // Response
    // -----------------------------------------

    sendSuccess(
      res,
      200,
      "Gear fetched successfully",
      {
        gear,

        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(
            total / limitNum,
          ),
        },
      },
    );
  },
);

// -----------------------------------------
// Get Gear By ID
// -----------------------------------------

export const getGearById = catchAsync(
  async (req: Request, res: Response) => {
    const gear = await prisma.gearItem.findUnique({
      where: {
        id: req.params.id,
      },

      include: {
        category: true,

        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        reviews: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!gear) {
      throw new ApiError(
        404,
        "Gear item not found.",
      );
    }

    sendSuccess(
      res,
      200,
      "Gear details fetched",
      gear,
    );
  },
);

// -----------------------------------------
// Get All Categories
// -----------------------------------------

export const getAllCategories = catchAsync(
  async (req: Request, res: Response) => {
    const categories =
      await prisma.category.findMany({
        orderBy: {
          name: "asc",
        },

        include: {
          _count: {
            select: {
              gearItems: true,
            },
          },
        },
      });

    sendSuccess(
      res,
      200,
      "Categories fetched successfully",
      categories,
    );
  },
);