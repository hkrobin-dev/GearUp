import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  sendSuccess(res, 200, "All users fetched", users);
});

export const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new ApiError(404, "User not found.");
  if (user.role === "ADMIN") {
    throw new ApiError(400, "Cannot change status of an admin account.");
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  sendSuccess(res, 200, "User status updated", updated);
});

export const getAllGearAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50,
    );

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : undefined;

    const categoryId =
      typeof req.query.categoryId === "string"
        ? req.query.categoryId
        : undefined;

    const where = {
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                brand: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(status && ["ACTIVE", "INACTIVE"].includes(status)
        ? {
            status: status as "ACTIVE" | "INACTIVE",
          }
        : {}),

      ...(categoryId
        ? {
            categoryId,
          }
        : {}),
    };

    const [gear, total] = await prisma.$transaction([
      prisma.gearItem.findMany({
        where,
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.gearItem.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, 200, "All gear listings fetched", {
      data: gear,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  },
);

export const getAllRentalsAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50
    );

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : undefined;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const where = {
      ...(status &&
      [
        "PLACED",
        "CONFIRMED",
        "CANCELLED",
        "PAID",
        "PICKED_UP",
        "RETURNED",
      ].includes(status)
        ? {
            status: status as
              | "PLACED"
              | "CONFIRMED"
              | "CANCELLED"
              | "PAID"
              | "PICKED_UP"
              | "RETURNED",
          }
        : {}),

      ...(search
        ? {
            customer: {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          }
        : {}),
    };

    const [rentals, total] = await prisma.$transaction([
      prisma.rentalOrder.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              gearItem: true,
            },
          },
          payments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.rentalOrder.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, 200, "All rental orders fetched", {
      data: rentals,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }
);

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) throw new ApiError(409, "Category with this name already exists.");

  const category = await prisma.category.create({ data: { name, description } });

  sendSuccess(res, 201, "Category created successfully", category);
});
