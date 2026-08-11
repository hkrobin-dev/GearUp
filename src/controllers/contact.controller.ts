import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import { sendSuccess } from "../utils/ApiResponse";

export const createContactMessage = catchAsync(
  async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body;

    const contactMessage = await prisma.contactMessage.create({
      data: { name, email, subject, message },
    });

    sendSuccess(
      res,
      201,
      "Your message has been sent successfully.",
      contactMessage
    );
  }
);