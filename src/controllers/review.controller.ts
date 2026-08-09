import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";
import { signToken } from "../utils/jwt";
import { env } from "../config/env";

// POST /api/reviews - only allowed after a RETURNED rental containing this gear item
export const createReview = catchAsync(async (req: Request, res: Response) => {
  const { gearItemId, rating, comment } = req.body;

  const hasReturnedRental = await prisma.rentalOrder.findFirst({
    where: {
      customerId: req.user!.id,
      status: "RETURNED",
      items: { some: { gearItemId } },
    },
  });

  if (!hasReturnedRental) {
    throw new ApiError(
      400,
      "You can only review gear after completing (returning) a rental for it."
    );
  }

  const existingReview = await prisma.review.findFirst({
    where: { customerId: req.user!.id, gearItemId },
  });
  if (existingReview) {
    throw new ApiError(409, "You have already reviewed this gear item.");
  }

  const review = await prisma.review.create({
    data: { customerId: req.user!.id, gearItemId, rating, comment },
  });

  sendSuccess(res, 201, "Review submitted successfully", review);
});
export const getReviews = catchAsync(async (req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({
    include: {
      customer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
  });

  sendSuccess(res, 200, "Reviews fetched successfully", reviews);
});

export const googleCallback = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, "Google authentication failed.");
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    res.redirect(
      `${env.CLIENT_URL}/auth/google-success?token=${encodeURIComponent(token)}`
    );
  }
);