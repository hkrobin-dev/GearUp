import { Router } from "express";
import authRoutes from "./auth.routes";
import gearRoutes from "./gear.routes";
import providerRoutes from "./provider.routes";
import rentalRoutes from "./rental.routes";
import paymentRoutes from "./payment.routes";
import reviewRoutes from "./review.routes";
import adminRoutes from "./admin.routes";
import categoryRoutes from "./category.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/", gearRoutes);
router.use("/categories", categoryRoutes);
router.use("/provider", providerRoutes);
router.use("/rentals", rentalRoutes);
router.use("/payments", paymentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/admin", adminRoutes);

export default router;