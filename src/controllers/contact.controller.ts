import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";

export const createContactMessage = catchAsync(
  async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      throw new ApiError(
        400,
        "Name, email, subject and message are required."
      );
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      throw new ApiError(
        400,
        "Name must be at least 2 characters."
      );
    }

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new ApiError(400, "Please provide a valid email.");
    }

    if (typeof subject !== "string" || subject.trim().length < 3) {
      throw new ApiError(
        400,
        "Subject must be at least 3 characters."
      );
    }

    if (typeof message !== "string" || message.trim().length < 10) {
      throw new ApiError(
        400,
        "Message must be at least 10 characters."
      );
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    sendSuccess(
      res,
      201,
      "Your message has been sent successfully.",
      contactMessage
    );
  }
);