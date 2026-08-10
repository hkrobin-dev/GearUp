import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { stripeWebhook } from "./controllers/payment.controller";
import { env } from "./config/env";
import passport from "./config/passport";
import contactRoutes from "./routes/contact.route";


const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

app.use(passport.initialize());
// Stripe webhook MUST receive the raw body (not JSON-parsed) for signature
// verification, so this is registered before express.json() below.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "GearUp API is running 🏋️",
    data: { docs: "/api-docs (see README for Postman collection)" },
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "OK", data: { uptime: process.uptime() } });
});
app.use("/api/contact", contactRoutes);


app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
