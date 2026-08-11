import { z } from "zod";

export const updateUserStatusSchema = z.object({
  body: z.object({
    status: z.enum(["ACTIVE", "SUSPENDED"], {
      errorMap: () => ({ message: "Status must be ACTIVE or SUSPENDED" }),
    }),
  }),
  params: z.object({
    id: z.string().uuid("Invalid user ID"),
  }),
});
export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid category ID"),
  }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid category ID"),
  }),
});