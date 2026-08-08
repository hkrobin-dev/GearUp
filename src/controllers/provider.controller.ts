import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";
import { getAuthUser } from "../utils/auth-user";

// ============================================================
// ADD GEAR
// ============================================================
export const addGear = catchAsync(async (req: Request, res: Response) => {
  const {
    name,
    description,
    brand,
    pricePerDay,
    images,
    stock,
    specifications,
    categoryId,
  } = req.body;

  const authUser = getAuthUser(req);

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Category not found.");
  }

  const gear = await prisma.gearItem.create({
    data: {
      name,
      description,
      brand,
      pricePerDay,
      images,
      stock,
      availableStock: stock,
      specifications,
      categoryId,
      providerId: authUser.id,
    },
  });

  sendSuccess(res, 201, "Gear added to inventory", gear);
});

// ============================================================
// OWNERSHIP CHECK
// ============================================================
const assertOwnership = async (
  gearId: string,
  providerId: string
) => {
  const gear = await prisma.gearItem.findUnique({
    where: { id: gearId },
  });

  if (!gear) {
    throw new ApiError(404, "Gear item not found.");
  }

  if (gear.providerId !== providerId) {
    throw new ApiError(403, "You do not own this gear item.");
  }

  return gear;
};

// ============================================================
// UPDATE GEAR
// ============================================================
export const updateGear = catchAsync(async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);

  await assertOwnership(req.params.id, authUser.id);

  const data = { ...req.body };

  // Keep availableStock in sync when stock is changed
  if (data.stock !== undefined) {
    const current = await prisma.gearItem.findUnique({
      where: { id: req.params.id },
    });

    const diff = data.stock - (current?.stock ?? 0);

    data.availableStock = Math.max(
      0,
      (current?.availableStock ?? 0) + diff
    );
  }

  const gear = await prisma.gearItem.update({
    where: { id: req.params.id },
    data,
  });

  sendSuccess(res, 200, "Gear updated successfully", gear);
});

// ============================================================
// DELETE GEAR
// ============================================================
export const deleteGear = catchAsync(async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);

  await assertOwnership(req.params.id, authUser.id);

  await prisma.gearItem.delete({
    where: { id: req.params.id },
  });

  sendSuccess(res, 200, "Gear removed from inventory", null);
});

// ============================================================
// GET PROVIDER GEAR
// ============================================================
export const getProviderGear = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);

    const gear = await prisma.gearItem.findMany({
      where: {
        providerId: authUser.id,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    sendSuccess(res, 200, "Provider gear fetched", gear);
  }
);

// ============================================================
// GET PROVIDER ORDERS
// ============================================================
// Orders that contain at least one of this provider's gear items
export const getProviderOrders = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);

    const orders = await prisma.rentalOrder.findMany({
      where: {
        items: {
          some: {
            gearItem: {
              providerId: authUser.id,
            },
          },
        },
      },
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
    });

    sendSuccess(res, 200, "Provider orders fetched", orders);
  }
);

// ============================================================
// UPDATE PROVIDER ORDER STATUS
// ============================================================
// PATCH /api/provider/orders/:id
//
// Provider can:
// PLACED      -> CONFIRMED / CANCELLED
// PAID        -> PICKED_UP
// PICKED_UP   -> RETURNED
// ============================================================
export const updateOrderStatus = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);

    const { status } = req.body;

    const order = await prisma.rentalOrder.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        items: {
          include: {
            gearItem: true,
          },
        },
      },
    });

    if (!order) {
      throw new ApiError(404, "Rental order not found.");
    }

    // Check whether this provider owns at least one gear item
    // inside this order.
    const ownsOrder = order.items.some(
      (item) => item.gearItem.providerId === authUser.id
    );

    if (!ownsOrder) {
      throw new ApiError(
        403,
        "You do not have gear items in this order."
      );
    }

    const validTransitions: Record<string, string[]> = {
      PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["CANCELLED"],
      PAID: ["PICKED_UP"],
      PICKED_UP: ["RETURNED"],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new ApiError(
        400,
        `Cannot transition order from ${order.status} to ${status}.`
      );
    }

    // ========================================================
    // RESTOCK GEAR WHEN RETURNED
    // ========================================================
    if (status === "RETURNED") {
      await prisma.$transaction(
        order.items.map((item) =>
          prisma.gearItem.update({
            where: {
              id: item.gearItemId,
            },
            data: {
              availableStock: {
                increment: item.quantity,
              },
            },
          })
        )
      );
    }

    // ========================================================
    // RELEASE STOCK WHEN CANCELLED
    // ========================================================
    if (status === "CANCELLED") {
      await prisma.$transaction(
        order.items.map((item) =>
          prisma.gearItem.update({
            where: {
              id: item.gearItemId,
            },
            data: {
              availableStock: {
                increment: item.quantity,
              },
            },
          })
        )
      );
    }

    // ========================================================
    // UPDATE ORDER STATUS
    // ========================================================
    const updated = await prisma.rentalOrder.update({
      where: {
        id: req.params.id,
      },
      data: {
        status,
      },
      include: {
        items: {
          include: {
            gearItem: true,
          },
        },
      },
    });

    sendSuccess(
      res,
      200,
      "Order status updated",
      updated
    );
  }
);