import { Request } from "express";
import { JwtPayload } from "./jwt";
import ApiError from "./ApiError";

export const getAuthUser = (req: Request): JwtPayload => {
  const user = req.user as unknown as JwtPayload | undefined;

  if (!user) {
    throw new ApiError(401, "Authentication required.");
  }

  return user;
};