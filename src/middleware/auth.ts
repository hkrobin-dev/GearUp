import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { prisma } from "../config/prisma";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        401,
        "Authentication required. No token provided."
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new ApiError(
        401,
        "Authentication required. No token provided."
      );
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!user) {
      throw new ApiError(
        401,
        "User belonging to this token no longer exists."
      );
    }

    if (user.status === "SUSPENDED") {
      throw new ApiError(
        403,
        "Your account has been suspended. Contact support."
      );
    }

    // Attach JWT user to request
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    } as unknown as Express.User;

    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return next(err);
    }

    next(new ApiError(401, "Invalid or expired token."));
  }
};

export const authorize = (
  ...roles: Array<"CUSTOMER" | "PROVIDER" | "ADMIN">
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new ApiError(401, "Authentication required.")
      );
    }

    const authUser = req.user as unknown as JwtPayload;

    if (!roles.includes(authUser.role)) {
      return next(
        new ApiError(
          403,
          "You do not have permission to perform this action."
        )
      );
    }

    next();
  };
};