import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import { sendSuccess } from "../utils/ApiResponse";
import { signToken } from "../utils/jwt";
import { env } from "../config/env";

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, phone, role } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, phone, role },
    select: userPublicSelect,
  });

  const token = signToken({ id: user.id, role: user.role, email: user.email });

  sendSuccess(res, 201, "Registration successful", { user, token });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (user.status === "SUSPENDED") {
    throw new ApiError(403, "Your account has been suspended. Contact support.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = signToken({ id: user.id, role: user.role, email: user.email });

  const { password: _pw, ...safeUser } = user;

  sendSuccess(res, 200, "Login successful", { user: safeUser, token });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const authUser = req.user as {
    id: string;
  };

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: userPublicSelect,
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  sendSuccess(res, 200, "Current user fetched", user);
});

export const googleCallback = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as {
      id: string;
      role: "CUSTOMER" | "PROVIDER" | "ADMIN";
      email: string;
    };

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