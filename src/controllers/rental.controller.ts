import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "../utils/auth-user";

// POST /api/rentals
export const createRental = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate, items } = req.body as {
    startDate: Date;
    endDate: Date;
    items: {
      gearItemId: string;
      quantity: number;
    }[];
  };

  const authUser = getAuthUser(req);

  const rentalDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (rentalDays <= 0) {
    throw new ApiError(
      400,
      "End date must be after start date."
    );
  }

  const gearIds = items.map((i) => i.gearItemId);

  const gearItems = await prisma.gearItem.findMany({
    where: {
      id: {
        in: gearIds,
      },
    },
  });

  if (gearItems.length !== gearIds.length) {
    throw new ApiError(
      404,
      "One or more gear items were not found."
    );
  }

  for (const requested of items) {
    const gear = gearItems.find(
      (g) => g.id === requested.gearItemId
    )!;

    if (gear.status !== "ACTIVE") {
      throw new ApiError(
        400,
        `Gear item "${gear.name}" is not currently available.`
      );
    }

    if (gear.availableStock < requested.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for "${gear.name}". Available: ${gear.availableStock}`
      );
    }
  }

  const orderItemsData = items.map((requested) => {
    const gear = gearItems.find(
      (g) => g.id === requested.gearItemId
    )!;

    const subtotal =
      Number(gear.pricePerDay) *
      requested.quantity *
      rentalDays;

    return {
      gearItemId: gear.id,
      quantity: requested.quantity,
      pricePerDay: gear.pricePerDay,
      subtotal: new Prisma.Decimal(subtotal),
    };
  });

  const totalAmount = orderItemsData.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.rentalOrder.create({
      data: {
        customerId: authUser.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalAmount: new Prisma.Decimal(totalAmount),
        status: "PLACED",

        items: {
          create: orderItemsData,
        },
      },

      include: {
        items: {
          include: {
            gearItem: true,
          },
        },
      },
    });

    // Reserve stock immediately on order placement
    for (const item of orderItemsData) {
      await tx.gearItem.update({
        where: {
          id: item.gearItemId,
        },

        data: {
          availableStock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return created;
  });

  sendSuccess(
    res,
    201,
    "Rental order created successfully",
    order
  );
});

// GET /api/rentals
// Current user's rentals or all rentals if admin
export const getMyRentals = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);

    const where =
      authUser.role === "ADMIN"
        ? {}
        : {
            customerId: authUser.id,
          };

    const rentals = await prisma.rentalOrder.findMany({
      where,

      include: {
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

    sendSuccess(
      res,
      200,
      "Rental orders fetched",
      rentals
    );
  }
);

// GET /api/rentals/:id
export const getRentalById = catchAsync(
  async (req: Request, res: Response) => {
    const authUser = getAuthUser(req);

    const rental = await prisma.rentalOrder.findUnique({
      where: {
        id: req.params.id,
      },

      include: {
        items: {
          include: {
            gearItem: true,
          },
        },

        payments: true,

        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!rental) {
      throw new ApiError(
        404,
        "Rental order not found."
      );
    }

    const isOwner =
      rental.customerId === authUser.id;

    const isAdmin =
      authUser.role === "ADMIN";

    const isProviderOfItem = rental.items.some(
      (item) =>
        item.gearItem.providerId === authUser.id
    );

    if (
      !isOwner &&
      !isAdmin &&
      !isProviderOfItem
    ) {
      throw new ApiError(
        403,
        "You do not have access to this rental order."
      );
    }

    sendSuccess(
      res,
      200,
      "Rental order fetched",
      rental
    );
  }
);